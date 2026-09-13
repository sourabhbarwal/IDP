import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the two permissions needed for the admin user-management UI
 * (Phase 22) that weren't part of the original RBAC seed: 'user:read' and
 * 'user:create'. 'user:manage' already existed and already covers
 * update-roles/update-status/delete.
 *
 * Granted to SECURITY_ADMIN and ORG_ADMIN, matching the existing grant
 * pattern for 'user:manage' in SeedRolesAndPermissions1718000000001.
 */
export class AddUserManagementPermissions1725800000000 implements MigrationInterface {
  name = 'AddUserManagementPermissions1725800000000';

  private readonly permissions: Array<[string, string]> = [
    ['user:read', 'View all platform users'],
    ['user:create', 'Create new users with role assignment'],
  ];

  private readonly grants: Record<string, string[]> = {
    SECURITY_ADMIN: ['user:read', 'user:create'],
    ORG_ADMIN: ['user:read', 'user:create'],
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query(
      `DELETE FROM auth.role_permissions WHERE permission_id IN (
        SELECT id FROM auth.permissions WHERE name IN ('user:read', 'user:create')
      )`,
    );
    await queryRunner.query(`DELETE FROM auth.permissions WHERE name IN ('user:read', 'user:create')`);
  }
}