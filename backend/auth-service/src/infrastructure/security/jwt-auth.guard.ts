import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protects routes requiring a valid JWT access token. Apply with
 * `@UseGuards(JwtAuthGuard)`. Other services (resource servers) will reuse the
 * same strategy/guard pattern once shared into @idp/common (tracked for Phase 2+).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
