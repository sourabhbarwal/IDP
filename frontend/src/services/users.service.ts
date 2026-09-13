import { apiClient } from '../lib/api-client';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'}/api/v1`;

export type UserRole   = 'ADMIN' | 'DEVELOPER' | 'OPERATOR' | 'VIEWER' | 'SERVICE_ACCOUNT';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface PlatformUser {
  id:            string;
  email:         string;
  firstName:     string;
  lastName:      string;
  status:        UserStatus;
  roles:         UserRole[];
  permissions:   string[];
  emailVerified: boolean;
  createdAt:     string;
  lastLoginAt:   string | null;
}

export interface UsersPage {
  content:       PlatformUser[];
  totalElements: number;
  page:          number;
  size:          number;
  totalPages:    number;
}

export interface CreateUserPayload {
  email:     string;
  password:  string;
  firstName: string;
  lastName:  string;
  roles:     UserRole[];
}

export const usersService = {
  list: (params: { page?: number; size?: number; search?: string; role?: string; status?: string }) =>
    apiClient.get<UsersPage>(`${BASE}/users`, { params }),

  create: (payload: CreateUserPayload) =>
    apiClient.post<PlatformUser>(`${BASE}/users`, payload),

  updateRoles: (id: string, roles: UserRole[]) =>
    apiClient.patch<PlatformUser>(`${BASE}/users/${id}/roles`, { roles }),

  updateStatus: (id: string, status: UserStatus) =>
    apiClient.patch<PlatformUser>(`${BASE}/users/${id}/status`, { status }),

  delete: (id: string) =>
    apiClient.delete(`${BASE}/users/${id}`),

  getById: (id: string) =>
    apiClient.get<PlatformUser>(`${BASE}/users/${id}`),
};

export const ROLE_CONFIG: Record<UserRole, { label: string; color: string; description: string }> = {
  ADMIN:           { label: 'Admin',           color: 'bg-red-100 text-red-700 border-red-200',       description: 'Full platform access. Can manage users and all resources.' },
  DEVELOPER:       { label: 'Developer',       color: 'bg-blue-100 text-blue-700 border-blue-200',    description: 'Can create services, deployments, and use all platform features.' },
  OPERATOR:        { label: 'Operator',        color: 'bg-purple-100 text-purple-700 border-purple-200', description: 'Can manage deployments and alerts. Read access to catalog.' },
  VIEWER:          { label: 'Viewer',          color: 'bg-gray-100 text-gray-600 border-gray-200',    description: 'Read-only access to catalog, monitoring, and DORA metrics.' },
  SERVICE_ACCOUNT: { label: 'Service Account', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', description: 'Machine-to-machine access for CI/CD pipelines.' },
};

export const STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  ACTIVE:    { label: 'Active',    color: 'bg-emerald-100 text-emerald-700' },
  INACTIVE:  { label: 'Inactive',  color: 'bg-gray-100 text-gray-500'      },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-100 text-red-600'        },
};