import { ProvisionRepositoryUseCase } from './provision-repository.use-case';
import { RepositoryAlreadyExistsError, GitHubProvisioningError } from '../../domain/exceptions/domain-exceptions';
import { RepositoryStatus } from '../../domain/enums/repository-status.enum';
import { RepositoryVisibility } from '../../domain/enums/repository-visibility.enum';
import { Repository } from '../../domain/entities/repository.entity';
import { FileGeneratorService } from '../services/file-generator.service';

const activeRepo = new Repository({
  id: 'r-1', serviceId: 's-1', serviceName: 'my-api', serviceType: 'NODEJS',
  githubOwner: 'org', githubRepo: 'my-api', fullName: 'org/my-api',
  defaultBranch: 'main', htmlUrl: 'https://github.com/org/my-api',
  cloneUrl: 'https://github.com/org/my-api.git', sshUrl: 'git@github.com:org/my-api.git',
  visibility: RepositoryVisibility.PRIVATE, status: RepositoryStatus.ACTIVE,
  provisionedBy: 'u-1', provisionedAt: new Date(), errorMessage: null,
  createdAt: new Date(), updatedAt: new Date(),
});

const mockRepoRepo = {
  existsByServiceId: jest.fn(), create: jest.fn(), findById: jest.fn(),
  updateStatus: jest.fn(), findByServiceId: jest.fn(), findAll: jest.fn(),
  update: jest.fn(),
};
const mockGithubClient = {
  createRepository: jest.fn(),
  createOrUpdateFile: jest.fn(),
  configureBranchProtection: jest.fn(),
};
const mockAudit = { publish: jest.fn() };
const fileGenerator = new FileGeneratorService();

const command = {
  serviceId: 's-1', serviceName: 'my-api', serviceType: 'NODEJS',
  description: 'A test service', visibility: RepositoryVisibility.PRIVATE,
  actorId: 'u-1', actorEmail: 'dev@example.com', githubOwner: 'org', ipAddress: null,
};

describe('ProvisionRepositoryUseCase', () => {
  let useCase: ProvisionRepositoryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ProvisionRepositoryUseCase(
      mockRepoRepo as any, mockGithubClient as any, mockAudit as any, fileGenerator,
    );
  });

  it('provisions a repository and returns ACTIVE record', async () => {
    mockRepoRepo.findByServiceId.mockResolvedValue(null);
    mockRepoRepo.create.mockResolvedValue(activeRepo);
    mockGithubClient.createRepository.mockResolvedValue({
      fullName: 'org/my-api', htmlUrl: 'https://github.com/org/my-api',
      cloneUrl: 'https://github.com/org/my-api.git', sshUrl: 'git@github.com:org/my-api.git',
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
      activeRepo.id, RepositoryStatus.ACTIVE,
    );
    expect(result.id).toBe('r-1');
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REPOSITORY_PROVISION', result: 'SUCCESS' }),
    );
  });

  it('throws RepositoryAlreadyExistsError when serviceId already has an active repo', async () => {
    mockRepoRepo.findByServiceId.mockResolvedValue(activeRepo);
    await expect(useCase.execute(command)).rejects.toThrow(RepositoryAlreadyExistsError);
  });

  it('marks repository as FAILED when GitHub API throws and audits failure', async () => {
    mockRepoRepo.findByServiceId.mockResolvedValue(null);
    mockRepoRepo.create.mockResolvedValue(activeRepo);
    mockGithubClient.createRepository.mockRejectedValue(new Error('GitHub API error'));
    mockRepoRepo.updateStatus.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(useCase.execute(command)).rejects.toThrow(GitHubProvisioningError);

    expect(mockRepoRepo.updateStatus).toHaveBeenCalledWith(
      activeRepo.id, RepositoryStatus.FAILED, expect.stringContaining('GitHub API error'),
    );
    expect(mockAudit.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REPOSITORY_PROVISION', result: 'FAILURE' }),
    );
  });

  it('handles non-Error exceptions gracefully when provisioning fails', async () => {
    mockRepoRepo.findByServiceId.mockResolvedValue(null);
    mockRepoRepo.create.mockResolvedValue(activeRepo);
    mockGithubClient.createRepository.mockRejectedValue('String error message');
    mockRepoRepo.updateStatus.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    await expect(useCase.execute(command)).rejects.toThrow(GitHubProvisioningError);

    expect(mockRepoRepo.updateStatus).toHaveBeenCalledWith(
      activeRepo.id, RepositoryStatus.FAILED, 'String error message',
    );
  });

  it('allows retrying provisioning if previous attempt failed', async () => {
    const failedRepo = new Repository({ ...activeRepo, status: RepositoryStatus.FAILED, errorMessage: 'GitHub error' });
    mockRepoRepo.findByServiceId.mockResolvedValue(failedRepo);
    mockRepoRepo.update.mockResolvedValue(activeRepo);
    mockGithubClient.createRepository.mockResolvedValue({
      fullName: 'org/my-api', htmlUrl: 'https://github.com/org/my-api',
      cloneUrl: 'https://github.com/org/my-api.git', sshUrl: 'git@github.com:org/my-api.git',
      defaultBranch: 'main',
    });
    mockGithubClient.createOrUpdateFile.mockResolvedValue(undefined);
    mockGithubClient.configureBranchProtection.mockResolvedValue(undefined);
    mockAudit.publish.mockResolvedValue(undefined);

    const result = await useCase.execute(command);

    expect(mockRepoRepo.update).toHaveBeenCalledWith(failedRepo.id, expect.objectContaining({
      status: RepositoryStatus.PROVISIONING,
      githubOwner: command.githubOwner,
      githubRepo: command.serviceName,
    }));
    expect(mockRepoRepo.updateStatus).toHaveBeenCalledWith(failedRepo.id, RepositoryStatus.ACTIVE);
    expect(result.id).toBe(activeRepo.id);
  });
});