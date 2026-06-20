import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType } from '../../../domain/enums/service-type.enum';
import { ServiceStatus } from '../../../domain/enums/service-status.enum';

export class ListServicesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: ServiceType }) @IsOptional() @IsEnum(ServiceType) type?: ServiceType;
  @ApiPropertyOptional({ enum: ServiceStatus }) @IsOptional() @IsEnum(ServiceStatus) status?: ServiceStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() team?: string;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  page: number = 0;

  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  size: number = 20;
}