import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUDIT_PUBLISHER, AuditPublisher, createAuditEvent } from '@idp/common';
import { Repository } from '../../domain/entities/repository.entity';
import { RepositoryStatus } from '../../domain/enums/repository-status.enum';
import { RepositoryVisibility } from '../../domain/enums/repository-visibility.enum';
import {
  RepositoryAlreadyExistsError,
  GitHubProvisioningError,
} from '../../domain/exceptions/domain-exceptions';
import {
  REPOSITORY_REPOSITORY,
  RepositoryRepository,
} from '../../domain/repositories/repository.repository.port';
import { GITHUB_CLIENT, GithubClient } from '../ports/github-client.port';
import { FileGeneratorService } from '../services/file-generator.service';

export interface ProvisionRepositoryCommand {
  serviceId: string;
  serviceName: string;
  serviceType: string;
  description: string;
  visibility: RepositoryVisibility;
  actorId: string;
  actorEmail: string;
  githubOwner: string;
  ipAddress: string | null;
}

@Injectable()
export class ProvisionRepositoryUseCase {
  private readonly logger = new Logger(ProvisionRepositoryUseCase.name);

  constructor(
    @Inject(REPOSITORY_REPOSITORY) private readonly repoRepository: RepositoryRepository,
    @Inject(GITHUB_CLIENT) private readonly githubClient: GithubClient,
    @Inject(AUDIT_PUBLISHER) private readonly auditPublisher: AuditPublisher,
    private readonly fileGenerator: FileGeneratorService,
  ) {}

  async execute(command: ProvisionRepositoryCommand): Promise<Repository> {
    // 1. Check for duplicate
    let record: Repository;
    const existing = await this.repoRepository.findByServiceId(command.serviceId);
    
    if (existing) {
      if (existing.status !== RepositoryStatus.FAILED) {
        throw new RepositoryAlreadyExistsError(command.serviceId);
      }
      // If it failed previously, reset it to PROVISIONING, update details with current configuration, and reuse the record
      record = await this.repoRepository.update(existing.id, {
        status: RepositoryStatus.PROVISIONING,
        githubOwner: command.githubOwner,
        githubRepo: command.serviceName,
        fullName: `${command.githubOwner}/${command.serviceName}`,
        htmlUrl: `https://github.com/${command.githubOwner}/${command.serviceName}`,
        cloneUrl: `https://github.com/${command.githubOwner}/${command.serviceName}.git`,
        sshUrl: `git@github.com:${command.githubOwner}/${command.serviceName}.git`,
        visibility: command.visibility,
        errorMessage: null,
      });
    } else {
      // 2. Create a PROVISIONING record immediately so the UI can show progress
      record = await this.repoRepository.create({
        serviceId: command.serviceId,
        serviceName: command.serviceName,
        serviceType: command.serviceType,
        githubOwner: command.githubOwner,
        githubRepo: command.serviceName,
        fullName: `${command.githubOwner}/${command.serviceName}`,
        defaultBranch: 'main',
        htmlUrl: `https://github.com/${command.githubOwner}/${command.serviceName}`,
        cloneUrl: `https://github.com/${command.githubOwner}/${command.serviceName}.git`,
        sshUrl: `git@github.com:${command.githubOwner}/${command.serviceName}.git`,
        visibility: command.visibility,
        status: RepositoryStatus.PROVISIONING,
        provisionedBy: command.actorId,
      });
    }

    try {
      // 3. Create GitHub repository
      this.logger.log(`Creating GitHub repository ${command.githubOwner}/${command.serviceName}`);
      const created = await this.githubClient.createRepository({
        owner: command.githubOwner,
        name: command.serviceName,
        description: command.description,
        visibility: command.visibility,
        defaultBranch: 'main',
      });

      // 4. Generate and commit all project files
      const files = this.fileGenerator.generate({
        serviceName: command.serviceName,
        serviceType: command.serviceType,
        description: command.description,
        owner: command.githubOwner,
        ownerEmail: command.actorEmail,
        repoFullName: created.fullName,
      });

      for (const file of files) {
        await this.githubClient.createOrUpdateFile({
          owner: command.githubOwner,
          repo: command.serviceName,
          path: file.path,
          message: `chore: add ${file.path} via IDP Platform`,
          content: Buffer.from(file.content).toString('base64'),
          branch: 'main',
        });
      }

      // 5. Configure branch protection on main
      await this.githubClient.configureBranchProtection({
        owner: command.githubOwner,
        repo: command.serviceName,
        branch: 'main',
        requiredReviewers: 1,
        requireStatusChecks: ['Lint, Test & Build', 'Build & Test'],
      });

      // 6. Mark as ACTIVE
      await this.repoRepository.updateStatus(record.id, RepositoryStatus.ACTIVE);

      await this.auditPublisher.publish(
        createAuditEvent({
          userId: command.actorId,
          action: 'REPOSITORY_PROVISION',
          resourceType: 'REPOSITORY',
          resourceId: record.id,
          result: 'SUCCESS',
          ipAddress: command.ipAddress,
          metadata: { githubRepo: created.fullName },
        }),
      );

      // Return updated record
      return (await this.repoRepository.findById(record.id))!;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Provisioning failed for ${command.serviceName}: ${message}`);
      await this.repoRepository.updateStatus(record.id, RepositoryStatus.FAILED, message);

      await this.auditPublisher.publish(
        createAuditEvent({
          userId: command.actorId,
          action: 'REPOSITORY_PROVISION',
          resourceType: 'REPOSITORY',
          resourceId: record.id,
          result: 'FAILURE',
          ipAddress: command.ipAddress,
          metadata: { error: message },
        }),
      );

      throw new GitHubProvisioningError(message);
    }
  }
}