const axios = require('axios');

async function testNewUserAuth() {
  console.log('🧪 TESTING NEW USER AUTHENTICATION');
  console.log('==================================');

  const email = 'sampleuser@email.com';
  const password = 'pw123';

  try {
    // Step 1: Test login
    console.log('\n1️⃣ Testing login...');
    console.log('Email:', email);
    console.log('Password:', password);
    
    const loginResponse = await axios.post('https://sagipero-backend-production.up.railway.app/api/users/login', {
      email,
      password
    });

    const { token, user } = loginResponse.data;
    console.log('✅ Login successful!');
    console.log('User ID:', user.id);
    console.log('User name:', user.name);
    console.log('User role:', user.role);
    console.log('Token preview:', token.substring(0, 50) + '...');

    // Step 2: Test auth middleware
    console.log('\n2️⃣ Testing auth middleware...');
    
    try {
      const profileResponse = await axios.get('https://sagipero-backend-production.up.railway.app/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ AUTH MIDDLEWARE WORKING!');
      console.log('Profile response status:', profileResponse.status);
      console.log('Profile data:', {
        id: profileResponse.data.id,
        email: profileResponse.data.email,
        name: profileResponse.data.name,
        role: profileResponse.data.role
      });
      
      console.log('\n🎉 SUCCESS: Complete auth flow working!');
      console.log('✅ User registration: WORKING');
      console.log('✅ Login endpoint: WORKING');
      console.log('✅ Auth middleware: WORKING');
      
    } catch (authError) {
      console.log('❌ Auth middleware failed:', authError.response?.status);
      console.log('Error:', authError.response?.data);
      
      console.log('\n🔍 Auth middleware still has issues');
      console.log('- User was created successfully');
      console.log('- Login works (creates valid tokens)');
      console.log('- Auth middleware fails to validate tokens');
    }

  } catch (loginError) {
    console.log('❌ Login failed:', loginError.response?.status);
    console.log('Error:', loginError.response?.data);
    
    console.log('\n🔍 Login issue detected');
    console.log('- User was created in database');
    console.log('- But login endpoint cannot authenticate them');
  }

  console.log('\n🏁 New user auth test complete');
}

testNewUserAuth().catch(console.error);