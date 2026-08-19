function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Refusing to start with a default/guessable value for a security-sensitive setting.`);
  }
  return value;
}
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USERNAME ?? 'idp',
    password: requireEnv('DB_PASSWORD'),
    database: process.env.DB_NAME ?? 'idp',
  });

  try {
    await client.connect();
    await client.query('CREATE SCHEMA IF NOT EXISTS repository;');
    console.log('Database schema "repository" checked/created.');
  } catch (error) {
    console.error('Error during pre-migration schema check:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
