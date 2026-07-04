export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3011),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    issuer: process.env.JWT_ISSUER ?? 'idp-platform',
  },
  prometheusUrl: process.env.PROMETHEUS_URL ?? 'http://prometheus:9090',
  pricing: {
    cpuPerVcpuHour: parseFloat(process.env.PRICE_CPU_PER_VCPU_HOUR ?? '0.048'),
    memoryPerGbHour: parseFloat(process.env.PRICE_MEMORY_PER_GB_HOUR ?? '0.006'),
  },
});
