import { User } from '../entities/user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';

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
}
