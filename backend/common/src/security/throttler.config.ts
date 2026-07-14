import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Standard throttle configs used across all IDP Platform services.
 * Uses @nestjs/throttler v6's named-throttler object format.
 *
 * `satisfies` validates the shape against ThrottlerModuleOptions without
 * widening these constants to the full union type — so `.throttlers` stays
 * directly accessible on the inferred literal type.
 *
 * GLOBAL: 100 requests per 15 minutes per IP.
 * AUTH:   adds a stricter named throttler for auth endpoints (10/15min).
 */
export const THROTTLE_CONFIG_GLOBAL = {
  throttlers: [
    {
      name: 'global',
      ttl: 900_000, // 15 minutes in ms
      limit: 100,
    },
  ],
} satisfies ThrottlerModuleOptions;

export const THROTTLE_CONFIG_AUTH = {
  throttlers: [
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
  ],
} satisfies ThrottlerModuleOptions;