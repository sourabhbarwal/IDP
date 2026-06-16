/**
 * Domain exceptions are framework-agnostic. Use cases throw these; the web layer
 * (controllers / a NestJS exception filter) maps them to {@link ApiException}
 * subclasses / HTTP status codes.
 */

export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`An account with email '${email}' already exists`);
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountNotActiveError extends Error {
  constructor(status: string) {
    super(`Account is not active (status: ${status})`);
    this.name = 'AccountNotActiveError';
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('Refresh token is invalid, expired, or has already been used');
    this.name = 'InvalidRefreshTokenError';
  }
}

export class UserNotFoundError extends Error {
  constructor(identifier: string) {
    super(`User '${identifier}' was not found`);
    this.name = 'UserNotFoundError';
  }
}
