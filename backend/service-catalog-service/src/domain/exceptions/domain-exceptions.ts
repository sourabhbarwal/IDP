export class ServiceNotFoundError extends Error {
  constructor(id: string) {
    super(`Service with id '${id}' was not found`);
    this.name = 'ServiceNotFoundError';
  }
}

export class ServiceNameConflictError extends Error {
  constructor(name: string) {
    super(`A service named '${name}' already exists`);
    this.name = 'ServiceNameConflictError';
  }
}

export class ServiceAccessDeniedError extends Error {
  constructor() {
    super('You do not have permission to modify this service');
    this.name = 'ServiceAccessDeniedError';
  }
}