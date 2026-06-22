import {
  Controller, Get, Param, Query, Res, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiException } from '@idp/common';
import { TemplateNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { ListTemplatesUseCase } from '../../application/use-cases/list-templates.use-case';
import { GenerateTemplateUseCase } from '../../application/use-cases/generate-template.use-case';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import { AuthenticatedUser } from '../security/jwt.strategy';
import { GenerateTemplateRequestDto } from './dto/generate-template-request.dto';
import { TemplateResponseDto } from './dto/template-response.dto';

@ApiTags('templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/templates')
export class TemplatesController {
  constructor(
    private readonly listTemplatesUseCase: ListTemplatesUseCase,
    private readonly generateTemplateUseCase: GenerateTemplateUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all available project templates' })
  @ApiResponse({ status: 200, type: [TemplateResponseDto] })
  list(): TemplateResponseDto[] {
    return this.listTemplatesUseCase.execute().map(TemplateResponseDto.fromDomain);
  }

  @Get(':type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get metadata for a specific template type' })
  @ApiResponse({ status: 200, type: TemplateResponseDto })
  getOne(@Param('type') type: string): TemplateResponseDto {
    try {
      const templates = this.listTemplatesUseCase.execute();
      const found = templates.find((t) => t.type === type.toUpperCase());
      if (!found) throw new TemplateNotFoundError(type);
      return TemplateResponseDto.fromDomain(found);
    } catch (err) {
      if (err instanceof TemplateNotFoundError) throw ApiException.notFound('Template', type);
      throw err;
    }
  }

  @Get(':type/generate')
  @ApiOperation({ summary: 'Generate a project from a template and download as zip' })
  @ApiProduces('application/zip')
  @ApiResponse({ status: 200, description: 'Zip file containing the generated project' })
  async generate(
    @Param('type') type: string,
    @Query() query: GenerateTemplateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const normalizedName = (query.serviceName || 'my-service')
        .trim().toLowerCase().replace(/\s+/g, '-');

      const zipBuffer = await this.generateTemplateUseCase.execute({
        templateType: type.toUpperCase(),
        params: {
          serviceName: normalizedName,
          description: query.description ?? `${normalizedName} service`,
          port: query.port ?? 3000,
          packageName: query.packageName ?? 'com.example',
          author: query.author ?? user.email,
          authorEmail: query.authorEmail ?? user.email,
        },
      });

      const filename = `${normalizedName}-${type.toLowerCase()}-template.zip`;
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length,
      });
      res.end(zipBuffer);
    } catch (err) {
      if (err instanceof TemplateNotFoundError) throw ApiException.notFound('Template', type);
      throw err;
    }
  }
}