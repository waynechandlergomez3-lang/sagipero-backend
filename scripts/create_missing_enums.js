const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log('Checking/creating missing enum types...');

    // Helper to check and run SQL
    async function ensureType(name, sql) {
      const exists = await client.query(`SELECT 1 FROM pg_type WHERE lower(typname) = $1`, [name.toLowerCase()]);
      if (exists.rowCount === 0) {
        try {
          console.log(`Creating enum type ${name}`);
          await client.query(sql);
        } catch (e) {
          console.warn(`Failed to create enum ${name}:`, e.message || e);
        }
      } else {
        console.log(`Enum type ${name} already exists`);
      }
    }

  await ensureType('ResponderStatus', `CREATE TYPE "ResponderStatus" AS ENUM ('AVAILABLE','ON_DUTY','VEHICLE_UNAVAILABLE','OFFLINE')`);
    await ensureType('SituationStatus', `CREATE TYPE "SituationStatus" AS ENUM ('SAFE','NEED_ASSISTANCE','EMERGENCY')`);
    await ensureType('SpecialCircumstance', `CREATE TYPE "SpecialCircumstance" AS ENUM ('PREGNANT','PWD','ELDERLY','CHILD','WITH_INFANT','NONE')`);

    console.log('Done.');
  } catch (err) {
    console.error('Failed to ensure enum types', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
