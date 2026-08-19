function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Refusing to start with a default/guessable value for a security-sensitive setting.`,
    );
  }
  return value;
}

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3008),
  db: {
    host: process.env.DB_HOST ?? 'postgres',        // docker-compose service name
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'idp',
    password: requireEnv('DB_PASSWORD'),
    name: process.env.DB_NAME ?? 'idp',
  },
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    issuer: process.env.JWT_ISSUER ?? 'idp-platform',
  },
  alertManager: {
    url: process.env.ALERTMANAGER_URL ?? 'http://alertmanager:9093', // docker-compose DNS
  },
  webhookToken: requireEnv('WEBHOOK_TOKEN'),
});