const { Client } = require('pg');
const c = new Client({
  host: 'localhost',
  port: 5432,
  user: 'idp',
  password: '***REMOVED***',
  database: 'idp',
});
c.connect()
  .then(() => c.query('CREATE SCHEMA IF NOT EXISTS auth'))
  .then(() => c.query('CREATE SCHEMA IF NOT EXISTS catalog'))
  .then(() => c.query('CREATE SCHEMA IF NOT EXISTS repository'))
  .then(() => c.query('CREATE SCHEMA IF NOT EXISTS deployment'))
  .then(() => c.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))
  .then(() => { console.log('All schemas and extension created.'); return c.end(); })
  .catch((err) => { console.error(err); process.exit(1); });
