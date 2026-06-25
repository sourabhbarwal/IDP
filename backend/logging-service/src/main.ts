import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingModule } from './logging.module';
import { GlobalExceptionFilter } from '@idp/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(LoggingModule);
  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'] });
  app.useGlobalFilters(new GlobalExceptionFilter());
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder().setTitle('IDP — Logging Service').setVersion('0.1.0').build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  const port = process.env.PORT ?? 3007;
  await app.listen(port);
  console.log(`Logging-service listening on port ${port}`);
}
bootstrap().catch((err) => { console.error(err); process.exit(1); });