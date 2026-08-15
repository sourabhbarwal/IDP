import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Logs one structured line per HTTP request: method, path, status, duration.
 *
 * Emitted via Nest's Logger so it goes to stdout in the same format as every
 * other log line — Promtail's Docker log driver picks it up automatically,
 * no separate transport/file needed.
 *
 * Register the same way as MetricsMiddleware:
 *   consumer.apply(RequestLoggerMiddleware).forRoutes('*');
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const { statusCode } = res;

      // Keep health/metrics polling out of the log stream — it fires every
      // few seconds from Docker healthchecks and Prometheus scrapes, and
      // would otherwise dominate the log volume with zero diagnostic value.
      const route = req.route?.path ?? req.path ?? originalUrl;
      if (route === '/health' || route === '/health/ready' || route === '/metrics') {
        return;
      }

      const message = `${method} ${originalUrl} ${statusCode} ${durationMs}ms`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}