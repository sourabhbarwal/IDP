import { Permission } from './permission.entity';

/**
 * One of the five platform roles: DEVELOPER, DEVOPS_ENGINEER, PLATFORM_ENGINEER,
 * SECURITY_ADMIN, ORG_ADMIN (per spec). Plain domain object.
 */
export class Role {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly permissions: Permission[] = [],
  ) {}

  permissionNames(): string[] {
    return this.permissions.map((p) => p.name);
  }
}

export const ROLE_NAMES = {
  DEVELOPER: 'DEVELOPER',
  DEVOPS_ENGINEER: 'DEVOPS_ENGINEER',
  PLATFORM_ENGINEER: 'PLATFORM_ENGINEER',
  SECURITY_ADMIN: 'SECURITY_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];
