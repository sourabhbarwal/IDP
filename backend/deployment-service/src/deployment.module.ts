import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';

/**
 * Deployment Service — Phase 5 stub.
 * Full implementation (rolling/blue-green/canary, K8s integration,
 * promote/rollback) arrives in Phase 6.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] })],
  controllers: [HealthController],
})
export class DeploymentModule {}