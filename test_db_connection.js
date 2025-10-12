// Direct PostgreSQL connection test
const { Client } = require('pg');

async function testDatabaseConnection() {
  console.log('🔍 Testing direct PostgreSQL connection...');
  
  const connectionString = 'postgresql://postgres.vsrvdgzvyhlpnnvktuwn:Sagipero081@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
  
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false // Supabase requires SSL
    }
  });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    console.log('🔍 Testing simple query...');
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Query successful:');
    console.log('   Current time:', result.rows[0].current_time);
    console.log('   PostgreSQL version:', result.rows[0].postgres_version.substring(0, 50) + '...');
    
    // Test if our tables exist
    console.log('🔍 Checking all Sagipero tables...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Found Sagipero tables:');
      tableCheck.rows.forEach(row => console.log('   -', row.table_name));
    } else {
      console.log('❌ No Sagipero tables found - database might be empty');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.error('   🌐 DNS resolution failed - hostname not found');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   🚫 Connection refused - port might be blocked');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   ⏰ Connection timed out - network issues');
    }
    
  } finally {
    try {
      await client.end();
      console.log('🔌 Database connection closed');
    } catch (e) {
      // ignore close errors
    }
  }
}

testDatabaseConnection();