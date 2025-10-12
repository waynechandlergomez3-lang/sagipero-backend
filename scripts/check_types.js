const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await c.connect();
    const res = await c.query("SELECT typname FROM pg_type WHERE typname IN ('responderstatus','situationstatus')");
    console.log('found types:', res.rows);
    await c.end();
  } catch (e) {
    console.error('error', e);
    process.exit(1);
  }
})();
