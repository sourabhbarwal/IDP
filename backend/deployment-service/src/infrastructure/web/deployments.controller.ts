import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiException, buildPageResponse } from '@idp/common';
import {
  CannotPromoteError,
  DeploymentNotFoundError,
  KubernetesOperationError,
  NoPreviousDeploymentError,
} from '../../domain/exceptions/domain-exceptions';
import { EnvironmentName } from '../../domain/enums/environment-name.enum';
import { CreateDeploymentUseCase } from '../../application/use-cases/create-deployment.use-case';
import { RollbackDeploymentUseCase } from '../../application/use-cases/rollback-deployment.use-case';
import { PromoteDeploymentUseCase } from '../../application/use-cases/promote-deployment.use-case';
import { GetDeploymentUseCase } from '../../application/use-cases/get-deployment.use-case';
import { ListDeploymentsUseCase } from '../../application/use-cases/list-deployments.use-case';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../security/permissions.guard';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import { AuthenticatedUser } from '../security/jwt.strategy';
import { CreateDeploymentRequestDto } from './dto/create-deployment-request.dto';
import { PromoteDeploymentRequestDto } from './dto/promote-deployment-request.dto';
import { DeploymentResponseDto } from './dto/deployment-response.dto';

function clientIp(req: Request): string | null {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null;
}

@ApiTags('deployments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/deployments')
export class DeploymentsController {
  constructor(
    private readonly createDeployment: CreateDeploymentUseCase,
    private readonly rollbackDeployment: RollbackDeploymentUseCase,
    private readonly promoteDeployment: PromoteDeploymentUseCase,
    private readonly getDeployment: GetDeploymentUseCase,
    private readonly listDeployments: ListDeploymentsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('deployment:create')
  @ApiOperation({ summary: 'Trigger a deployment (rolling, blue-green, or canary)' })
  @ApiResponse({ status: 201, type: DeploymentResponseDto })
  async create(
    @Body() body: CreateDeploymentRequestDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeploymentResponseDto> {
    try {
      const deployment = await this.createDeployment.execute({
        serviceId: body.serviceId,
        serviceName: body.serviceName,
        environment: body.environment,
        imageTag: body.imageTag,
        strategy: body.strategy,
        replicas: body.replicas ?? 1,
        containerPort: body.containerPort ?? 3000,
        canaryWeight: body.canaryWeight ?? null,
        actorId: user.userId,
        ipAddress: clientIp(req),
      });
      return DeploymentResponseDto.fromDomain(deployment);
    } catch (err) {
      if (err instanceof KubernetesOperationError) throw ApiException.badRequest(err.message);
      throw err;
    }
  }

  @Post(':id/rollback')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('deployment:rollback')
  @ApiOperation({ summary: 'Roll back a deployment to its previous image' })
  @ApiResponse({ status: 201, type: DeploymentResponseDto })
  async rollback(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeploymentResponseDto> {
    try {
      const deployment = await this.rollbackDeployment.execute({
        deploymentId: id,
        actorId: user.userId,
        ipAddress: clientIp(req),
      });
      return DeploymentResponseDto.fromDomain(deployment);
    } catch (err) {
      if (err instanceof DeploymentNotFoundError) throw ApiException.notFound('Deployment', id);
      if (err instanceof NoPreviousDeploymentError) throw ApiException.badRequest(err.message);
      if (err instanceof KubernetesOperationError) throw ApiException.badRequest(err.message);
      throw err;
    }
  }

  @Post(':id/promote')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('deployment:promote')
  @ApiOperation({ summary: 'Promote a successful deployment to the next environment' })
  @ApiResponse({ status: 201, type: DeploymentResponseDto })
  async promote(
    @Param('id') id: string,
    @Body() body: PromoteDeploymentRequestDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeploymentResponseDto> {
    try {
      const deployment = await this.promoteDeployment.execute({
        deploymentId: id,
        containerPort: body.containerPort ?? 3000,
        actorId: user.userId,
        ipAddress: clientIp(req),
      });
      return DeploymentResponseDto.fromDomain(deployment);
    } catch (err) {
      if (err instanceof DeploymentNotFoundError) throw ApiException.notFound('Deployment', id);
      if (err instanceof CannotPromoteError) throw ApiException.badRequest(err.message);
      if (err instanceof KubernetesOperationError) throw ApiException.badRequest(err.message);
      throw err;
    }
  }

  @Get(':id')
  @RequirePermissions('service:read')
  @ApiOperation({ summary: 'Get a deployment by ID' })
  @ApiResponse({ status: 200, type: DeploymentResponseDto })
  async findOne(@Param('id') id: string): Promise<DeploymentResponseDto> {
    try {
      const deployment = await this.getDeployment.execute(id);
      return DeploymentResponseDto.fromDomain(deployment);
    } catch (err) {
      if (err instanceof DeploymentNotFoundError) throw ApiException.notFound('Deployment', id);
      throw err;
    }
  }

  @Get()
  @RequirePermissions('service:read')
  @ApiOperation({ summary: 'List deployment history with optional filters' })
  async list(
    @Query('serviceId') serviceId?: string,
    @Query('environment') environment?: EnvironmentName,
    @Query('page') page = 0,
    @Query('size') size = 20,
  ) {
    const result = await this.listDeployments.execute({
      serviceId, environment, page: Number(page), size: Number(size),
    });
    return buildPageResponse(
      result.items.map(DeploymentResponseDto.fromDomain),
      Number(page),
      Number(size),
      result.total,
    );
  }
}