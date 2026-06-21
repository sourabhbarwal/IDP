import { apiClient } from '../lib/api-client';
import { Repository } from '../types/repository.types';

const BASE = 'http://localhost:3003/api/v1';

export interface ProvisionRepositoryPayload {
  serviceId: string;
  serviceName: string;
  serviceType: string;
  description?: string;
  visibility?: 'public' | 'private' | 'internal';
}

export const repositoryService = {
  provision: (payload: ProvisionRepositoryPayload) =>
    apiClient.post<Repository>(`${BASE}/repositories`, payload),

  getByServiceId: (serviceId: string) =>
    apiClient.get<Repository>(`${BASE}/repositories/by-service/${serviceId}`),
};