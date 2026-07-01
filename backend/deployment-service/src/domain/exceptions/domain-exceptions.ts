export class DeploymentNotFoundError extends Error {
  constructor(id: string) {
    super(`Deployment '${id}' was not found`);
    this.name = 'DeploymentNotFoundError';
  }
}

export class NoPreviousDeploymentError extends Error {
  constructor(serviceId: string, environment: string) {
    super(`No previous successful deployment found for service '${serviceId}' in '${environment}' to roll back to`);
    this.name = 'NoPreviousDeploymentError';
  }
}

export class CannotPromoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CannotPromoteError';
  }
}

export class KubernetesOperationError extends Error {
  constructor(message: string) {
    super(`Kubernetes operation failed: ${message}`);
    this.name = 'KubernetesOperationError';
  }
}