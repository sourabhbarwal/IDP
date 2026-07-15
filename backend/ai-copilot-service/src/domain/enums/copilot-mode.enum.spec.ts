import { CopilotMode } from './copilot-mode.enum';

describe('CopilotMode', () => {
  it('has all four expected modes', () => {
    expect(CopilotMode.CHAT).toBe('CHAT');
    expect(CopilotMode.INCIDENT).toBe('INCIDENT');
    expect(CopilotMode.COST).toBe('COST');
    expect(CopilotMode.DEPLOYMENT).toBe('DEPLOYMENT');
  });

  it('has exactly four members', () => {
    expect(Object.keys(CopilotMode)).toHaveLength(4);
  });
});