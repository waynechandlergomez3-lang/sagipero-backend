// Quick CORS test from localhost:4173
const axios = require('axios');

async function testCORS() {
  console.log('🔍 Testing CORS from localhost:4173 perspective...');
  
  try {
    // Test with explicit Origin header to simulate browser request
    const response = await axios.post('https://sagipero-backend-production.up.railway.app/api/users/login', {
      email: 'test@test.com',
      password: 'test123'
    }, {
      headers: {
        'Origin': 'http://localhost:4173',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Request succeeded (unexpected, but CORS is working)');
    console.log('Response:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.log('✅ CORS working - got HTTP response:', error.response.status);
      console.log('Response headers:', error.response.headers);
      console.log('Response data:', error.response.data);
      
      // Check for CORS headers
      const corsHeaders = error.response.headers['access-control-allow-origin'];
      if (corsHeaders) {
        console.log('✅ CORS header present:', corsHeaders);
      } else {
        console.log('❌ No CORS header in response');
      }
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testCORS();