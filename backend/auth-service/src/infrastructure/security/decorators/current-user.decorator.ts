import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../jwt.strategy';

/**
 * Injects the authenticated user (populated by JwtStrategy.validate) into a
 * controller method parameter: `getMe(@CurrentUser() user: AuthenticatedUser)`.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
