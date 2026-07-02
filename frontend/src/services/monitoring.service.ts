import { apiClient } from '../lib/api-client';

const MONITORING_BASE = 'http://localhost:3006/api/v1';
const LOGGING_BASE = 'http://localhost:3007/api/v1';

export interface ServiceMetrics {
  service: string;
  namespace: string;
  requestRate: number;
  errorRate: number;
  p95LatencyMs: number;
  memoryUsageBytes: number;
  cpuUsageCores: number;
  readyReplicas: number;
}

export interface LogLine {
  timestamp: string;
  message: string;
  level?: string;
  service?: string;
  labels: Record<string, string>;
}

export interface LogQueryResult {
  lines: LogLine[];
  total: number;
}

export const monitoringService = {
  getAllServicesMetrics: () =>
    apiClient.get<ServiceMetrics[]>(`${MONITORING_BASE}/metrics/services`),

  getServiceMetrics: (serviceName: string) =>
    apiClient.get<ServiceMetrics>(`${MONITORING_BASE}/metrics/services/${serviceName}`),
};

export const loggingService = {
  getServiceLogs: (serviceName: string, environment = 'dev', limit = 100) =>
    apiClient.get<LogQueryResult>(`${LOGGING_BASE}/logs/services/${serviceName}`, {
      params: { environment, limit },
    }),

  searchLogs: (query: string, start?: number, end?: number, limit = 100) =>
    apiClient.get<LogQueryResult>(`${LOGGING_BASE}/logs/search`, {
      params: { q: query, start, end, limit },
    }),
};