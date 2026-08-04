import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsIn, IsObject, IsOptional, IsString, IsUUID,
} from 'class-validator';
import { EventType } from '../../../domain/enums/event-type.enum';

export class PublishEventRequestDto {
  @ApiProperty({ enum: EventType })
  @IsEnum(EventType)
  type!: EventType;

  @ApiProperty({ example: { alertName: 'HighErrorRate', severity: 'critical' } })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['info', 'warning', 'critical'] })
  @IsOptional()
  @IsIn(['info', 'warning', 'critical'])
  severity?: 'info' | 'warning' | 'critical';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}