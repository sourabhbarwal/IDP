function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Refusing to start with a default/guessable value for a security-sensitive setting.`);
  }
  return value;
}
export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3005),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'idp',
    password: requireEnv('DB_PASSWORD'),
    name: process.env.DB_NAME ?? 'idp',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    issuer: process.env.JWT_ISSUER ?? 'idp-platform',
  },
  kubeconfigPath: process.env.KUBECONFIG_PATH ?? '',
  imageRegistry: process.env.IMAGE_REGISTRY ?? 'idp-platform',
});