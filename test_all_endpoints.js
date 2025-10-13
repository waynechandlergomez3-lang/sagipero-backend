const axios = require('axios');

const BASE_URL = 'https://sagipero-backend-production.up.railway.app/api';

async function testEndpoint(method, url, data = null, headers = {}) {
  try {
    console.log(`\n🧪 Testing ${method} ${url}`);
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers,
      timeout: 10000
    };
    
    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }
    
    const response = await axios(config);
    console.log(`✅ SUCCESS - Status: ${response.status}`);
    if (response.data) {
      console.log(`   Response keys: [${Object.keys(response.data).join(', ')}]`);
    }
    return { success: true, data: response.data };
  } catch (error) {
    console.log(`❌ ERROR - ${error.response?.status || 'Network'}: ${error.response?.statusText || error.message}`);
    if (error.response?.data) {
      console.log(`   Error details:`, error.response.data);
    }
    return { success: false, error: error.response?.data || error.message };
  }
}

async function runTests() {
  console.log('🚀 COMPREHENSIVE ENDPOINT TESTING');
  console.log('==================================');
  
  // Test 1: Login to get token
  console.log('\n📋 PHASE 1: Authentication Test');
  const loginResult = await testEndpoint('POST', '/users/login', {
    email: 'admin@sagipero.local',
    password: 'adminpassword'
  });
  
  if (!loginResult.success) {
    console.log('🚨 LOGIN FAILED - Cannot proceed with authenticated tests');
    return;
  }
  
  const token = loginResult.data.token;
  const authHeaders = { 'Authorization': `Bearer ${token}` };
  
  console.log('✅ Login successful, token obtained');
  
  // Test 2: All the endpoints that showed errors in the log
  console.log('\n📋 PHASE 2: Testing Previously Failed Endpoints');
  
  const testCases = [
    { method: 'GET', url: '/emergencies', description: 'List Emergencies' },
    { method: 'GET', url: '/users', description: 'List Users' },
    { method: 'GET', url: '/evacuation-centers', description: 'List Evacuation Centers' },
    { method: 'GET', url: '/emergencies/history/all', description: 'Emergency History' },
    { method: 'GET', url: '/weather-alerts', description: 'Weather Alerts' },
    { method: 'GET', url: '/notifications', description: 'Notifications' },
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n--- Testing: ${testCase.description} ---`);
    const result = await testCase.method === 'GET' 
      ? await testEndpoint(testCase.method, testCase.url, null, authHeaders)
      : await testEndpoint(testCase.method, testCase.url, testCase.data, authHeaders);
    
    results.push({
      ...testCase,
      success: result.success,
      error: result.error
    });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test 3: Multiple concurrent requests (stress test)
  console.log('\n📋 PHASE 3: Concurrent Request Stress Test');
  console.log('Testing 10 concurrent login requests...');
  
  const concurrentPromises = [];
  for (let i = 0; i < 10; i++) {
    concurrentPromises.push(
      testEndpoint('POST', '/users/login', {
        email: 'admin@sagipero.local',
        password: 'adminpassword'
      })
    );
  }
  
  const concurrentResults = await Promise.all(concurrentPromises);
  const concurrentSuccesses = concurrentResults.filter(r => r.success).length;
  
  console.log(`\n📊 FINAL RESULTS`);
  console.log('================');
  console.log(`Authentication: ${loginResult.success ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\nEndpoint Tests:');
  results.forEach(result => {
    console.log(`  ${result.description}: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    if (!result.success && result.error) {
      console.log(`    Error: ${JSON.stringify(result.error)}`);
    }
  });
  
  console.log(`\nConcurrent Test: ${concurrentSuccesses}/10 successful (${(concurrentSuccesses/10*100).toFixed(1)}%)`);
  
  const totalTests = 1 + results.length + 10;
  const totalPassed = (loginResult.success ? 1 : 0) + results.filter(r => r.success).length + concurrentSuccesses;
  
  console.log(`\n🏆 OVERALL SCORE: ${totalPassed}/${totalTests} (${(totalPassed/totalTests*100).toFixed(1)}%)`);
  
  if (totalPassed === totalTests) {
    console.log('🎉 PERFECT SCORE! All tests passed!');
  } else {
    console.log('⚠️  Some tests failed - database connection issues may persist');
  }
}

runTests().catch(console.error);