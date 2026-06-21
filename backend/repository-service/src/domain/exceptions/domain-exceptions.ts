export class RepositoryAlreadyExistsError extends Error {
  constructor(serviceId: string) {
    super(`A repository for service '${serviceId}' already exists`);
    this.name = 'RepositoryAlreadyExistsError';
  }
}

export class RepositoryNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Repository '${identifier}' was not found`);
    this.name = 'RepositoryNotFoundError';
  }
}

export class GitHubProvisioningError extends Error {
  constructor(message: string) {
    super(`GitHub provisioning failed: ${message}`);
    this.name = 'GitHubProvisioningError';
  }
}