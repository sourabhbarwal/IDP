import { apiClient } from '../lib/api-client';

const COST_BASE = 'http://localhost:3011/api/v1';
const AUDIT_BASE = 'http://localhost:3010/api/v1';

export interface ResourceUsage {
  cpuCores: number;
  memoryMb: number;
  requestsPerMin: number;
}

export interface ServiceCost {
  serviceName: string;
  namespace: string;
  usage: ResourceUsage;
  estimatedHourlyCostUsd: number;
  estimatedMonthlyCostUsd: number;
  rightsizingStatus: 'OPTIMAL' | 'OVERSIZED' | 'UNDERSIZED' | 'IDLE';
  recommendations: string[];
  wastagePercent: number;
  measuredAt: string;
}

export interface PlatformTotals {
  totalMonthlyCostUsd: number;
  potentialSavingsUsd: number;
  idleServices: string[];
  oversizedServices: string[];
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: 'SUCCESS' | 'FAILURE';
  sourceSchema: string;
  createdAt: string;
}

export const costService = {
  getAllServiceCosts: () =>
    apiClient.get<ServiceCost[]>(`${COST_BASE}/cost/services`),
  getPlatformTotals: () =>
    apiClient.get<PlatformTotals>(`${COST_BASE}/cost/summary`),
};

export const auditService = {
  query: (params?: { action?: string; result?: string; schema?: string; page?: number; size?: number }) =>
    apiClient.get<{ content: AuditEntry[]; totalElements: number }>(`${AUDIT_BASE}/audit`, { params }),
  getSummary: () =>
    apiClient.get<Array<{ action: string; schema: string; count: number }>>(`${AUDIT_BASE}/audit/summary`),
};