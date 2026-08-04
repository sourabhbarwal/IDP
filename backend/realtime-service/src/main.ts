import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RealtimeModule } from './realtime.module';
import { GlobalExceptionFilter, applySecurity } from '@idp/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(RealtimeModule);

  applySecurity(app);

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:5173',
      'http://localhost',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('IDP — Realtime Service')
      .setDescription('WebSocket gateway for real-time platform notifications')
      .setVersion('0.1.0')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = process.env.PORT ?? 3013;
  await app.listen(port);
  console.log(`realtime-service listening on port ${port}`);
}

bootstrap().catch((err) => { console.error(err); process.exit(1); });