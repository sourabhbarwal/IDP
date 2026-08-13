import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiException, buildPageResponse } from '@idp/common';
import {
  RepositoryAlreadyExistsError,
  RepositoryNotFoundError,
  GitHubProvisioningError,
} from '../../domain/exceptions/domain-exceptions';
import { RepositoryVisibility } from '../../domain/enums/repository-visibility.enum';
import { ProvisionRepositoryUseCase } from '../../application/use-cases/provision-repository.use-case';
import { GetRepositoryUseCase } from '../../application/use-cases/get-repository.use-case';
import { ListRepositoriesUseCase } from '../../application/use-cases/list-repositories.use-case';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../security/permissions.guard';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import { AuthenticatedUser } from '../security/jwt.strategy';
import { ProvisionRepositoryRequestDto } from './dto/provision-repository-request.dto';
import { RepositoryResponseDto } from './dto/repository-response.dto';
import { ConfigService } from '@nestjs/config';

function clientIp(req: Request): string | null {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null;
}

@ApiTags('repositories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/repositories')
export class RepositoriesController {
  constructor(
    private readonly provisionRepository: ProvisionRepositoryUseCase,
    private readonly getRepository: GetRepositoryUseCase,
    private readonly listRepositories: ListRepositoriesUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('repository:provision')
  @ApiOperation({ summary: 'Provision a GitHub repository for a service' })
  @ApiResponse({ status: 201, type: RepositoryResponseDto })
  async provision(
    @Body() body: ProvisionRepositoryRequestDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RepositoryResponseDto> {
    try {
      const repo = await this.provisionRepository.execute({
        serviceId: body.serviceId,
        serviceName: body.serviceName,
        serviceType: body.serviceType,
        description: body.description ?? '',
        visibility: body.visibility ?? RepositoryVisibility.PRIVATE,
        actorId: user.userId,
        actorEmail: user.email,
        githubOwner: this.config.get<string>('github.owner') ?? '',
        ipAddress: clientIp(req),
      });
      return RepositoryResponseDto.fromDomain(repo);
    } catch (err) {
      if (err instanceof RepositoryAlreadyExistsError) throw ApiException.conflict(err.message);
      if (err instanceof GitHubProvisioningError) throw ApiException.badRequest(err.message);
      throw err;
    }
  }

  @Get()
  @RequirePermissions('repository:provision')
  @ApiOperation({ summary: 'List all provisioned repositories' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  async list(@Query('page') page = 0, @Query('size') size = 20) {
    const result = await this.listRepositories.execute(Number(page), Number(size));
    return buildPageResponse(result.items.map(RepositoryResponseDto.fromDomain), Number(page), Number(size), result.total);
  }

  @Get('by-service/:serviceId')
  @RequirePermissions('service:read')
  @ApiOperation({ summary: 'Get repository by service ID' })
  @ApiResponse({ status: 200, type: RepositoryResponseDto })
  async getByServiceId(
    @Param('serviceId', new ParseUUIDPipe()) serviceId: string,
  ): Promise<RepositoryResponseDto> {
    try {
      const repo = await this.getRepository.executeByServiceId(serviceId);
      return RepositoryResponseDto.fromDomain(repo);
    } catch (err) {
      if (err instanceof RepositoryNotFoundError) throw ApiException.notFound('Repository', serviceId);
      throw err;
    }
  }

  @Get(':id')
  @RequirePermissions('service:read')
  @ApiOperation({ summary: 'Get repository by ID' })
  @ApiResponse({ status: 200, type: RepositoryResponseDto })
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RepositoryResponseDto> {
    try {
      const repo = await this.getRepository.executeById(id);
      return RepositoryResponseDto.fromDomain(repo);
    } catch (err) {
      if (err instanceof RepositoryNotFoundError) throw ApiException.notFound('Repository', id);
      throw err;
    }
  }
}