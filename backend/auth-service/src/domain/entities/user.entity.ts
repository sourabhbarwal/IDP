import { UserStatus } from '../enums/user-status.enum';
import { Role } from './role.entity';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  status: UserStatus;
  organizationId: string | null;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Core User domain entity. Contains business rules only - persistence concerns
 * (TypeORM entities) live in infrastructure/persistence and are mapped to/from this
 * class by repository adapters.
 */
export class User {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly fullName: string;
  readonly status: UserStatus;
  readonly organizationId: string | null;
  readonly roles: Role[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.fullName = props.fullName;
    this.status = props.status;
    this.organizationId = props.organizationId;
    this.roles = props.roles;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  /** Union of permission names across all assigned roles - embedded in the JWT. */
  permissions(): string[] {
    const set = new Set<string>();
    for (const role of this.roles) {
      for (const permission of role.permissionNames()) {
        set.add(permission);
      }
    }
    return Array.from(set);
  }

  roleNames(): string[] {
    return this.roles.map((r) => r.name);
  }
}
