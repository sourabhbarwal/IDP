import { Inject, Injectable } from '@nestjs/common';
import { AlertEvent } from '../../domain/entities/alert-event.entity';
import {
  ALERT_EVENT_REPOSITORY,
  AlertEventRepository,
} from '../../domain/repositories/alert-event.repository.port';

@Injectable()
export class GetActiveAlertsUseCase {
  constructor(@Inject(ALERT_EVENT_REPOSITORY) private readonly repo: AlertEventRepository) {}

  async execute(): Promise<AlertEvent[]> {
    return this.repo.findActive();
  }
}