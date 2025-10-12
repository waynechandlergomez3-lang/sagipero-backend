// Simple script to check whether the Article table exists in the configured Postgres DB
// Loads backend/.env via dotenv if present, then connects using pg and queries to_regclass
const path = require('path');
const fs = require('fs');
const dotenvPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL;
console.log('Using DATABASE_URL:', connectionString);
if (!connectionString) {
  console.error('No DATABASE_URL found in environment or backend/.env');
  process.exit(2);
}

async function main() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    // Check to_regclass for the Article table
    const res = await client.query("SELECT to_regclass('public.\"Article\"') as regclass, table_schema, table_name FROM information_schema.tables WHERE table_name = 'Article' OR table_name = 'article';");
    console.log('to_regclass result and information_schema.rows:');
    console.log(res.rows);

    // If to_regclass null -> not present
    const reg = await client.query("SELECT to_regclass('public.\"Article\"') as regclass");
    console.log('to_regclass(public."Article") =>', reg.rows[0].regclass);

    // List tables in public schema (limit 200)
    const tab = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 200");
    console.log('Public tables (first 200):', tab.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('Error connecting/querying DB:', err && err.message ? err.message : err);
    process.exitCode = 3;
  } finally {
    await client.end().catch(()=>{});
  }
}

main();
