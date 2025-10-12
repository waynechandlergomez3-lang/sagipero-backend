// Creates the Article table if it doesn't exist. Safe to run multiple times.
const path = require('path');
const fs = require('fs');
const dotenvPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}
const { Client } = require('pg');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('No DATABASE_URL found in environment or backend/.env');
  process.exit(2);
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const sql = `CREATE TABLE IF NOT EXISTS "Article" (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  "imageUrl" TEXT,
  source TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
`;
    console.log('Running SQL to create Article table if missing...');
    await client.query(sql);
    console.log('Done.');
  } catch (err) {
    console.error('Error creating Article table:', err && err.message ? err.message : err);
    process.exitCode = 3;
  } finally {
    await client.end().catch(()=>{});
  }
}

main();
