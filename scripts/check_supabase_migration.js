// check_supabase_migration.js
// Usage: set env DATABASE_URL and run `node scripts/check_supabase_migration.js`
// Example (PowerShell):
// $env:DATABASE_URL = 'postgres://...'; node .\scripts\check_supabase_migration.js

const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || null;
if (!DB_URL) {
  console.error('ERROR: Please set DATABASE_URL environment variable to your Supabase DB URL.');
  process.exit(2);
}

const expected = {
  vehicle: {
    namesToCheck: ['"Vehicle"', 'vehicle'], // quoted first
    requiredColumns: ['id','responderId','plateNumber','model','color','active','createdAt','updatedAt'],
    fkChecks: [{ column: 'responderId', referenced_table: 'User', referenced_column: 'id' }]
  },
  emergency_vehicles: {
    namesToCheck: ['"emergency_vehicles"', 'emergency_vehicles'],
    requiredColumns: ['id','emergencyId','vehicleId','assignedAt'],
    fkChecks: [
      { column: 'emergencyId', referenced_table: 'Emergency', referenced_column: 'id' },
      { column: 'vehicleId', referenced_table: 'Vehicle', referenced_column: 'id' }
    ]
  }
};

(async function main(){
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    console.log('Connected to database. Running checks...');

    const results = [];

    // helper to find which actual table name variant exists
    async function findTable(schema, nameVariants){
      for (const nv of nameVariants){
        const q = `SELECT to_regclass($1) as reg`; // safe
        const res = await client.query(q, [`${schema}.${nv}`]);
        if (res.rows && res.rows[0] && res.rows[0].reg) return { found: true, reg: res.rows[0].reg, nameVariant: nv };
      }
      return { found: false };
    }

    // helper to fetch columns for table
    async function getColumns(schema, tableName){
      const q = `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`;
      const res = await client.query(q, ['public', tableName]);
      return res.rows; // may be empty
    }

    // helper to fetch foreign keys defined on a table
    async function getForeignKeys(schema, tableName){
      const q = `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1 AND tc.table_name = $2
      `;
      const res = await client.query(q, ['public', tableName]);
      return res.rows;
    }

    // perform checks for each target
    for (const [key, cfg] of Object.entries(expected)){
      console.log('\nChecking', key);
      const find = await findTable('public', cfg.namesToCheck);
      if (!find.found){
        console.error(`FAIL: table not found (tried variants: ${cfg.namesToCheck.join(', ')})`);
        results.push({ key, ok: false, reason: 'table_missing' });
        continue;
      }

      // tableName for information_schema queries must match the stored table_name (without schema)
      // if user created a quoted name (e.g. "Vehicle"), information_schema.table_name will be exactly 'Vehicle'
      // so derive the plain table name by stripping surrounding quotes if present
      const tableName = cfg.namesToCheck.find(v => `${'public.'}${v}` === find.reg) ? vFromReg(find.reg) : cfg.namesToCheck[0];

      // compute table_name for information_schema: if found.reg returns "public.Vehicle" or public.vehicle
      // to be safe, derive the last path component
      const regParts = find.reg.split('.');
      const foundTableName = regParts[regParts.length-1].replace(/^"|"$/g, '');

      const cols = await getColumns('public', foundTableName);
      const colNames = cols.map(r => r.column_name);

      const missingCols = cfg.requiredColumns.filter(c => !colNames.includes(c));
      if (missingCols.length){
        console.error(`FAIL: table ${find.reg} is missing columns: ${missingCols.join(', ')}`);
        results.push({ key, ok: false, reason: 'missing_columns', missingCols });
        continue;
      }

      console.log(`OK: table ${find.reg} exists and has required columns (${cfg.requiredColumns.join(', ')})`);

      // check foreign keys
      const fks = await getForeignKeys('public', foundTableName);
      for (const fk of cfg.fkChecks){
        const match = fks.find(r => r.column_name === fk.column && r.foreign_table_name === fk.referenced_table && r.foreign_column_name === fk.referenced_column);
        if (!match){
          console.error(`WARN: foreign key on ${find.reg}.${fk.column} -> ${fk.referenced_table}(${fk.referenced_column}) not found`);
          results.push({ key, ok: false, reason: 'missing_fk', fk });
        } else {
          console.log(`OK: foreign key ${fk.column} -> ${fk.referenced_table}(${fk.referenced_column}) exists (constraint ${match.constraint_name})`);
        }
      }

      // if we reached here with no recorded failures for this key, mark ok
      if (!results.some(r => r.key === key && r.ok === false)) results.push({ key, ok: true });
    }

    // final summary
    const failed = results.filter(r => !r.ok);
    console.log('\nSummary:');
    if (failed.length === 0){
      console.log('All checks passed ✅');
      await client.end();
      process.exit(0);
    } else {
      console.error(`${failed.length} check(s) failed. See above for details.`);
      await client.end();
      process.exit(3);
    }

  } catch (err){
    console.error('UNEXPECTED ERROR:', err.message || err);
    await client.end();
    process.exit(4);
  }
})();

function vFromReg(reg){
  // reg is like 'public."Vehicle"' or 'public.vehicle' or 'Vehicle'
  const parts = reg.split('.');
  return parts[parts.length - 1].replace(/^"|"$/g, '');
}
