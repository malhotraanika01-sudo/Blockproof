// Applies the hand-written DBMS artifacts (constraints, indexes, views,
// functions, triggers) after `prisma migrate`. Run: npm run db:apply-sql
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Order matters: constraints/indexes first, then objects that may depend on them.
const FILES = [
  '01_constraints.sql',
  '02_indexes.sql',
  '03_views.sql',
  '05_functions.sql',
  '06_triggers.sql',
];

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    for (const file of FILES) {
      const sql = readFileSync(join(__dirname, 'sql', file), 'utf8');
      process.stdout.write(`  applying ${file} ... `);
      await client.query(sql); // node-postgres runs multi-statement strings
      console.log('ok');
    }
    console.log('\nDBMS artifacts applied.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\napply-sql failed:', err.message);
  process.exit(1);
});
