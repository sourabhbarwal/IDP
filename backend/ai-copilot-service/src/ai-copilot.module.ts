import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GlobalExceptionFilter, THROTTLE_CONFIG_GLOBAL } from '@idp/common';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { CopilotService } from './application/copilot.service';
import { GroqClientService } from './application/groq-client.service';
import { PlatformContextService } from './application/platform-context.service';
import { CopilotController } from './infrastructure/web/copilot.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    ThrottlerModule.forRoot(THROTTLE_CONFIG_GLOBAL),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CopilotController, HealthController],
  providers: [
    JwtStrategy,
    CopilotService,
    GroqClientService,
    PlatformContextService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AiCopilotModule {}