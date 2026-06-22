export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3004),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    issuer: process.env.JWT_ISSUER ?? 'idp-platform',
  },
});