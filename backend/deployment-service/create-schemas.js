const { Client } = require('pg');

const password = process.env.DB_PASSWORD;
if (!password) {
  console.error(
    'Missing required environment variable: DB_PASSWORD. ' +
    'Set it before running this script, e.g.:\n' +
    '  $env:DB_PASSWORD="your-password"; node create-schemas.js   (PowerShell)\n' +
    '  DB_PASSWORD=your-password node create-schemas.js            (bash)',
  );
  process.exit(1);
}

const c = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'idp',
  password,
  database: process.env.DB_NAME || 'idp',
});

c.connect()
  .then(() => c.query('CREATE SCHEMA IF NOT EXISTS auth'))
  .then(() => c.query('CREATE SCHEMA IF NOT EXISTS catalog'))
  .then(() => c.query('CREATE SCHEMA IF NOT EXISTS repository'))
  .then(() => c.query('CREATE SCHEMA IF NOT EXISTS deployment'))
  .then(() => c.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))
  .then(() => { console.log('All schemas and extension created.'); return c.end(); })
  .catch((err) => { console.error(err); process.exit(1); });