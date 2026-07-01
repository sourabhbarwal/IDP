export enum EnvironmentName {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * Maps a full environment name to the short prefix used in Kubernetes
 * namespaces: dev-<service>, staging-<service>, prod-<service>.
 */
export function namespacePrefix(env: EnvironmentName): string {
  const map: Record<EnvironmentName, string> = {
    [EnvironmentName.DEVELOPMENT]: 'dev',
    [EnvironmentName.TESTING]: 'test',
    [EnvironmentName.STAGING]: 'staging',
    [EnvironmentName.PRODUCTION]: 'prod',
  };
  return map[env];
}

/** Defines the promotion order: dev -> test -> staging -> prod */
export const PROMOTION_ORDER: EnvironmentName[] = [
  EnvironmentName.DEVELOPMENT,
  EnvironmentName.TESTING,
  EnvironmentName.STAGING,
  EnvironmentName.PRODUCTION,
];

export function nextEnvironment(current: EnvironmentName): EnvironmentName | null {
  const idx = PROMOTION_ORDER.indexOf(current);
  if (idx === -1 || idx === PROMOTION_ORDER.length - 1) return null;
  return PROMOTION_ORDER[idx + 1];
}