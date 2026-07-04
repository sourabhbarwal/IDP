import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { AlertSeverity } from '../../../domain/enums/alert-severity.enum';

export class CreateAlertRuleRequestDto {
  @ApiProperty({ example: 'HighErrorRate' }) @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ example: 'sum(rate(http_requests_total{status=~"5.."}[5m])) > 0.05' })
  @IsString() @IsNotEmpty() promqlExpression!: string;
  @ApiPropertyOptional({ example: '5m', default: '5m' }) @IsOptional() @IsString() forDuration?: string;
  @ApiProperty({ enum: AlertSeverity }) @IsEnum(AlertSeverity) severity!: AlertSeverity;
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceId?: string;
  @ApiPropertyOptional({ default: {} }) @IsOptional() @IsObject() labels?: Record<string, string>;
  @ApiPropertyOptional({ default: {} }) @IsOptional() @IsObject() annotations?: Record<string, string>;
}