const { Client } = require('pg')
require('dotenv').config()

const sql = `
CREATE TABLE IF NOT EXISTS public.emergency_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
`;

async function run(){
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try{
    console.log('Creating emergency_history table if missing...')
    await client.query(sql)
    console.log('Done')
  }catch(e){ console.error(e); process.exit(1) }
  await client.end()
}

run()
