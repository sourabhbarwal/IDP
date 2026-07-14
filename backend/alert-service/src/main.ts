import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AlertModule } from './alert.module';
import { GlobalExceptionFilter, applySecurity } from '@idp/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AlertModule);
  applySecurity(app);
  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'], credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder().setTitle('IDP — Alert Service').setDescription('Alert rules management and AlertManager integration').setVersion('0.1.0').addBearerAuth().build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  const port = process.env.PORT ?? 3008;
  await app.listen(port);
  console.log(`alert-service listening on port ${port}`);
}
bootstrap().catch((err) => { console.error(err); process.exit(1); });