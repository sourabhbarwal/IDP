import { SYSTEM_PROMPTS } from './system-prompts';

describe('SYSTEM_PROMPTS', () => {
  it('CHAT is a non-empty string mentioning the IDP platform', () => {
    expect(typeof SYSTEM_PROMPTS.CHAT).toBe('string');
    expect(SYSTEM_PROMPTS.CHAT.length).toBeGreaterThan(0);
    expect(SYSTEM_PROMPTS.CHAT).toContain('IDP');
  });

  it('INCIDENT builds a prompt embedding alerts and metrics JSON', () => {
    const prompt = SYSTEM_PROMPTS.INCIDENT('[{"id":1}]', '[{"cpu":50}]');
    expect(prompt).toContain('[{"id":1}]');
    expect(prompt).toContain('[{"cpu":50}]');
    expect(prompt).toContain('incident investigation');
  });

  it('COST builds a prompt embedding cost and services JSON', () => {
    const prompt = SYSTEM_PROMPTS.COST('{"total":100}', '[{"service":"auth"}]');
    expect(prompt).toContain('{"total":100}');
    expect(prompt).toContain('[{"service":"auth"}]');
    expect(prompt).toContain('cost optimisation');
  });

  it('DEPLOYMENT builds a prompt embedding service name and metrics', () => {
    const prompt = SYSTEM_PROMPTS.DEPLOYMENT('auth-service', '{"errorRate":0.01}');
    expect(prompt).toContain('auth-service');
    expect(prompt).toContain('{"errorRate":0.01}');
    expect(prompt).toContain('deployment strategy advisor');
  });
});