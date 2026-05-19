import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL no esta configurada.');
  process.exit(1);
}

const schemaPath = resolve(process.cwd(), 'schema.sql');
const sql = await readFile(schemaPath, 'utf8');
const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query(sql);
  console.log('schema.sql aplicado correctamente sobre la base configurada.');
} catch (error) {
  console.error('No se pudo aplicar schema.sql.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}