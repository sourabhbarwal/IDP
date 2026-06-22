import { apiClient } from '../lib/api-client';
import { TemplateMetadata, TemplateType } from '../types/template.types';

const BASE = 'http://localhost:3004/api/v1';

export interface GenerateTemplateParams {
  serviceName: string;
  description?: string;
  port?: number;
  packageName?: string;
  author?: string;
  authorEmail?: string;
}

export const templateService = {
  listAll: () => apiClient.get<TemplateMetadata[]>(`${BASE}/templates`),

  getOne: (type: TemplateType) => apiClient.get<TemplateMetadata>(`${BASE}/templates/${type}`),

  /**
   * Downloads a generated project zip file directly in the browser.
   * Uses a temporary anchor element since axios can't trigger browser downloads directly.
   */
  download: async (type: TemplateType, params: GenerateTemplateParams): Promise<void> => {
    const token = localStorage.getItem('accessToken');
    const query = new URLSearchParams({
      serviceName: params.serviceName,
      ...(params.description ? { description: params.description } : {}),
      ...(params.port ? { port: String(params.port) } : {}),
      ...(params.packageName ? { packageName: params.packageName } : {}),
    });

    const url = `${BASE}/templates/${type}/generate?${query.toString()}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Download failed' }));
      throw new Error(err.detail ?? 'Download failed');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `${params.serviceName}-${type.toLowerCase()}-template.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  },
};