// Comprehensive fix for Railway + Supabase connection issues
// This addresses the intermittent "prepared statement does not exist" errors

const { PrismaClient } = require('@prisma/client');

async function testAndFixConnection() {
  console.log('🔧 Railway + Supabase Connection Fix');
  console.log('=====================================');
  
  // Check current DATABASE_URL
  const currentUrl = process.env.DATABASE_URL;
  console.log('Current DATABASE_URL port:', currentUrl?.includes(':5432') ? '5432 (SESSION POOLER - PROBLEMATIC)' : currentUrl?.includes(':6543') ? '6543 (TRANSACTION POOLER - CORRECT)' : 'UNKNOWN');
  
  if (currentUrl?.includes(':5432')) {
    console.log('❌ PROBLEM DETECTED: Using session pooler (port 5432)');
    console.log('   This causes "prepared statement does not exist" errors');
    console.log('');
    console.log('✅ SOLUTION: Railway environment variable must be updated to:');
    console.log('   postgresql://postgres.vsrvdgzvyhlpnnvktuwn:Sagipero081@aws-1-us-east-2.pooler.supabase.com:6543/postgres');
    console.log('');
    console.log('🔧 MANUAL STEPS REQUIRED:');
    console.log('1. Go to Railway Dashboard');
    console.log('2. Find DATABASE_URL variable');
    console.log('3. Change port from :5432 to :6543');
    console.log('4. Redeploy the service');
    return;
  }

  // Test connection
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: currentUrl
      }
    }
  });

  try {
    console.log('🧪 Testing database connection...');
    
    // Simple query to test prepared statements
    const userCount = await prisma.user.count();
    console.log('✅ Connection successful!');
    console.log(`📊 Total users: ${userCount}`);
    
    // Test a login query specifically
    console.log('🧪 Testing login query...');
    const testUser = await prisma.user.findUnique({
      where: { email: 'testuser@sagipero.local' }
    });
    
    if (testUser) {
      console.log('✅ Login query successful!');
      console.log('🎉 Database connection is working properly');
    } else {
      console.log('⚠️  Test user not found, but connection works');
    }
    
  } catch (error) {
    console.log('❌ Connection failed:');
    console.log('Error:', error.message);
    
    if (error.message.includes('prepared statement')) {
      console.log('');
      console.log('🚨 PREPARED STATEMENT ERROR DETECTED!');
      console.log('This confirms Railway is using session pooler (port 5432)');
      console.log('');
      console.log('🔧 IMMEDIATE ACTION REQUIRED:');
      console.log('Update Railway DATABASE_URL to use port :6543');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAndFixConnection().catch(console.error);