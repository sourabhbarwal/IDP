import { ProvisionRepositoryUseCase } from './provision-repository.use-case';
import {
  RepositoryAlreadyExistsError,
  GitHubProvisioningError,
} from '../../domain/exceptions/domain-exceptions';
import { RepositoryStatus } from '../../domain/enums/repository-status.enum';
import { RepositoryVisibility } from '../../domain/enums/repository-visibility.enum';
import { Repository } from '../../domain/entities/repository.entity';
import { FileGeneratorService } from '../services/file-generator.service';
import { RepositoryRepository } from '../../domain/repositories/repository.repository.port';
import { GithubClient } from '../ports/github-client.port';
import { AuditPublisher } from '@idp/common';

const activeRepo = new Repository({
  id: 'r-1',
  serviceId: 's-1',
  serviceName: 'my-api',
  serviceType: 'NODEJS',
  githubOwner: 'org',
  githubRepo: 'my-api',
  fullName: 'org/my-api',
  defaultBranch: 'main',
  htmlUrl: 'https://github.com/org/my-api',
  cloneUrl: 'https://github.com/org/my-api.git',
  sshUrl: 'git@github.com:org/my-api.git',
  visibility: RepositoryVisibility.PRIVATE,
  status: RepositoryStatus.ACTIVE,
  provisionedBy: 'u-1',
  provisionedAt: new Date(),
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const mockRepoRepo: jest.Mocked<RepositoryRepository> = {
  existsByServiceId: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
  findByServiceId: jest.fn(),
  findAll: jest.fn(),
};

const mockGithubClient: jest.Mocked<GithubClient> = {
  createRepository: jest.fn(),
  createOrUpdateFile: jest.fn(),
  configureBranchProtection: jest.fn(),
};

const mockAudit: jest.Mocked<AuditPublisher> = {
  publish: jest.fn(),
};

const fileGenerator = new FileGeneratorService();

const command = {
  serviceId: 's-1',
  serviceName: 'my-api',
  serviceType: 'NODEJS',
  description: 'A test service',
  visibility: RepositoryVisibility.PRIVATE,
  actorId: 'u-1',
  actorEmail: 'dev@example.com',
  githubOwner: 'org',
  ipAddress: null,
};

describe('ProvisionRepositoryUseCase', () => {
  let useCase: ProvisionRepositoryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ProvisionRepositoryUseCase(
      mockRepoRepo,
      mockGithubClient,
      mockAudit,
      fileGenerator,
    );
  });

  it('provisions a repository and returns ACTIVE record', async () => {
    mockRepoRepo.existsByServiceId.mockResolvedValue(false);
    mockRepoRepo.create.mockResolvedValue(activeRepo);
    mockGithubClient.createRepository.mockResolvedValue({
      fullName: 'org/my-api',
      htmlUrl: 'https://github.com/org/my-api',
      cloneUrl: 'https://github.com/org/my-api.git',
      sshUrl: 'git@github.com:org/my-api.git',
      defaultBranch: 'main',
    });
    mockGithubClient.createOrUpdateFile.mockResolvedValue(undefined);
    mockGithubClient.configureBranchProtection.mockResolvedValue(undefined);
    mockRepoRepo.updateStatus.mockResolvedValue(undefined);
    mockRepoRepo.findById.mockResolvedValue(activeRepo);
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute(command);

    expect(mockGithubClient.createRepository).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'org', name: 'my-api' }),
    );
    expect(mockGithubClient.createOrUpdateFile).toHaveBeenCalled();
    expect(mockGithubClient.configureBranchProtection).toHaveBeenCalled();
    expect(mockRepoRepo.updateStatus).toHaveBeenCalledWith(
      activeRepo.id,
      RepositoryStatus.ACTIVE,
    );
    expect(result.id).toBe('r-1');
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REPOSITORY_PROVISION', result: 'SUCCESS' }),
    );
  });

  it('throws RepositoryAlreadyExistsError when serviceId already has a repo', async () => {
    mockRepoRepo.existsByServiceId.mockResolvedValue(true);
    await expect(useCase.execute(command)).rejects.toThrow(RepositoryAlreadyExistsError);
  });

  it('marks repository as FAILED when GitHub API throws and audits failure', async () => {
    mockRepoRepo.existsByServiceId.mockResolvedValue(false);
    mockRepoRepo.create.mockResolvedValue(activeRepo);
    mockGithubClient.createRepository.mockRejectedValue(new Error('GitHub API error'));
    mockRepoRepo.updateStatus.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(useCase.execute(command)).rejects.toThrow(GitHubProvisioningError);

    expect(mockRepoRepo.updateStatus).toHaveBeenCalledWith(
      activeRepo.id,
      RepositoryStatus.FAILED,
      expect.stringContaining('GitHub API error'),
    );
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REPOSITORY_PROVISION', result: 'FAILURE' }),
    );
  });
});