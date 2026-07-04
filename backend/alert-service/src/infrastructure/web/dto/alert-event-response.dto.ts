import { ApiProperty } from '@nestjs/swagger';
import { AlertEvent } from '../../../domain/entities/alert-event.entity';

export class AlertEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() alertName!: string;
  @ApiProperty() severity!: string;
  @ApiProperty() status!: string;
  @ApiProperty() namespace!: string | null;
  @ApiProperty() labels!: Record<string, string>;
  @ApiProperty() annotations!: Record<string, string>;
  @ApiProperty() startsAt!: string;
  @ApiProperty() endsAt!: string | null;
  @ApiProperty() acknowledgedBy!: string | null;
  @ApiProperty() durationMs!: number;

  static fromDomain(e: AlertEvent): AlertEventResponseDto {
    const dto = new AlertEventResponseDto();
    dto.id = e.id; dto.alertName = e.alertName; dto.severity = e.severity;
    dto.status = e.status; dto.namespace = e.namespace; dto.labels = e.labels;
    dto.annotations = e.annotations; dto.startsAt = e.startsAt.toISOString();
    dto.endsAt = e.endsAt?.toISOString() ?? null; dto.acknowledgedBy = e.acknowledgedBy;
    dto.durationMs = e.durationMs();
    return dto;
  }
}