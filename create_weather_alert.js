const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:808080@localhost:5432/sagipero_db' });
  try {
    await c.connect();
    const sql = `CREATE TABLE IF NOT EXISTS "WeatherAlert" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "area" JSONB,
      "hourlyIndexes" INT[] DEFAULT ARRAY[]::INT[],
      "daily" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`;
    const r = await c.query(sql);
    console.log('CREATE TABLE result:', r.command || 'OK');
  } catch (e) {
    console.error('CREATE TABLE error:', e.message || e);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
