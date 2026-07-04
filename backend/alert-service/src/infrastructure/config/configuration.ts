export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3008),
  db: {
    host: process.env.DB_HOST ?? 'postgres',        // docker-compose service name
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'idp',
    password: process.env.DB_PASSWORD ?? '***REMOVED***',
    name: process.env.DB_NAME ?? 'idp',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    issuer: process.env.JWT_ISSUER ?? 'idp-platform',
  },
  alertManager: {
    url: process.env.ALERTMANAGER_URL ?? 'http://alertmanager:9093', // docker-compose DNS
  },
  webhookToken: process.env.WEBHOOK_TOKEN ?? '***REMOVED***',
});