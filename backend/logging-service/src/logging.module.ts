import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from '@idp/common';
import { HealthController } from './health/health.controller';
import { LogsController } from './infrastructure/web/logs.controller';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { LokiQueryService } from './application/loki-query.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
  ],
  controllers: [HealthController, LogsController],
  providers: [
    JwtStrategy,
    LokiQueryService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class LoggingModule {}