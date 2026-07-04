import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from '@idp/common';
import configuration from './infrastructure/config/configuration';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { CostAnalysisService } from './application/cost-analysis.service';
import { CostController } from './infrastructure/web/cost.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CostController, HealthController],
  providers: [
    JwtStrategy,
    CostAnalysisService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class CostModule {}