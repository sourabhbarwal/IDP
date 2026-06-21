export const GITHUB_CLIENT = 'GITHUB_CLIENT';

export interface CreateRepoParams {
  owner: string;
  name: string;
  description: string;
  visibility: 'public' | 'private' | 'internal';
  defaultBranch: string;
}

export interface CreatedRepo {
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
}

export interface CreateFileParams {
  owner: string;
  repo: string;
  path: string;
  message: string;
  content: string; // base64-encoded
  branch: string;
}

export interface BranchProtectionParams {
  owner: string;
  repo: string;
  branch: string;
  requiredReviewers: number;
  requireStatusChecks: string[];
}

/**
 * Port (interface) for GitHub API operations. Implemented by OctokitGithubClient
 * in infrastructure; mocked in tests. Follows ADR-0005 (PAT for MVP, GitHub App for prod).
 */
export interface GithubClient {
  createRepository(params: CreateRepoParams): Promise<CreatedRepo>;
  createOrUpdateFile(params: CreateFileParams): Promise<void>;
  configureBranchProtection(params: BranchProtectionParams): Promise<void>;
}