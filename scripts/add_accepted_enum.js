const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '..', '.env') });

const url = process.env.DATABASE_URL || process.env.database_url;
let conn = url;
if (!conn) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}
// strip surrounding quotes if present
if (conn.startsWith('"') && conn.endsWith('"')) conn = conn.slice(1, -1);

(async () => {
  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    console.log('Checking/adding ACCEPTED to EmergencyStatus enum...');
    const sql = `DO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid\n    WHERE lower(t.typname) = lower('EmergencyStatus') AND e.enumlabel = 'ACCEPTED'\n  ) THEN\n    ALTER TYPE "EmergencyStatus" ADD VALUE 'ACCEPTED';\n  END IF;\nEND$$;`;
    await client.query(sql);
    console.log('Added ACCEPTED');
    await client.end();
    process.exit(0);
  } catch (e) {
    console.error('Failed to add ACCEPTED enum', e);
    try { await client.end(); } catch(_){}
    process.exit(1);
  }
})();