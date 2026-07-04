import { PriceModel } from './price-model.value-object';

describe('PriceModel', () => {
  const model = new PriceModel(0.048, 0.006);

  it('computes hourly cost correctly', () => {
    // 0.5 CPU cores + 256MB memory
    // cpu: 0.5 * 0.048 = 0.024
    // mem: (256/1024) * 0.006 = 0.0015
    // total: 0.0255
    const cost = model.computeHourlyCost(0.5, 256);
    expect(cost).toBeCloseTo(0.0255, 4);
  });

  it('computes monthly cost = hourly * 730 hours', () => {
    const hourly = model.computeHourlyCost(0.1, 128);
    const monthly = model.computeMonthlyCost(0.1, 128);
    expect(monthly).toBeCloseTo(hourly * 730, 1);
  });

  it('returns zero cost for zero resources', () => {
    expect(model.computeHourlyCost(0, 0)).toBe(0);
  });

  it('fromEnv() creates model with defaults when env vars not set', () => {
    const m = PriceModel.fromEnv();
    expect(m.cpuPerVcpuHour).toBe(0.048);
    expect(m.memoryPerGbHour).toBe(0.006);
  });
});