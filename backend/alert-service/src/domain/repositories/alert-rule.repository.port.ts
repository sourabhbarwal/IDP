import { AlertRule } from '../entities/alert-rule.entity';
import { AlertSeverity } from '../enums/alert-severity.enum';

export const ALERT_RULE_REPOSITORY = 'ALERT_RULE_REPOSITORY';

export interface AlertRuleRepository {
  findById(id: string): Promise<AlertRule | null>;
  findByName(name: string): Promise<AlertRule | null>;
  findAll(page: number, size: number, serviceId?: string | null): Promise<{ items: AlertRule[]; total: number }>;
  findEnabled(): Promise<AlertRule[]>;
  existsByName(name: string): Promise<boolean>;
  create(params: {
    name: string;
    description: string | null;
    promqlExpression: string;
    forDuration: string;
    severity: AlertSeverity;
    serviceId: string | null;
    labels: Record<string, string>;
    annotations: Record<string, string>;
    createdBy: string;
  }): Promise<AlertRule>;
  update(id: string, params: Partial<{
    description: string | null;
    promqlExpression: string;
    forDuration: string;
    severity: AlertSeverity;
    labels: Record<string, string>;
    annotations: Record<string, string>;
    enabled: boolean;
  }>): Promise<AlertRule>;
  delete(id: string): Promise<void>;
}