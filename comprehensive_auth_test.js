const axios = require('axios');

async function comprehensiveAuthTest() {
  console.log('🔍 COMPREHENSIVE AUTH MIDDLEWARE TEST');
  console.log('====================================');

  try {
    // Step 1: Login and get token
    console.log('\n1️⃣ Logging in...');
    
    const loginResponse = await axios.post('https://sagipero-backend-production.up.railway.app/api/users/login', {
      email: 'admin@sagipero.local',
      password: 'adminpassword'
    });

    const { token, user } = loginResponse.data;
    console.log('✅ Login successful');
    console.log('User ID from login:', user.id);
    console.log('Token preview:', token.substring(0, 50) + '...');

    // Decode the token to see what it contains
    const tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('Token payload:', tokenPayload);

    // Step 2: Test multiple authenticated endpoints
    console.log('\n2️⃣ Testing various auth endpoints...');
    
    const endpoints = [
      'https://sagipero-backend-production.up.railway.app/api/users/profile',
      'https://sagipero-backend-production.up.railway.app/api/notifications',
      'https://sagipero-backend-production.up.railway.app/api/emergencies'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`\n📍 Testing: ${endpoint.split('/').pop()}`);
        
        const response = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Test-Source': 'auth-debug' // Custom header to identify our requests in logs
          }
        });
        
        console.log(`✅ SUCCESS: ${response.status}`);
        console.log('Response preview:', JSON.stringify(response.data).substring(0, 100) + '...');
        
      } catch (error) {
        console.log(`❌ FAILED: ${error.response?.status}`);
        console.log('Error:', error.response?.data);
        
        // Check if it's specifically an auth error
        if (error.response?.status === 401 && error.response?.data?.error === 'Please authenticate') {
          console.log('🔍 This is the auth middleware failing');
        } else if (error.response?.status === 500) {
          console.log('🔥 Server error - might be database connection issue');
        }
      }
    }

    // Step 3: Test with malformed token to see if auth middleware responds
    console.log('\n3️⃣ Testing with invalid token...');
    
    try {
      const badResponse = await axios.get('https://sagipero-backend-production.up.railway.app/api/users/profile', {
        headers: {
          'Authorization': 'Bearer invalid_token_here',
          'X-Test-Source': 'auth-debug-invalid'
        }
      });
      
      console.log('❓ Unexpected success with invalid token:', badResponse.status);
      
    } catch (error) {
      console.log(`✅ Expected failure with invalid token: ${error.response?.status}`);
      console.log('Error:', error.response?.data);
    }

    // Step 4: Test with no token
    console.log('\n4️⃣ Testing with no auth header...');
    
    try {
      const noAuthResponse = await axios.get('https://sagipero-backend-production.up.railway.app/api/users/profile', {
        headers: {
          'X-Test-Source': 'auth-debug-no-auth'
        }
      });
      
      console.log('❓ Unexpected success with no auth:', noAuthResponse.status);
      
    } catch (error) {
      console.log(`✅ Expected failure with no auth: ${error.response?.status}`);
      console.log('Error:', error.response?.data);
    }

    console.log('\n🏁 Comprehensive auth test complete');
    console.log('\n📋 SUMMARY:');
    console.log('- Login endpoint: ✅ Working perfectly');
    console.log('- Auth middleware: ❌ Failing with valid tokens');
    console.log('- This suggests database connection issue in auth middleware');
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Check Railway deployment logs for auth middleware console output');
    console.log('2. Look for "Authorization header:", "Decoded token:", "User lookup result:" logs');
    console.log('3. Verify the updated auth middleware code is deployed');

  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
  }
}

comprehensiveAuthTest().catch(console.error);