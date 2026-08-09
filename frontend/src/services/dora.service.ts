import { apiClient } from '../lib/api-client';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3014'}/api/v1`;

export type DoraLevel = 'ELITE' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DoraMetricDetail {
  value:       number;
  unit:        string;
  level:       DoraLevel;
  description: string;
  total?:      number;
  totalFailed?: number;
  totalIncidents?: number;
}

export interface DoraTrend {
  date:        string;
  deployments: number;
  failures:    number;
}

export interface DoraResponse {
  window: { days: number; startDate: string; endDate: string };
  overall: { level: DoraLevel; description: string };
  metrics: {
    deploymentFrequency: DoraMetricDetail;
    leadTime:            DoraMetricDetail;
    changeFailureRate:   DoraMetricDetail;
    mttr:                DoraMetricDetail;
  };
  trend: DoraTrend[];
}

export interface DoraSummary {
  level:                     DoraLevel;
  deploymentFrequencyPerDay: number;
  changeFailureRatePercent:  number;
  mttrHours:                 number;
  totalDeployments30d:       number;
}

export const doraService = {
  getMetrics: (window = 30) =>
    apiClient.get<DoraResponse>(`${BASE}/dora?window=${window}`),

  getSummary: () =>
    apiClient.get<DoraSummary>(`${BASE}/dora/summary`),
};