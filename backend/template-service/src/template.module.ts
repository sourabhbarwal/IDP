import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import configuration from './infrastructure/config/configuration';
import { JwtStrategy } from './infrastructure/security/jwt.strategy';
import { TemplateRegistryService } from './application/services/template-registry.service';
import { ZipBuilderService } from './application/services/zip-builder.service';
import { ListTemplatesUseCase } from './application/use-cases/list-templates.use-case';
import { GenerateTemplateUseCase } from './application/use-cases/generate-template.use-case';
import { TemplatesController } from './infrastructure/web/templates.controller';
import { HealthController } from './infrastructure/web/health.controller';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TemplatesController, HealthController],
  providers: [
    JwtStrategy,
    TemplateRegistryService,
    ZipBuilderService,
    ListTemplatesUseCase,
    GenerateTemplateUseCase,
  ],
})
export class TemplateModule {}