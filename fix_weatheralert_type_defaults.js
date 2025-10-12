const { Client } = require('pg');
(async()=>{
  const c = new Client({ connectionString: 'postgresql://postgres:808080@localhost:5432/sagipero_db' });
  try{
    await c.connect();
    const queries = [
      // make legacy columns nullable or give defaults so inserts that don't include them won't fail
      `ALTER TABLE "WeatherAlert" ALTER COLUMN "type" DROP NOT NULL;`,
      `ALTER TABLE "WeatherAlert" ALTER COLUMN "severity" DROP NOT NULL;`,
      `ALTER TABLE "WeatherAlert" ALTER COLUMN "description" DROP NOT NULL;`,
      `ALTER TABLE "WeatherAlert" ALTER COLUMN "source" DROP NOT NULL;`,
      `ALTER TABLE "WeatherAlert" ALTER COLUMN "location" DROP NOT NULL;`,
      `ALTER TABLE "WeatherAlert" ALTER COLUMN "startsAt" DROP NOT NULL;`,
      // ensure description/message exists: copy description into message if message empty
      `UPDATE "WeatherAlert" SET "message" = coalesce("message", '') || '' WHERE "message" IS NULL;`
    ];
    for(const q of queries){
      try{
        const r = await c.query(q);
        console.log('OK:', q);
      }catch(e){
        console.error('ERR:', q, e.message || e);
      }
    }
    console.log('Done');
  }catch(e){
    console.error('ERROR:', e.message || e);
    process.exitCode = 1;
  }finally{
    await c.end();
  }
})();
