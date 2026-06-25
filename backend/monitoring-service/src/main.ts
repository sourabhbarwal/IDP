import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MonitoringModule } from './monitoring.module';
import { GlobalExceptionFilter } from '@idp/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(MonitoringModule);
  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'] });
  app.useGlobalFilters(new GlobalExceptionFilter());
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder().setTitle('IDP — Monitoring Service').setVersion('0.1.0').build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  const port = process.env.PORT ?? 3006;
  await app.listen(port);
  console.log(`monitoring-service listening on port ${port}`);
}
bootstrap().catch((err) => { console.error(err); process.exit(1); });