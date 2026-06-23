import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';

/** Full implementation: Prometheus query proxy, metrics aggregation — Phase 7 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] })],
  controllers: [HealthController],
})
export class MonitoringModule {}