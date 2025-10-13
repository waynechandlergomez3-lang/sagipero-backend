const axios = require('axios');

async function testEndpoints() {
  console.log('🔍 TESTING ENDPOINT AVAILABILITY');
  console.log('=================================');

  const baseUrl = 'https://sagipero-backend-production.up.railway.app';
  
  // Test different possible login endpoints
  const endpoints = [
    '/api/users/login',
    '/users/login', 
    '/login',
    '/api/auth/login',
    '/auth/login'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing ${endpoint}...`);
      
      // Try a POST request with dummy data to see what error we get
      const response = await axios.post(`${baseUrl}${endpoint}`, {
        email: 'test@test.com',
        password: 'test'
      });
      
      console.log(`✅ ${endpoint} - Response:`, response.status);
      
    } catch (error) {
      if (error.response) {
        console.log(`📊 ${endpoint} - Status: ${error.response.status}`);
        
        if (error.response.status === 404) {
          console.log(`❌ ${endpoint} - Not found`);
        } else if (error.response.status === 400 || error.response.status === 401) {
          console.log(`✅ ${endpoint} - Exists! Response:`, error.response.data);
        } else {
          console.log(`❓ ${endpoint} - Other error:`, error.response.data);
        }
      } else {
        console.log(`❌ ${endpoint} - Network error:`, error.message);
      }
    }
  }

  // Also test a simple GET to see if server is running
  try {
    console.log('\n🌐 Testing server health...');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log('✅ Server is running, health check:', healthResponse.data);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Server is running (no health endpoint)');
    } else {
      console.log('❌ Server health check failed:', error.message);
    }
  }

  console.log('\n🏁 Endpoint test complete');
}

testEndpoints().catch(console.error);