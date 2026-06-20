import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ServiceType } from '../../../domain/enums/service-type.enum';
import { ServiceStatus } from '../../../domain/enums/service-status.enum';

export class UpdateServiceRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiPropertyOptional({ enum: ServiceType }) @IsOptional() @IsEnum(ServiceType) type?: ServiceType;
  @ApiPropertyOptional({ enum: ServiceStatus }) @IsOptional() @IsEnum(ServiceStatus) status?: ServiceStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) team?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() repositoryUrl?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}