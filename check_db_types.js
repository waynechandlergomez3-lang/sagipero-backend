#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');

async function checkTypes() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Check enum types
    const enumTypes = await client.query("SELECT typname FROM pg_type WHERE typcategory = 'E'");
    console.log('Enum types in database:');
    enumTypes.rows.forEach(row => console.log(`  - ${row.typname}`));
    
    // Check User table columns
    const userCols = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log('\nUser table columns:');
    userCols.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.udt_name})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkTypes();