function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Refusing to start with a default/guessable value for a security-sensitive setting.`);
  }
  return value;
}
import * as fs from 'fs';
import * as path from 'path';

function loadKey(envVarPath: string | undefined): string | undefined {
  if (!envVarPath) return undefined;
  const resolved = path.resolve(envVarPath);
  if (fs.existsSync(resolved)) {
    return fs.readFileSync(resolved, 'utf8');
  }
  return undefined;
}

export default () => {
  const algorithm = process.env.JWT_ALGORITHM ?? 'HS256';
  const privateKey = loadKey(process.env.JWT_PRIVATE_KEY_PATH);
  const publicKey  = loadKey(process.env.JWT_PUBLIC_KEY_PATH);

  return {
    nodeEnv:   process.env.NODE_ENV ?? 'development',
    port:      Number(process.env.PORT ?? 3001),
    db: {
      host:     process.env.DB_HOST     ?? 'pgbouncer',
      port:     Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'idp',
      password: requireEnv('DB_PASSWORD'),
      name:     process.env.DB_NAME     ?? 'idp',
    },
    jwt: {
      algorithm,
      secret:     algorithm === 'HS256' ? (process.env.JWT_SECRET ?? 'change-me') : undefined,
      privateKey: algorithm === 'RS256' ? privateKey : undefined,
      publicKey:  algorithm === 'RS256' ? publicKey  : undefined,
      issuer:     process.env.JWT_ISSUER ?? 'idp-platform',
      accessTokenTtl:  Number(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS  ?? 900),
      refreshTokenTtl: Number(process.env.JWT_REFRESH_TOKEN_TTL_SECONDS ?? 604800),
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
    },
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
  };
};