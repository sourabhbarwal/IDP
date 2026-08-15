import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HealthController } from './infrastructure/web/health.controller';
import configuration from './infrastructure/config/configuration';
import { typeOrmOptionsFactory } from './infrastructure/config/typeorm-options.factory';

// ORM entities
import { UserOrmEntity } from './infrastructure/persistence/orm-entities/user.orm-entity';
import { RoleOrmEntity } from './infrastructure/persistence/orm-entities/role.orm-entity';
import { PermissionOrmEntity } from './infrastructure/persistence/orm-entities/permission.orm-entity';
import { RefreshTokenOrmEntity } from './infrastructure/persistence/orm-entities/refresh-token.orm-entity';
import { AuditLogOrmEntity } from './infrastructure/persistence/orm-entities/audit-log.orm-entity';

// Repository adapters
import { UserRepositoryAdapter } from './infrastructure/persistence/repositories/user.repository.adapter';
import { RoleRepositoryAdapter } from './infrastructure/persistence/repositories/role.repository.adapter';
import { RefreshTokenRepositoryAdapter } from './infrastructure/persistence/repositories/refresh-token.repository.adapter';

// Domain repository port tokens
import { USER_REPOSITORY } from './domain/repositories/user.repository.port';
import { ROLE_REPOSITORY } from './domain/repositories/role.repository.port';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository.port';

// Application port tokens
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { TOKEN_PROVIDER } from './application/ports/token-provider.port';
import { AUDIT_PUBLISHER } from '@idp/common';

// Use cases
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';

// Infrastructure implementations
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { JwtTokenProvider } from './infrastructure/security/jwt-token-provider';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { LocalAuditPublisher } from './infrastructure/audit/local-audit-publisher';

// Controllers
import { AuthController } from './infrastructure/web/auth.controller';
import { UsersController } from './infrastructure/web/users.controller';

import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_CONFIG_AUTH} from '@idp/common';
import { MetricsModule, MetricsMiddleware, RequestLoggerMiddleware } from '@idp/common';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),

    ThrottlerModule.forRoot(THROTTLE_CONFIG_AUTH),

    // Database
    TypeOrmModule.forRootAsync({
      useFactory: typeOrmOptionsFactory,
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      UserOrmEntity,
      RoleOrmEntity,
      PermissionOrmEntity,
      RefreshTokenOrmEntity,
      AuditLogOrmEntity,
    ]),

    // Auth
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => {
        const algorithm = config.get<string>('jwt.algorithm', 'HS256');

        if (algorithm === 'RS256') {
          const privateKey = config.get<string>('jwt.privateKey');
          const publicKey  = config.get<string>('jwt.publicKey');

          if (!privateKey || !publicKey) {
            throw new Error(
              'JWT_ALGORITHM=RS256 requires JWT_PRIVATE_KEY_PATH and JWT_PUBLIC_KEY_PATH to be set',
            );
          }

          return {
            privateKey,
            publicKey,  
            signOptions: {
              algorithm: 'RS256',
              expiresIn: config.get<number>('jwt.accessTokenTtl', 900),
              issuer: config.get<string>('jwt.issuer', 'idp-platform'),
            },
            verifyOptions: {
              algorithms: ['RS256'],
              issuer: config.get<string>('jwt.issuer', 'idp-platform'),
            },
          };
        }

        // Default: HS256 for local development
        return {
          secret: config.get<string>('jwt.secret', 'change-me'),
          signOptions: {
            algorithm: 'HS256',
            expiresIn: config.get<number>('jwt.accessTokenTtl', 900),
            issuer: config.get<string>('jwt.issuer', 'idp-platform'),
          },
        };
      },
      inject: [ConfigService],
    }),
    MetricsModule,
  ],

  controllers: [AuthController, UsersController, HealthController],

  providers: [
    // Repository adapters bound to their domain port tokens
    { provide: USER_REPOSITORY, useClass: UserRepositoryAdapter },
    { provide: ROLE_REPOSITORY, useClass: RoleRepositoryAdapter },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepositoryAdapter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Application port implementations
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_PROVIDER, useClass: JwtTokenProvider },
    { provide: AUDIT_PUBLISHER, useClass: LocalAuditPublisher },

    // Security
    JwtStrategy,

    // Use cases
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    GetCurrentUserUseCase,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}