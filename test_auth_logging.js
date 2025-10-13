const axios = require('axios');

async function testAuthLogging() {
  console.log('🔍 TESTING AUTH MIDDLEWARE LOGGING');
  console.log('==================================');

  try {
    // Step 1: Login
    console.log('\n1️⃣ Logging in...');
    const loginResponse = await axios.post('https://sagipero-backend-production.up.railway.app/api/users/login', {
      email: 'admin@sagipero.local',
      password: 'adminpassword'
    });

    const { token } = loginResponse.data;
    console.log('✅ Login successful');
    console.log('Token preview:', token.substring(0, 50) + '...');

    // Step 2: Make authenticated request with console logging
    console.log('\n2️⃣ Making authenticated request (check backend logs)...');
    
    try {
      const response = await axios.get('https://sagipero-backend-production.up.railway.app/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Auth request successful:', response.status);
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Auth request failed:', error.response?.status);
      console.log('Error:', error.response?.data);
      
      // Check if it's a specific error
      if (error.response?.status === 500) {
        console.log('🔥 Server error - check if database connection is working');
      } else if (error.response?.status === 401) {
        console.log('🔐 Authentication failed - check auth middleware logs');
      }
    }

    // Step 3: Make a second request to see consistent behavior
    console.log('\n3️⃣ Making second authenticated request...');
    
    try {
      const response2 = await axios.get('https://sagipero-backend-production.up.railway.app/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Second auth request successful:', response2.status);
    } catch (error) {
      console.log('❌ Second auth request failed:', error.response?.status);
      console.log('Error:', error.response?.data);
    }

  } catch (error) {
    console.log('❌ Login failed:', error.response?.data);
  }

  console.log('\n🏁 Auth logging test complete');
  console.log('CHECK RAILWAY LOGS for auth middleware console.log outputs');
}

testAuthLogging().catch(console.error);