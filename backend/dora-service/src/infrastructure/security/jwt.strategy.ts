import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'change-me'),
      issuer: config.get<string>('JWT_ISSUER', 'idp-platform'),
    });
  }

  validate(payload: {
    sub: string;
    email: string;
    roles: string[];
    permissions: string[];
  }): AuthenticatedUser {
    return {
      userId:      payload.sub,
      email:       payload.email,
      roles:       payload.roles       ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}