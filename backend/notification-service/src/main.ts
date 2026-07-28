import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NotificationModule } from './notification.module';
import { applySecurity } from  '@idp/common';
import { initTracing } from '@idp/common';

initTracing('notification-service');
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(NotificationModule);
  applySecurity(app);
  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'] });
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder().setTitle('IDP — Notification Service').setDescription('Multi-channel alert delivery (Slack, Email, Webhook)').setVersion('0.1.0').build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  const port = process.env.PORT ?? 3009;
  await app.listen(port);
  console.log(`notification-service listening on port ${port}`);
}
bootstrap().catch((err) => { console.error(err); process.exit(1); });