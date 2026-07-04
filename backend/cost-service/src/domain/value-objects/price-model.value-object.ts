/**
 * PriceModel — encapsulates the pricing rates used for cost estimation.
 * Rates are based on AWS t3.medium equivalent (us-east-1, on-demand).
 * Can be overridden via environment variables.
 */
export class PriceModel {
  /** Cost per vCPU-hour in USD */
  readonly cpuPerVcpuHour: number;
  /** Cost per GB of memory per hour in USD */
  readonly memoryPerGbHour: number;

  constructor(cpuPerVcpuHour: number, memoryPerGbHour: number) {
    this.cpuPerVcpuHour = cpuPerVcpuHour;
    this.memoryPerGbHour = memoryPerGbHour;
  }

  /**
   * Compute hourly cost for given CPU cores and memory MB.
   * Formula: (cpuCores * cpuRate) + ((memoryMb / 1024) * memoryRate)
   */
  computeHourlyCost(cpuCores: number, memoryMb: number): number {
    const cpuCost = cpuCores * this.cpuPerVcpuHour;
    const memoryCost = (memoryMb / 1024) * this.memoryPerGbHour;
    return Math.round((cpuCost + memoryCost) * 10000) / 10000; // 4 decimal places
  }

  computeMonthlyCost(cpuCores: number, memoryMb: number): number {
    return Math.round(this.computeHourlyCost(cpuCores, memoryMb) * 730 * 100) / 100; // 730h/month
  }

  static fromEnv(): PriceModel {
    const cpuRate = parseFloat(process.env.PRICE_CPU_PER_VCPU_HOUR ?? '0.048');
    const memRate = parseFloat(process.env.PRICE_MEMORY_PER_GB_HOUR ?? '0.006');
    return new PriceModel(cpuRate, memRate);
  }
}