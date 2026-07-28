import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingModule } from './logging.module';
import { applySecurity } from '@idp/common';
import { initTracing } from '@idp/common';

initTracing('logging-module');
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(LoggingModule);
  applySecurity(app);
  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'] });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('IDP — Logging Service')
      .setDescription('Loki log query proxy for IDP Platform services')
      .setVersion('0.1.0').addBearerAuth().build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = process.env.PORT ?? 3007;
  await app.listen(port);
  console.log(`logging-service listening on port ${port}`);
}
bootstrap().catch((err) => { console.error(err); process.exit(1); });