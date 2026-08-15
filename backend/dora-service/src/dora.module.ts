import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GlobalExceptionFilter, THROTTLE_CONFIG_GLOBAL, MetricsModule, MetricsMiddleware, RequestLoggerMiddleware} from '@idp/common';
import configuration from './infrastructure/config/configuration';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { DoraController } from './infrastructure/web/dora.controller';
import { HealthController } from './health/health.controller';
import { DoraMetricsService } from './application/dora-metrics.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type:     'postgres',
        host:     config.get<string>('db.host'),
        port:     config.get<number>('db.port'),
        username: config.get<string>('db.username'),
        password: config.get<string>('db.password'),
        database: config.get<string>('db.name'),
        // No entities — only raw SQL queries across schemas
        entities:      [],
        synchronize:   false,
        migrationsRun: false,
        logging:       false,
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot(THROTTLE_CONFIG_GLOBAL),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          issuer: config.get<string>('JWT_ISSUER', 'idp-platform'),
        },
      }),
      inject: [ConfigService],
    }),
    MetricsModule,
  ],
  controllers: [DoraController, HealthController],
  providers: [
    JwtStrategy,
    DoraMetricsService,
    { provide: APP_GUARD,  useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class DoraModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}