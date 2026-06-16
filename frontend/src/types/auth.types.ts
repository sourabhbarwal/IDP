export interface User {
  id: string;
  email: string;
  fullName: string;
  status: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
  user: User;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  errors?: Record<string, unknown>;
}
