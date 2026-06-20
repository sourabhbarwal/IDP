import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USERNAME ?? 'idp',
    password: process.env.DB_PASSWORD ?? '***REMOVED***',
    database: process.env.DB_NAME ?? 'idp',
  });

  try {
    await client.connect();
    await client.query('CREATE SCHEMA IF NOT EXISTS catalog;');
    await client.query('CREATE SCHEMA IF NOT EXISTS auth;');
    console.log('Database schemas "catalog" and "auth" checked/created.');
  } catch (error) {
    console.error('Error during pre-migration schema check:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
