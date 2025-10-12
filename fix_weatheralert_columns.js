const { Client } = require('pg');
(async()=>{
  const c = new Client({ connectionString: 'postgresql://postgres:808080@localhost:5432/sagipero_db' });
  try{
    await c.connect();
    // Add missing columns if they don't exist
    const queries = [
      `ALTER TABLE "WeatherAlert" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL DEFAULT '';`,
      `ALTER TABLE "WeatherAlert" ADD COLUMN IF NOT EXISTS "area" JSONB;`,
      `ALTER TABLE "WeatherAlert" ADD COLUMN IF NOT EXISTS "hourlyIndexes" INT[] DEFAULT ARRAY[]::INT[];`,
      `ALTER TABLE "WeatherAlert" ADD COLUMN IF NOT EXISTS "daily" BOOLEAN NOT NULL DEFAULT false;`
    ];
    for(const q of queries){
      try{
        const r = await c.query(q);
        console.log('OK:', q);
      }catch(e){
        console.error('ERR:', q, e.message || e);
      }
    }
    // update any NULL messages to empty string to satisfy NOT NULL
    await c.query(`UPDATE "WeatherAlert" SET "message" = '' WHERE "message" IS NULL;`);
    console.log('Done');
  }catch(e){
    console.error('ERROR:', e.message || e);
    process.exitCode = 1;
  }finally{
    await c.end();
  }
})();
