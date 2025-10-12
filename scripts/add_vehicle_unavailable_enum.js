const { Client } = require('pg');
require('dotenv').config();

async function run() {
  // Some .env files wrap the connection string in quotes; strip them if present
  const rawDb = process.env.DATABASE_URL || '';
  const connectionString = rawDb.replace(/^"|"$/g, '');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    console.log('Adding VEHICLE_UNAVAILABLE to ResponderStatus enum if missing...');
    // PostgreSQL doesn't support IF NOT EXISTS for adding enum values before v13; we check existing values
    const res = await client.query("SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'responderstatus'");
    const labels = res.rows.map(r => r.enumlabel);
    if (!labels.includes('VEHICLE_UNAVAILABLE')) {
      console.log('Adding VEHICLE_UNAVAILABLE to enum responderstatus');
      await client.query("ALTER TYPE \"ResponderStatus\" ADD VALUE 'VEHICLE_UNAVAILABLE'");
      console.log('Added VEHICLE_UNAVAILABLE');
    } else {
      console.log('VEHICLE_UNAVAILABLE already present');
    }
  } catch (e) {
    console.warn('Failed to add VEHICLE_UNAVAILABLE:', e.message || e);
  } finally {
    await client.end();
  }
}

run();
