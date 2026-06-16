import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '@idp/common';
import { AuthenticatedUser } from './jwt.strategy';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Marks a controller method as requiring one or more permissions, e.g.
 * `@RequirePermissions('user:manage')`. Permissions are embedded in the JWT
 * (see ADR-0003) so this guard performs stateless authorization.
 */
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) {
      throw ApiException.unauthorized('Authentication required');
    }

    const hasAll = required.every((permission) => user.permissions.includes(permission));
    if (!hasAll) {
      throw ApiException.forbidden(`Missing required permission(s): ${required.join(', ')}`);
    }

    return true;
  }
}
