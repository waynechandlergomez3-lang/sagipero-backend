const { Client } = require('pg');
(async()=>{
  const c = new Client({ connectionString: 'postgresql://postgres:808080@localhost:5432/sagipero_db' });
  try{
    await c.connect();
    const res = await c.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'WeatherAlert' ORDER BY ordinal_position;");
    console.log(res.rows);
  }catch(e){
    console.error('ERROR:', e.message || e);
    process.exitCode = 1;
  }finally{
    await c.end();
  }
})();
