import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Algorithm } from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

export interface AuthenticatedUser { userId: string; email: string; roles: string[]; permissions: string[]; }

function loadKey(envVarPath: string | undefined): string | undefined {
  if (!envVarPath) return undefined;
  const resolved = path.resolve(envVarPath);
  return fs.existsSync(resolved) ? fs.readFileSync(resolved, 'utf8') : undefined;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const algorithm = config.get<string>('JWT_ALGORITHM', 'HS256');
    const isRS256 = algorithm === 'RS256';

    const secretOrKey = isRS256
      ? loadKey(config.get<string>('JWT_PUBLIC_KEY_PATH'))
      : config.get<string>('JWT_SECRET');

    if (!secretOrKey) {
      throw new Error(isRS256 ? 'JWT_ALGORITHM=RS256 but JWT_PUBLIC_KEY_PATH is not set or file not found' : 'JWT_SECRET is not configured');
    }

    const algorithms: Algorithm[] = isRS256 ? ['RS256'] : ['HS256'];

    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey, algorithms, issuer: config.get<string>('JWT_ISSUER','idp-platform') });
  }
  validate(payload: { sub: string; email: string; roles: string[]; permissions: string[] }): AuthenticatedUser {
    return { userId: payload.sub, email: payload.email, roles: payload.roles ?? [], permissions: payload.permissions ?? [] };
  }
}