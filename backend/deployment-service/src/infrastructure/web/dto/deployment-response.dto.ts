import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Deployment } from '../../../domain/entities/deployment.entity';

export class DeploymentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() serviceId!: string;
  @ApiProperty() serviceName!: string;
  @ApiProperty() environment!: string;
  @ApiProperty() namespace!: string;
  @ApiProperty() imageTag!: string;
  @ApiProperty() strategy!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() previousImageTag!: string | null;
  @ApiProperty() replicas!: number;
  @ApiPropertyOptional() canaryWeight!: number | null;
  @ApiPropertyOptional() errorMessage!: string | null;
  @ApiProperty() triggeredBy!: string;
  @ApiProperty() startedAt!: string;
  @ApiPropertyOptional() completedAt!: string | null;
  @ApiPropertyOptional() durationMs!: number | null;

  static fromDomain(d: Deployment): DeploymentResponseDto {
    const dto = new DeploymentResponseDto();
    dto.id = d.id;
    dto.serviceId = d.serviceId;
    dto.serviceName = d.serviceName;
    dto.environment = d.environment;
    dto.namespace = d.namespace;
    dto.imageTag = d.imageTag;
    dto.strategy = d.strategy;
    dto.status = d.status;
    dto.previousImageTag = d.previousImageTag;
    dto.replicas = d.replicas;
    dto.canaryWeight = d.canaryWeight;
    dto.errorMessage = d.errorMessage;
    dto.triggeredBy = d.triggeredBy;
    dto.startedAt = d.startedAt.toISOString();
    dto.completedAt = d.completedAt?.toISOString() ?? null;
    dto.durationMs = d.durationMs();
    return dto;
  }
}