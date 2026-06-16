export const PASSWORD_HASHER = 'PASSWORD_HASHER';

/**
 * Port for password hashing. Implemented with bcrypt in infrastructure/security
 * (ADR-0003). Kept as a port so the algorithm can change (e.g. to Argon2) without
 * touching use cases.
 */
export interface PasswordHasher {
  hash(plainText: string): Promise<string>;
  compare(plainText: string, hash: string): Promise<boolean>;
}
