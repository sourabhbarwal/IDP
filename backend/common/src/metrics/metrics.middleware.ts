import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram, collectDefaultMetrics, register } from 'prom-client';

collectDefaultMetrics();

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in ms',
  labelNames: ['method', 'route', 'status'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    res.on('finish', () => {
      const route = req.route?.path ?? req.path ?? 'unknown';
      const labels = { method: req.method, route, status: String(res.statusCode) };
      httpRequestsTotal.inc(labels);
      httpDuration.observe(labels, Date.now() - start);
    });
    next();
  }
}

export { register };