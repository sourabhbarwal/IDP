import { apiClient } from '../lib/api-client';

const BASE = 'http://localhost:3008/api/v1';

export interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  promqlExpression: string;
  forDuration: string;
  severity: 'critical' | 'warning' | 'info';
  serviceId: string | null;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  enabled: boolean;
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  alertName: string;
  severity: string;
  status: string;
  namespace: string | null;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string | null;
  acknowledgedBy: string | null;
  durationMs: number;
}

export interface CreateAlertRulePayload {
  name: string;
  promqlExpression: string;
  severity: 'critical' | 'warning' | 'info';
  forDuration?: string;
  description?: string;
  serviceId?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export const alertService = {
  listRules: () =>
    apiClient.get<{ content: AlertRule[]; totalElements: number }>(`${BASE}/alerts/rules`),

  createRule: (payload: CreateAlertRulePayload) =>
    apiClient.post<AlertRule>(`${BASE}/alerts/rules`, payload),

  getActiveAlerts: () =>
    apiClient.get<AlertEvent[]>(`${BASE}/alerts/active`),

  acknowledge: (id: string) =>
    apiClient.post(`${BASE}/alerts/events/${id}/acknowledge`, {}),
};
