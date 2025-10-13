const axios = require('axios');

const BASE_URL = 'https://sagipero-backend-production.up.railway.app/api';

async function testAuthMiddleware() {
  console.log('🔐 TESTING AUTH MIDDLEWARE SPECIFICALLY');
  console.log('======================================');
  
  try {
    // Step 1: Login to get token
    console.log('\n1️⃣ Getting authentication token...');
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: 'admin@sagipero.local',
      password: 'adminpassword'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.token;
    console.log(`Token: ${token.substring(0, 20)}...`);
    
    // Step 2: Test auth middleware with different endpoints
    console.log('\n2️⃣ Testing auth middleware with various endpoints...');
    
    const authHeaders = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Test simple endpoint first
    console.log('\n🧪 Testing /users endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/users`, { 
        headers: authHeaders,
        timeout: 15000 
      });
      console.log('✅ /users endpoint successful');
      console.log(`Response: ${response.status} - Found ${Array.isArray(response.data) ? response.data.length : 'non-array'} items`);
    } catch (error) {
      console.log('❌ /users endpoint failed');
      console.log(`Status: ${error.response?.status}`);
      console.log(`Error:`, error.response?.data);
      
      // If it's a prepared statement error, let's wait and retry
      if (error.response?.data?.error?.includes('prepared statement') || 
          error.response?.data?.error?.includes('Database connection')) {
        console.log('\n🔄 Detected database error, waiting 3 seconds and retrying...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const retryResponse = await axios.get(`${BASE_URL}/users`, { 
            headers: authHeaders,
            timeout: 15000 
          });
          console.log('✅ /users endpoint successful on retry');
          console.log(`Response: ${retryResponse.status} - Found ${Array.isArray(retryResponse.data) ? retryResponse.data.length : 'non-array'} items`);
        } catch (retryError) {
          console.log('❌ /users endpoint still failing on retry');
          console.log(`Retry Error:`, retryError.response?.data);
        }
      }
    }
    
    // Test another endpoint
    console.log('\n🧪 Testing /emergencies endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/emergencies`, { 
        headers: authHeaders,
        timeout: 15000 
      });
      console.log('✅ /emergencies endpoint successful');
      console.log(`Response: ${response.status} - Found ${Array.isArray(response.data) ? response.data.length : 'non-array'} items`);
    } catch (error) {
      console.log('❌ /emergencies endpoint failed');
      console.log(`Status: ${error.response?.status}`);
      console.log(`Error:`, error.response?.data);
    }
    
    // Test multiple concurrent requests to auth endpoints
    console.log('\n3️⃣ Testing concurrent authenticated requests...');
    const concurrentPromises = [];
    for (let i = 0; i < 5; i++) {
      concurrentPromises.push(
        axios.get(`${BASE_URL}/users`, { 
          headers: authHeaders,
          timeout: 15000 
        }).then(res => ({ success: true, status: res.status }))
          .catch(err => ({ success: false, status: err.response?.status, error: err.response?.data }))
      );
    }
    
    const results = await Promise.all(concurrentPromises);
    const successes = results.filter(r => r.success).length;
    
    console.log(`\n📊 Concurrent auth test results: ${successes}/5 successful`);
    results.forEach((result, i) => {
      if (result.success) {
        console.log(`  Request ${i+1}: ✅ SUCCESS (${result.status})`);
      } else {
        console.log(`  Request ${i+1}: ❌ FAILED (${result.status}) - ${JSON.stringify(result.error)}`);
      }
    });
    
  } catch (error) {
    console.log('❌ Auth middleware test failed at login stage');
    console.log('Error:', error.response?.data || error.message);
  }
}

testAuthMiddleware().catch(console.error);