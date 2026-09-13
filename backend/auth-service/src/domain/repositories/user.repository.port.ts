import { User } from '../entities/user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface PaginatedUsers {
  content: User[];
  totalElements: number;
  page: number;
  size: number;
  totalPages: number;
}

/**
 * Port for user persistence. The application layer depends only on this interface;
 * `infrastructure/persistence/repositories/user.repository.adapter.ts` implements it
 * using TypeORM (Dependency Inversion Principle).
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Persists a new user with the given default role(s) assigned and returns the
   * created domain entity (including generated id and roles/permissions).
   */
  createUser(params: {
    email: string;
    passwordHash: string;
    fullName: string;
    defaultRoleNames: string[];
  }): Promise<User>;

  /** Paginated, filterable list of all users (admin only). Excludes soft-deleted users. */
  findAll(opts: {
    page: number;
    size: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<PaginatedUsers>;

  /** Replaces a user's role assignments entirely with the given role names. */
  updateRoles(userId: string, roleNames: string[]): Promise<User>;

  /** Updates a user's account status (ACTIVE / INACTIVE / SUSPENDED). */
  updateStatus(userId: string, status: string): Promise<User>;

  /** Soft-deletes a user (sets deleted_at, does not remove the row). */
  softDelete(userId: string): Promise<void>;
}