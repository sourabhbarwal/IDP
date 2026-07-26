import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Algorithm } from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { AccessTokenClaims } from '../../application/ports/token-provider.port';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

function loadKey(envVarPath: string | undefined): string | undefined {
  if (!envVarPath) return undefined;
  const resolved = path.resolve(envVarPath);
  return fs.existsSync(resolved) ? fs.readFileSync(resolved, 'utf8') : undefined;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const algorithm = config.get<string>('jwt.algorithm', 'HS256');
    const isRS256 = algorithm === 'RS256';

    const secretOrKey = isRS256
      ? config.get<string>('jwt.publicKey')
      : config.get<string>('jwt.secret') ?? config.get<string>('JWT_SECRET');

    if (!secretOrKey) {
      throw new Error(isRS256 ? 'JWT_ALGORITHM=RS256 but jwt.publicKey is not configured' : 'JWT_SECRET is not configured');
    }

    const algorithms: Algorithm[] = isRS256 ? ['RS256'] : ['HS256'];

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
      algorithms,
      issuer: config.get<string>('jwt.issuer', 'idp-platform'),
    });
  }

  // Invoked automatically by Passport after verifying the token signature/expiry.
  validate(payload: AccessTokenClaims): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}