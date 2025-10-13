const axios = require('axios');

async function createAndTestUser() {
  console.log('🔧 CREATING TEST USER AND TESTING AUTH');
  console.log('=====================================');

  try {
    // Step 1: Create a test user (assuming registration endpoint works)
    console.log('\n1️⃣ Creating test user...');
    
    const userEmail = `authtest-${Date.now()}@example.com`;
    const userPassword = 'testpass123';
    
    try {
      const registerResponse = await axios.post('https://sagipero-backend-production.up.railway.app/api/users/register', {
        email: userEmail,
        name: 'Auth Test User',
        password: userPassword,
        phone: '1234567890',
        address: '123 Test St',
        role: 'RESIDENT'
      });
      
      console.log('✅ User created successfully');
      console.log('User ID:', registerResponse.data.id);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
        console.log('ℹ️ User may already exist, proceeding with login test');
      } else {
        console.log('❌ User creation failed:', error.response?.data);
        console.log('Will try login with existing test credentials...');
      }
    }

    // Step 2: Login with the user
    console.log('\n2️⃣ Attempting login...');
    
    const loginResponse = await axios.post('https://sagipero-backend-production.up.railway.app/api/users/login', {
      email: userEmail,
      password: userPassword
    });

    const { token } = loginResponse.data;
    console.log('✅ Login successful');
    console.log('Token preview:', token.substring(0, 50) + '...');

    // Step 3: Test authenticated endpoint
    console.log('\n3️⃣ Testing authenticated endpoint...');
    
    try {
      const profileResponse = await axios.get('https://sagipero-backend-production.up.railway.app/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Authenticated request successful!');
      console.log('Profile data:', profileResponse.data);
      console.log('🎉 AUTH MIDDLEWARE IS WORKING!');
      
    } catch (error) {
      console.log('❌ Authenticated request failed:', error.response?.status);
      console.log('Error response:', error.response?.data);
      
      if (error.response?.status === 401) {
        console.log('🔍 This confirms the auth middleware issue exists');
      }
    }

  } catch (error) {
    console.log('❌ Login failed:', error.response?.data);
    
    // Try with a different user that might exist
    console.log('\n🔄 Trying with alternate credentials...');
    
    try {
      const altLoginResponse = await axios.post('https://sagipero-backend-production.up.railway.app/api/users/login', {
        email: 'admin@sagipero.local',
        password: 'admin123'
      });
      
      console.log('✅ Alternate login successful');
      const { token } = altLoginResponse.data;
      
      // Test auth with alternate token
      const profileResponse = await axios.get('https://sagipero-backend-production.up.railway.app/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Auth working with alternate credentials!');
      
    } catch (altError) {
      console.log('❌ All login attempts failed');
      console.log('Database may have different user structure or passwords');
    }
  }

  console.log('\n🏁 Create and test complete');
}

createAndTestUser().catch(console.error);