import { Inject, Injectable } from '@nestjs/common';
import {
  ALERT_RULE_REPOSITORY,
  AlertRuleRepository,
} from '../../domain/repositories/alert-rule.repository.port';

@Injectable()
export class ListAlertRulesUseCase {
  constructor(@Inject(ALERT_RULE_REPOSITORY) private readonly repo: AlertRuleRepository) {}

  async execute(page: number, size: number, serviceId?: string | null) {
    return this.repo.findAll(page, Math.min(size, 100), serviceId ?? null);
  }
}