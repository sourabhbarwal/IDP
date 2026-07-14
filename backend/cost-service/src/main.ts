import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CostModule } from './cost.module';
import { applySecurity } from '@idp/common';
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(CostModule);
  applySecurity(app);
  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'] });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('IDP — Cost Service')
      .setDescription('Resource cost analytics and rightsizing recommendations')
      .setVersion('0.1.0').addBearerAuth().build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = process.env.PORT ?? 3011;
  await app.listen(port);
  console.log(`cost-service listening on port ${port}`);
}
bootstrap().catch((err) => { console.error(err); process.exit(1); });