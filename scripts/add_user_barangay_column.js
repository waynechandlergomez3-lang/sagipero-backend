// Idempotent script to add 'barangay' column to the User table if it doesn't exist
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
    const check = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='barangay'");
    if (check.rows.length > 0) {
      console.log('Column barangay already exists on User');
      return;
    }
    console.log('Adding barangay column to User...');
    await client.query("ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS barangay TEXT;");
    console.log('Done.');
  } catch (err) {
    console.error('Error adding barangay column:', err && err.message ? err.message : err);
    process.exitCode = 3;
  } finally {
    await client.end().catch(()=>{});
  }
}

main();
