import { AlertRule } from './alert-rule.entity';
import { AlertSeverity } from '../enums/alert-severity.enum';

function makeRule(overrides: Partial<ConstructorParameters<typeof AlertRule>[0]> = {}): AlertRule {
  return new AlertRule({
    id: 'r-1', name: 'HighErrorRate',
    description: 'Error rate too high',
    promqlExpression: 'sum(rate(http_requests_total{status=~"5.."}[5m])) > 0.05',
    forDuration: '5m', severity: AlertSeverity.CRITICAL,
    serviceId: 's-1', labels: { team: 'platform' },
    annotations: { summary: 'High error rate' },
    enabled: true, createdBy: 'u-1',
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  });
}

describe('AlertRule domain entity', () => {
  it('toPrometheusRule() returns correct format', () => {
    const rule = makeRule();
    const promRule = rule.toPrometheusRule() as Record<string, unknown>;
    expect(promRule['alert']).toBe('HighErrorRate');
    expect(promRule['expr']).toBe(rule.promqlExpression);
    expect(promRule['for']).toBe('5m');
    expect((promRule['labels'] as Record<string, string>)['severity']).toBe('critical');
  });

  it('toPrometheusRule() merges custom labels with severity', () => {
    const rule = makeRule({ labels: { team: 'platform', env: 'dev' } });
    const promRule = rule.toPrometheusRule() as Record<string, unknown>;
    const labels = promRule['labels'] as Record<string, string>;
    expect(labels['team']).toBe('platform');
    expect(labels['env']).toBe('dev');
    expect(labels['severity']).toBe('critical');
  });

  it('uses name as summary when description is null', () => {
    const rule = makeRule({ description: null, annotations: {} });
    const promRule = rule.toPrometheusRule() as Record<string, unknown>;
    const annotations = promRule['annotations'] as Record<string, string>;
    expect(annotations['summary']).toBe('HighErrorRate');
  });
});