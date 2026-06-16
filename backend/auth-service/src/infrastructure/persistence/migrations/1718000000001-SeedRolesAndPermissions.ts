import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the 5 platform roles and the initial permission set, and wires up
 * role_permissions per the RBAC defaults documented in ADR-0003.
 */
export class SeedRolesAndPermissions1718000000001 implements MigrationInterface {
  name = 'SeedRolesAndPermissions1718000000001';

  private readonly roles = ['DEVELOPER', 'DEVOPS_ENGINEER', 'PLATFORM_ENGINEER', 'SECURITY_ADMIN', 'ORG_ADMIN'];

  private readonly permissions: Array<[string, string]> = [
    ['service:create', 'Create a service in the catalog'],
    ['service:read', 'View service metadata'],
    ['service:update', 'Edit service metadata'],
    ['service:delete', 'Delete a service'],
    ['repository:provision', 'Provision a GitHub repository for a service'],
    ['template:generate', 'Generate a project from a template'],
    ['deployment:create', 'Trigger a deployment'],
    ['deployment:rollback', 'Roll back a deployment'],
    ['deployment:promote', 'Promote a deployment to the next environment'],
    ['secret:read', 'Read secret metadata (not values)'],
    ['secret:write', 'Create or update secrets'],
    ['secret:rotate', 'Rotate secrets'],
    ['alert:manage', 'Configure alerting rules and notification channels'],
    ['cost:read', 'View cost reports and recommendations'],
    ['audit:read', 'View audit logs'],
    ['user:manage', 'Manage users, roles and permission assignments'],
  ];

  // role -> permission names
  private readonly grants: Record<string, string[]> = {
    DEVELOPER: [
      'service:create',
      'service:read',
      'service:update',
      'repository:provision',
      'template:generate',
      'deployment:create',
      'cost:read',
    ],
    DEVOPS_ENGINEER: [
      'service:read',
      'service:update',
      'deployment:create',
      'deployment:rollback',
      'deployment:promote',
      'alert:manage',
      'secret:read',
      'cost:read',
    ],
    PLATFORM_ENGINEER: [
      'service:create',
      'service:read',
      'service:update',
      'service:delete',
      'repository:provision',
      'template:generate',
      'deployment:create',
      'deployment:rollback',
      'deployment:promote',
      'alert:manage',
      'secret:read',
      'secret:write',
      'secret:rotate',
      'cost:read',
      'audit:read',
    ],
    SECURITY_ADMIN: ['service:read', 'secret:read', 'secret:write', 'secret:rotate', 'audit:read', 'user:manage'],
    ORG_ADMIN: [
      'service:create',
      'service:read',
      'service:update',
      'service:delete',
      'repository:provision',
      'template:generate',
      'deployment:create',
      'deployment:rollback',
      'deployment:promote',
      'secret:read',
      'secret:write',
      'secret:rotate',
      'alert:manage',
      'cost:read',
      'audit:read',
      'user:manage',
    ],
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const role of this.roles) {
      await queryRunner.query(`INSERT INTO auth.roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [role]);
    }

    for (const [name, description] of this.permissions) {
      await queryRunner.query(
        `INSERT INTO auth.permissions (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [name, description],
      );
    }

    for (const [role, permissionNames] of Object.entries(this.grants)) {
      for (const permissionName of permissionNames) {
        await queryRunner.query(
          `
          INSERT INTO auth.role_permissions (role_id, permission_id)
          SELECT r.id, p.id FROM auth.roles r, auth.permissions p
          WHERE r.name = $1 AND p.name = $2
          ON CONFLICT DO NOTHING
          `,
          [role, permissionName],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM auth.role_permissions`);
    await queryRunner.query(`DELETE FROM auth.permissions`);
    await queryRunner.query(`DELETE FROM auth.roles`);
  }
}
