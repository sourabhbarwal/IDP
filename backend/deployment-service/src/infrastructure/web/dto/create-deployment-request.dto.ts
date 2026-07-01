import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { DeploymentStrategy } from '../../../domain/enums/deployment-strategy.enum';
import { EnvironmentName } from '../../../domain/enums/environment-name.enum';

export class CreateDeploymentRequestDto {
  @ApiProperty() @IsUUID() serviceId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() serviceName!: string;
  @ApiProperty({ enum: EnvironmentName }) @IsEnum(EnvironmentName) environment!: EnvironmentName;
  @ApiProperty({ example: 'a1b2c3d' }) @IsString() @IsNotEmpty() imageTag!: string;
  @ApiProperty({ enum: DeploymentStrategy, default: DeploymentStrategy.ROLLING })
  @IsEnum(DeploymentStrategy)
  strategy!: DeploymentStrategy;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) @Max(10) replicas?: number;
  @ApiPropertyOptional({ default: 3000 }) @IsOptional() @IsInt() @Min(1024) @Max(65535) containerPort?: number;
  @ApiPropertyOptional({ description: 'Canary traffic percent (canary strategy only)', default: 20 })
  @IsOptional() @IsInt() @Min(1) @Max(99)
  canaryWeight?: number;
}