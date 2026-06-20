import { apiClient } from '../lib/api-client';
import { CatalogService, PageResponse, ServiceType, ServiceStatus } from '../types/catalog.types';

export interface ListServicesParams {
  search?: string;
  type?: ServiceType;
  status?: ServiceStatus;
  team?: string;
  page?: number;
  size?: number;
}

export interface CreateServicePayload {
  name: string;
  type: ServiceType;
  description?: string;
  team?: string;
  repositoryUrl?: string;
  tags?: string[];
}

export interface UpdateServicePayload {
  description?: string;
  type?: ServiceType;
  status?: ServiceStatus;
  team?: string;
  repositoryUrl?: string;
  tags?: string[];
}

const BASE = 'http://localhost:3002/api/v1';

export const catalogService = {
  list: (params: ListServicesParams = {}) =>
    apiClient.get<PageResponse<CatalogService>>(`${BASE}/services`, { params }),

  getById: (id: string) =>
    apiClient.get<CatalogService>(`${BASE}/services/${id}`),

  create: (payload: CreateServicePayload) =>
    apiClient.post<CatalogService>(`${BASE}/services`, payload),

  update: (id: string, payload: UpdateServicePayload) =>
    apiClient.put<CatalogService>(`${BASE}/services/${id}`, payload),

  remove: (id: string) =>
    apiClient.delete(`${BASE}/services/${id}`),
};