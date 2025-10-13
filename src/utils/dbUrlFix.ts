// Force correct DATABASE_URL to always use transaction pooler (port 6543)
// This prevents Railway from using session pooler (port 5432) which causes prepared statement errors

const CORRECT_DATABASE_URL = "postgresql://postgres.vsrvdgzvyhlpnnvktuwn:Sagipero081@aws-1-us-east-2.pooler.supabase.com:6543/postgres";

// Override any incorrect DATABASE_URL at runtime
function enforceCorrectDatabaseUrl() {
  const currentUrl = process.env.DATABASE_URL;
  
  console.log('🔍 Database URL Check:');
  console.log('Current URL port:', currentUrl?.includes(':5432') ? '5432 (SESSION - BAD)' : currentUrl?.includes(':6543') ? '6543 (TRANSACTION - GOOD)' : 'UNKNOWN');
  
  if (!currentUrl || currentUrl.includes(':5432')) {
    console.log('⚠️  Overriding incorrect DATABASE_URL');
    console.log('✅ Forcing transaction pooler (port 6543)');
    process.env.DATABASE_URL = CORRECT_DATABASE_URL;
  } else if (currentUrl.includes(':6543')) {
    console.log('✅ DATABASE_URL is already correct');
  } else {
    console.log('⚠️  Unknown DATABASE_URL format - setting correct one');
    process.env.DATABASE_URL = CORRECT_DATABASE_URL;
  }
}

module.exports = { enforceCorrectDatabaseUrl };