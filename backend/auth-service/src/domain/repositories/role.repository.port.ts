import { Role } from '../entities/role.entity';

export const ROLE_REPOSITORY = 'ROLE_REPOSITORY';

export interface RoleRepository {
  findByName(name: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
}
