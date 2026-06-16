import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiException } from './api-exception';
import { buildErrorResponse, buildValidationErrorResponse } from './error-response';

/**
 * Catches all exceptions and translates them into RFC 7807 Problem Details.
 * Each service registers this globally via `app.useGlobalFilters(new GlobalExceptionFilter())`.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const instance = request.originalUrl ?? request.url;

    if (exception instanceof ApiException) {
      response.status(exception.status).json(
        buildErrorResponse(exception.type, HttpStatus[exception.status], exception.status, exception.message, instance),
      );
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exResponse = exception.getResponse();

      // class-validator failures surface here with `message` as an array of strings
      if (
        status === HttpStatus.BAD_REQUEST &&
        typeof exResponse === 'object' &&
        exResponse !== null &&
        Array.isArray((exResponse as Record<string, unknown>).message)
      ) {
        const messages = (exResponse as Record<string, unknown>).message as string[];
        const fieldErrors: Record<string, unknown> = { violations: messages };
        response.status(HttpStatus.UNPROCESSABLE_ENTITY).json(buildValidationErrorResponse(instance, fieldErrors));
        return;
      }

      const detail =
        typeof exResponse === 'string'
          ? exResponse
          : ((exResponse as Record<string, unknown>)?.message as string) ?? exception.message;

      response
        .status(status)
        .json(buildErrorResponse(`https://idp.platform/errors/${status}`, HttpStatus[status], status, detail, instance));
      return;
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      buildErrorResponse(
        'https://idp.platform/errors/internal',
        'Internal Server Error',
        500,
        'An unexpected error occurred',
        instance,
      ),
    );
  }
}
