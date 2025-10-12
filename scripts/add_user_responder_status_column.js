const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log('Adding responderStatus column to "User" if not exists');
    await client.query('ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "responderStatus" text DEFAULT \'' + 'AVAILABLE' + '\';');
    console.log('Column added/exists. Verifying...');
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='responderStatus'");
    console.log('Verify result:', res.rows);
  } catch (err) {
    console.error('Failed to add column', err);
  } finally {
    await client.end();
  }
}

run();
