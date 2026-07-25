export interface ThrottlerConfigEntry {
  name: string;
  ttl: number;
  limit: number;
}

export const THROTTLE_CONFIG_GLOBAL: ThrottlerConfigEntry[] = [
  {
    name: 'global',
    ttl: 900_000,
    limit: 100,
  },
];

export const THROTTLE_CONFIG_AUTH: ThrottlerConfigEntry[] = [
  {
    name: 'global',
    ttl: 900_000,
    limit: 100,
  },
  {
    name: 'auth',
    ttl: 900_000,
    limit: 10,
  },
];