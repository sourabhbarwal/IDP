import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DoraModule } from './dora.module';
import { GlobalExceptionFilter, applySecurity } from '@idp/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(DoraModule);

  applySecurity(app);

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:5173',
      'http://localhost',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('IDP — DORA Metrics Service')
      .setDescription('Deployment Frequency, Lead Time, Change Failure Rate, MTTR')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = process.env.PORT ?? 3014;
  await app.listen(port);
  console.log(`dora-service listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start dora-service:', err);
  process.exit(1);
});