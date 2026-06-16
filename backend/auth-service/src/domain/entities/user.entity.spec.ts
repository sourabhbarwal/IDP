import { User } from './user.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { UserStatus } from '../enums/user-status.enum';

function makeUser(overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User {
  return new User({
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed',
    fullName: 'Test User',
    status: UserStatus.ACTIVE,
    organizationId: null,
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('User domain entity', () => {
  it('isActive() returns true when status is ACTIVE', () => {
    const user = makeUser({ status: UserStatus.ACTIVE });
    expect(user.isActive()).toBe(true);
  });

  it('isActive() returns false when status is DISABLED', () => {
    const user = makeUser({ status: UserStatus.DISABLED });
    expect(user.isActive()).toBe(false);
  });

  it('isActive() returns false when status is LOCKED', () => {
    const user = makeUser({ status: UserStatus.LOCKED });
    expect(user.isActive()).toBe(false);
  });

  it('permissions() returns union of all role permissions deduplicated', () => {
    const read = new Permission('p1', 'service:read', null);
    const write = new Permission('p2', 'service:create', null);
    const shared = new Permission('p3', 'deployment:create', null);

    const roleA = new Role('r1', 'DEVELOPER', null, [read, shared]);
    const roleB = new Role('r2', 'DEVOPS_ENGINEER', null, [write, shared]);

    const user = makeUser({ roles: [roleA, roleB] });
    const perms = user.permissions();

    expect(perms).toContain('service:read');
    expect(perms).toContain('service:create');
    expect(perms).toContain('deployment:create');
    // deduplicated
    expect(perms.filter((p) => p === 'deployment:create')).toHaveLength(1);
  });

  it('roleNames() returns names of all assigned roles', () => {
    const roleA = new Role('r1', 'DEVELOPER', null, []);
    const roleB = new Role('r2', 'ORG_ADMIN', null, []);
    const user = makeUser({ roles: [roleA, roleB] });
    expect(user.roleNames()).toEqual(['DEVELOPER', 'ORG_ADMIN']);
  });

  it('permissions() returns empty array when user has no roles', () => {
    const user = makeUser({ roles: [] });
    expect(user.permissions()).toEqual([]);
  });
});
