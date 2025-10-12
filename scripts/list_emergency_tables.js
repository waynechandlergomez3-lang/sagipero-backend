const { Client } = require('pg');
(async ()=>{
  const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:808080@localhost:5432/sagipero_db' });
  try{
    await client.connect();
    const res = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name ILIKE '%emerg%' OR table_name ILIKE '%emergency%';");
    console.log('matches:', res.rows);
    for(const r of res.rows){
      const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2;`, [r.table_schema, r.table_name]);
      console.log('columns for', r.table_schema + '.' + r.table_name, cols.rows);
    }
  }catch(e){
    console.error(e);
    process.exitCode = 1;
  }finally{
    await client.end();
  }
})();
