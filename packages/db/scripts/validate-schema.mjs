import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schemaPath = resolve(process.cwd(), 'schema.sql');
const schema = readFileSync(schemaPath, 'utf8');

if (!schema.includes('create table organizations')) {
  throw new Error('schema.sql no contiene la tabla organizations');
}

if (!schema.includes('create table users')) {
  throw new Error('schema.sql no contiene la tabla users');
}

if (!schema.includes('create table vouchers')) {
  throw new Error('schema.sql no contiene la tabla vouchers');
}

console.log('schema.sql contiene las tablas base esperadas');
