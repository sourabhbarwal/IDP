import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiException, buildPageResponse } from '@idp/common';
import {
  ServiceNotFoundError,
  ServiceNameConflictError,
  ServiceAccessDeniedError,
} from '../../domain/exceptions/domain-exceptions';
import { CreateServiceUseCase } from '../../application/use-cases/create-service.use-case';
import { GetServiceUseCase } from '../../application/use-cases/get-service.use-case';
import { ListServicesUseCase } from '../../application/use-cases/list-services.use-case';
import { UpdateServiceUseCase } from '../../application/use-cases/update-service.use-case';
import { DeleteServiceUseCase } from '../../application/use-cases/delete-service.use-case';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../security/permissions.guard';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import { AuthenticatedUser } from '../security/jwt.strategy';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { ListServicesQueryDto } from './dto/list-services-query.dto';

function clientIp(req: Request): string | null {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null;
}

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/services')
export class ServicesController {
  constructor(
    private readonly createService: CreateServiceUseCase,
    private readonly getService: GetServiceUseCase,
    private readonly listServices: ListServicesUseCase,
    private readonly updateService: UpdateServiceUseCase,
    private readonly deleteService: DeleteServiceUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('service:create')
  @ApiOperation({ summary: 'Create a new service in the catalog' })
  @ApiResponse({ status: 201, type: ServiceResponseDto })
  async create(
    @Body() body: CreateServiceRequestDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ServiceResponseDto> {
    try {
      const service = await this.createService.execute({
        name: body.name,
        description: body.description ?? null,
        type: body.type,
        team: body.team ?? null,
        repositoryUrl: body.repositoryUrl ?? null,
        tags: body.tags ?? [],
        actorId: user.userId,
        actorEmail: user.email,
        ipAddress: clientIp(req),
      });
      return ServiceResponseDto.fromDomain(service);
    } catch (err) {
      if (err instanceof ServiceNameConflictError) throw ApiException.conflict(err.message);
      throw err;
    }
  }

  @Get()
  @RequirePermissions('service:read')
  @ApiOperation({ summary: 'List services with optional filters and pagination' })
  async list(@Query() query: ListServicesQueryDto) {
    const result = await this.listServices.execute({
      search: query.search,
      type: query.type,
      status: query.status,
      team: query.team,
      page: query.page,
      size: query.size,
    });
    const dtos = result.items.map(ServiceResponseDto.fromDomain);
    return buildPageResponse(dtos, query.page, query.size, result.total);
  }

  @Get(':id')
  @RequirePermissions('service:read')
  @ApiOperation({ summary: 'Get a service by ID' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async findOne(@Param('id') id: string): Promise<ServiceResponseDto> {
    try {
      const service = await this.getService.execute(id);
      return ServiceResponseDto.fromDomain(service);
    } catch (err) {
      if (err instanceof ServiceNotFoundError) throw ApiException.notFound('Service', id);
      throw err;
    }
  }

  @Put(':id')
  @RequirePermissions('service:update')
  @ApiOperation({ summary: 'Update a service' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateServiceRequestDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ServiceResponseDto> {
    try {
      const service = await this.updateService.execute({
        id,
        ...body,
        actorId: user.userId,
        actorRoles: user.roles,
        ipAddress: clientIp(req),
      });
      return ServiceResponseDto.fromDomain(service);
    } catch (err) {
      if (err instanceof ServiceNotFoundError) throw ApiException.notFound('Service', id);
      if (err instanceof ServiceAccessDeniedError) throw ApiException.forbidden(err.message);
      throw err;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('service:delete')
  @ApiOperation({ summary: 'Soft-delete a service' })
  @ApiResponse({ status: 204 })
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    try {
      await this.deleteService.execute({
        id,
        actorId: user.userId,
        actorRoles: user.roles,
        ipAddress: clientIp(req),
      });
    } catch (err) {
      if (err instanceof ServiceNotFoundError) throw ApiException.notFound('Service', id);
      if (err instanceof ServiceAccessDeniedError) throw ApiException.forbidden(err.message);
      throw err;
    }
  }
}