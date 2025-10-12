const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Adding situationStatus column to "User" if not exists');
  try {
    await client.query('ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "situationStatus" text DEFAULT \'' + 'SAFE' + '\';');
    console.log('Column added/exists. Verifying...');
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='situationStatus'");
    console.log('Verify result:', res.rows);
  } catch (err) {
    console.error('Failed to add column', err);
  } finally {
    await client.end();
  }
})();
