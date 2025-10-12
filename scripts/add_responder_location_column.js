const { Client } = require('pg');
const { execSync } = require('child_process');
(async ()=>{
  const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:808080@localhost:5432/sagipero_db' });
  try{
    await client.connect();
    console.log('Connected. Running ALTER TABLE...');
    await client.query(`ALTER TABLE public."Emergency" ADD COLUMN IF NOT EXISTS "responderLocation" JSONB;`);
    console.log('ALTER completed. Verifying column...');
    const col = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='Emergency' AND column_name='responderLocation';`);
    console.log('col result:', col.rows);
    console.log('Running npx prisma generate...');
    execSync('npx prisma generate', {stdio: 'inherit', cwd: process.cwd().replace('scripts','')});
    console.log('prisma generate finished');
  }catch(e){
    console.error('error:', e);
    process.exitCode = 1;
  }finally{
    await client.end();
  }
})();
