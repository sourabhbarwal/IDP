export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3002),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'idp',
    password: process.env.DB_PASSWORD ?? '***REMOVED***',
    name: process.env.DB_NAME ?? 'idp',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    issuer: process.env.JWT_ISSUER ?? 'idp-platform',
  },
});