import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import {
  BranchProtectionParams,
  CreateFileParams,
  CreateRepoParams,
  CreatedRepo,
  GithubClient,
} from '../../application/ports/github-client.port';

/**
 * Production implementation of GithubClient using @octokit/rest with a PAT.
 * See ADR-0005 for migration path to GitHub App.
 */
@Injectable()
export class OctokitGithubClient implements GithubClient, OnModuleInit {
  private readonly logger = new Logger(OctokitGithubClient.name);
  private octokit!: Octokit;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const token = this.config.get<string>('GITHUB_TOKEN');
    if (!token) {
      this.logger.warn('GITHUB_TOKEN not set — GitHub API calls will fail');
    }
    this.octokit = new Octokit({ auth: token });
  }

  async createRepository(params: CreateRepoParams): Promise<CreatedRepo> {
    this.logger.log(`Creating repository ${params.owner}/${params.name}`);

    try {
      // Try creating under an org first; fall back to user account
      let response: Awaited<ReturnType<typeof this.octokit.repos.createInOrg>>;

      try {
        response = await this.octokit.repos.createInOrg({
          org: params.owner,
          name: params.name,
          description: params.description,
          private: params.visibility !== 'public',
          auto_init: false,
          has_issues: true,
          has_projects: false,
          has_wiki: false,
          default_branch: params.defaultBranch,
        });
      } catch {
        // Not an org — create under authenticated user
        const userResponse = await this.octokit.repos.createForAuthenticatedUser({
          name: params.name,
          description: params.description,
          private: params.visibility !== 'public',
          auto_init: false,
          has_issues: true,
          has_projects: false,
          has_wiki: false,
        });
        response = userResponse as typeof response;
      }

      return {
        fullName: response.data.full_name,
        htmlUrl: response.data.html_url,
        cloneUrl: response.data.clone_url,
        sshUrl: response.data.ssh_url,
        defaultBranch: response.data.default_branch ?? params.defaultBranch,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create GitHub repository: ${message}`);
    }
  }

  async createOrUpdateFile(params: CreateFileParams): Promise<void> {
    this.logger.debug(`Creating file ${params.path} in ${params.owner}/${params.repo}`);

    try {
      // Check if file exists first
      let sha: string | undefined;
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: params.owner,
          repo: params.repo,
          path: params.path,
          ref: params.branch,
        });
        if (!Array.isArray(data) && data.type === 'file') {
          sha = data.sha;
        }
      } catch {
        // File doesn't exist — that's fine for initial commit
      }

      await this.octokit.repos.createOrUpdateFileContents({
        owner: params.owner,
        repo: params.repo,
        path: params.path,
        message: params.message,
        content: params.content,
        branch: params.branch,
        ...(sha ? { sha } : {}),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create file ${params.path}: ${message}`);
    }
  }

  async configureBranchProtection(params: BranchProtectionParams): Promise<void> {
    this.logger.log(`Configuring branch protection on ${params.owner}/${params.repo}:${params.branch}`);

    try {
      await this.octokit.repos.updateBranchProtection({
        owner: params.owner,
        repo: params.repo,
        branch: params.branch,
        required_status_checks: {
          strict: true,
          contexts: params.requireStatusChecks,
        },
        enforce_admins: false,
        required_pull_request_reviews: {
          required_approving_review_count: params.requiredReviewers,
          dismiss_stale_reviews: true,
        },
        restrictions: null,
      });
    } catch (error: unknown) {
      // Branch protection on private repos may require GitHub Pro/Team.
      // Log warning but don't fail the whole provisioning.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Branch protection setup warning (non-fatal): ${message}`);
    }
  }
}