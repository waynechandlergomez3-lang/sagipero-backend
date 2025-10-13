const axios = require('axios');
const jwt = require('jsonwebtoken');

async function debugAuthStep() {
  console.log('🔍 DEBUGGING AUTH MIDDLEWARE STEP BY STEP');
  console.log('=========================================');

  try {
    // Step 1: Login to get a valid token
    console.log('\n1️⃣ Getting valid token...');
    
    const loginResponse = await axios.post('https://sagipero-backend-production.up.railway.app/api/users/login', {
      email: 'admin@sagipero.local',
      password: 'adminpassword'
    });

    const { token, user } = loginResponse.data;
    console.log('✅ Login successful, User ID:', user.id);
    
    // Step 2: Decode the token locally to verify structure
    console.log('\n2️⃣ Decoding token locally...');
    
    try {
      // Note: We don't know the JWT_SECRET, but we can decode the payload without verification
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.log('❌ Invalid token format');
        return;
      }
      
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('✅ Token payload:', payload);
      console.log('Token userId:', payload.userId);
      console.log('User ID match:', payload.userId === user.id ? '✅ YES' : '❌ NO');
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < now;
      console.log('Token expired:', isExpired ? '❌ YES' : '✅ NO');
      
    } catch (decodeError) {
      console.log('❌ Token decode error:', decodeError.message);
    }

    // Step 3: Test auth endpoint with detailed error catching
    console.log('\n3️⃣ Testing auth endpoint with detailed error analysis...');
    
    try {
      const authResponse = await axios.get('https://sagipero-backend-production.up.railway.app/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AuthDebugger/1.0'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('✅ Auth SUCCESS! This should not happen if there\'s an issue');
      console.log('Response:', authResponse.data);
      
    } catch (authError) {
      console.log('❌ Auth failed as expected');
      console.log('Status:', authError.response?.status);
      console.log('Error:', authError.response?.data);
      console.log('Headers sent:', authError.config?.headers);
      
      // Check if this is a specific type of error
      if (authError.code === 'ECONNRESET' || authError.code === 'ECONNABORTED') {
        console.log('🌐 Network/connection issue');
      } else if (authError.response?.status === 401) {
        console.log('🔐 Authentication rejection (this is our main issue)');
      } else if (authError.response?.status === 500) {
        console.log('🔥 Server error (database issue likely)');
      }
    }

    // Step 4: Try with a slightly different token format
    console.log('\n4️⃣ Testing with different authorization formats...');
    
    const authFormats = [
      `Bearer ${token}`,
      `bearer ${token}`,
      token
    ];
    
    for (const authHeader of authFormats) {
      try {
        console.log(`Testing with: "${authHeader.substring(0, 20)}..."`);
        
        const testResponse = await axios.get('https://sagipero-backend-production.up.railway.app/api/users/profile', {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        console.log(`✅ Success with format: ${authHeader.split(' ')[0]}`);
        break;
        
      } catch (formatError) {
        console.log(`❌ Failed with format: ${authHeader.split(' ')[0]} - ${formatError.response?.status}`);
      }
    }

  } catch (error) {
    console.log('❌ Test failed at login stage:', error.response?.data || error.message);
  }

  console.log('\n🏁 Debug complete');
  console.log('\n📋 Next steps:');
  console.log('1. Check Railway logs during this test run');
  console.log('2. Look for console.log outputs from auth middleware');
  console.log('3. If no logs appear, the middleware might not be running the updated code');
}

debugAuthStep().catch(console.error);