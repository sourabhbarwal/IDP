import { HttpStatus } from '@nestjs/common';

/**
 * Base class for exceptions that should be translated directly into an HTTP response
 * via {@link GlobalExceptionFilter}. Application/use-case code throws these (or
 * service-specific subclasses) so error semantics are explicit and not coupled to
 * the HTTP layer in the domain itself.
 */
export class ApiException extends Error {
  constructor(
    public readonly status: HttpStatus,
    public readonly type: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiException';
  }

  static notFound(resource: string, id: string | number): ApiException {
    return new ApiException(
      HttpStatus.NOT_FOUND,
      'https://idp.platform/errors/not-found',
      `${resource} with id '${id}' was not found`,
    );
  }

  static conflict(message: string): ApiException {
    return new ApiException(HttpStatus.CONFLICT, 'https://idp.platform/errors/conflict', message);
  }

  static unauthorized(message: string): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, 'https://idp.platform/errors/unauthorized', message);
  }

  static forbidden(message: string): ApiException {
    return new ApiException(HttpStatus.FORBIDDEN, 'https://idp.platform/errors/forbidden', message);
  }

  static badRequest(message: string): ApiException {
    return new ApiException(HttpStatus.BAD_REQUEST, 'https://idp.platform/errors/bad-request', message);
  }
}
