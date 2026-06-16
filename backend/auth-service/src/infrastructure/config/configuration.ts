export interface AppConfig {
  nodeEnv: string;
  port: number;
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    schema: string;
  };
  jwt: {
    secret: string;
    issuer: string;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'idp',
    password: process.env.DB_PASSWORD ?? '***REMOVED***',
    name: process.env.DB_NAME ?? 'idp',
    schema: process.env.DB_SCHEMA ?? 'auth',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '***REMOVED***',
    issuer: process.env.JWT_ISSUER ?? 'idp-platform',
    accessTokenTtlSeconds: Number(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS ?? 900),
    refreshTokenTtlSeconds: Number(process.env.JWT_REFRESH_TOKEN_TTL_SECONDS ?? 604800),
  },
});
