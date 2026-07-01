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

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),

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
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<number>('JWT_ACCESS_TOKEN_TTL_SECONDS', 900),
          issuer: config.get<string>('JWT_ISSUER', 'idp-platform'),
        },
      }),
      inject: [ConfigService],
    }),
  ],

  controllers: [AuthController, UsersController, HealthController],

  providers: [
    // Repository adapters bound to their domain port tokens
    { provide: USER_REPOSITORY, useClass: UserRepositoryAdapter },
    { provide: ROLE_REPOSITORY, useClass: RoleRepositoryAdapter },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepositoryAdapter },

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
export class AuthModule {}
