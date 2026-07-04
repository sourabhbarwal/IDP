import { ApiProperty } from '@nestjs/swagger';
import { AlertRule } from '../../../domain/entities/alert-rule.entity';

export class AlertRuleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string | null;
  @ApiProperty() promqlExpression!: string;
  @ApiProperty() forDuration!: string;
  @ApiProperty() severity!: string;
  @ApiProperty() serviceId!: string | null;
  @ApiProperty() labels!: Record<string, string>;
  @ApiProperty() annotations!: Record<string, string>;
  @ApiProperty() enabled!: boolean;
  @ApiProperty() createdAt!: string;

  static fromDomain(r: AlertRule): AlertRuleResponseDto {
    const dto = new AlertRuleResponseDto();
    dto.id = r.id; dto.name = r.name; dto.description = r.description;
    dto.promqlExpression = r.promqlExpression; dto.forDuration = r.forDuration;
    dto.severity = r.severity; dto.serviceId = r.serviceId;
    dto.labels = r.labels; dto.annotations = r.annotations;
    dto.enabled = r.enabled; dto.createdAt = r.createdAt.toISOString();
    return dto;
  }
}