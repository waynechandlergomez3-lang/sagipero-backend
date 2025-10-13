// Comprehensive login stress test - 50 attempts
// Tests the new centralized database service with connection health checks

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_URL = 'https://sagipero-backend-production.up.railway.app/api/users/login';

// Test users
const testUsers = [
  { email: 'admin@sagipero.local', password: 'adminpassword', role: 'ADMIN' },
  { email: 'responder@sagipero.local', password: 'responder', role: 'RESPONDER' },
  { email: 'testuser@sagipero.local', password: 'password123', role: 'RESIDENT' }
];

async function testLogin(user, attempt) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password })
    });

    const data = await response.json();
    
    if (response.ok) {
      return { 
        success: true, 
        attempt, 
        user: user.role,
        actualRole: data.user?.role,
        responseTime: Date.now()
      };
    } else {
      return { 
        success: false, 
        attempt, 
        user: user.role,
        error: data.error,
        debug: data.debug,
        hint: data.hint
      };
    }
  } catch (error) {
    return { 
      success: false, 
      attempt, 
      user: user.role,
      error: error.message,
      networkError: true
    };
  }
}

async function runStressTest() {
  console.log('🚀 Starting 50-attempt login stress test');
  console.log('=======================================');
  console.log(`Target: ${API_URL}`);
  console.log(`Testing: ${testUsers.map(u => u.role).join(', ')}`);
  console.log('');

  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    preparedStatementErrors: 0,
    networkErrors: 0,
    otherErrors: 0,
    byUser: {}
  };

  // Initialize user stats
  testUsers.forEach(user => {
    results.byUser[user.role] = { attempts: 0, successful: 0, failed: 0 };
  });

  const startTime = Date.now();

  // Run 50 tests
  for (let i = 1; i <= 50; i++) {
    const user = testUsers[(i - 1) % testUsers.length]; // Rotate through users
    
    console.log(`Test ${i}/50: ${user.role}...`);
    
    const result = await testLogin(user, i);
    results.total++;
    results.byUser[user.role].attempts++;

    if (result.success) {
      results.successful++;
      results.byUser[user.role].successful++;
      console.log(`  ✅ SUCCESS - Role: ${result.actualRole}`);
    } else {
      results.failed++;
      results.byUser[user.role].failed++;
      
      if (result.error && result.error.includes('prepared statement')) {
        results.preparedStatementErrors++;
        console.log(`  ❌ PREPARED STATEMENT ERROR: ${result.error}`);
        if (result.debug) console.log(`     Debug: ${result.debug}`);
        if (result.hint) console.log(`     Hint: ${result.hint}`);
      } else if (result.networkError) {
        results.networkErrors++;
        console.log(`  ❌ NETWORK ERROR: ${result.error}`);
      } else {
        results.otherErrors++;
        console.log(`  ❌ OTHER ERROR: ${result.error}`);
      }
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('');
  console.log('📊 FINAL RESULTS');
  console.log('================');
  console.log(`Total Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Average Time per Request: ${(duration / 50).toFixed(3)} seconds`);
  console.log('');
  console.log(`Total Attempts: ${results.total}`);
  console.log(`✅ Successful: ${results.successful} (${(results.successful / results.total * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${results.failed} (${(results.failed / results.total * 100).toFixed(1)}%)`);
  console.log('');
  
  if (results.failed > 0) {
    console.log('Error Breakdown:');
    console.log(`🚨 Prepared Statement Errors: ${results.preparedStatementErrors}`);
    console.log(`🌐 Network Errors: ${results.networkErrors}`);
    console.log(`⚠️  Other Errors: ${results.otherErrors}`);
    console.log('');
  }

  console.log('Results by User Type:');
  Object.entries(results.byUser).forEach(([role, stats]) => {
    const successRate = stats.attempts > 0 ? (stats.successful / stats.attempts * 100).toFixed(1) : '0.0';
    console.log(`${role}: ${stats.successful}/${stats.attempts} (${successRate}%)`);
  });

  console.log('');
  
  if (results.preparedStatementErrors === 0) {
    console.log('🎉 EXCELLENT! No prepared statement errors detected');
    console.log('✅ The centralized database service is working perfectly!');
  } else {
    console.log('⚠️  Still experiencing prepared statement errors');
    console.log('🔧 May need additional connection pooling optimization');
  }

  if (results.successful === results.total) {
    console.log('🏆 PERFECT SCORE! All 50 attempts successful');
  } else if (results.successful >= 47) {
    console.log('🌟 EXCELLENT! Very high success rate');
  } else if (results.successful >= 40) {
    console.log('👍 GOOD! Acceptable success rate');
  } else {
    console.log('⚠️  NEEDS IMPROVEMENT: Low success rate');
  }
}

// Run the stress test
runStressTest().catch(console.error);