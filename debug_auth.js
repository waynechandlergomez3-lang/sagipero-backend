const axios = require('axios');

const BASE_URL = 'https://sagipero-backend-production.up.railway.app/api';

async function debugAuthIssue() {
  console.log('🔍 DEBUGGING AUTH MIDDLEWARE ISSUE');
  console.log('==================================');
  
  try {
    // Step 1: Login and inspect the token
    console.log('\n1️⃣ Login and inspect token...');
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: 'admin@sagipero.local',
      password: 'adminpassword'
    });
    
    const { token, user } = loginResponse.data;
    console.log('✅ Login successful');
    console.log(`User ID from login: ${user.id}`);
    console.log(`Token preview: ${token.substring(0, 50)}...`);
    
    // Decode the JWT token locally to see what's inside
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    console.log('Token payload:', decoded);
    
    // Step 2: Test the auth middleware with detailed headers
    console.log('\n2️⃣ Testing auth middleware with detailed logging...');
    
    try {
      const response = await axios.get(`${BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Debug-Client/1.0'
        },
        timeout: 20000
      });
      
      console.log('✅ Auth successful!');
      console.log(`Response status: ${response.status}`);
      console.log(`Data length: ${Array.isArray(response.data) ? response.data.length : 'not array'}`);
      
    } catch (error) {
      console.log('❌ Auth failed');
      console.log(`Status: ${error.response?.status}`);
      console.log(`Headers sent:`, error.config?.headers);
      console.log(`Error response:`, error.response?.data);
      
      // Try with different token format
      console.log('\n🔄 Trying with explicit Bearer format...');
      try {
        const response2 = await axios.get(`${BASE_URL}/users`, {
          headers: {
            'Authorization': `Bearer ${token.trim()}`,
          },
          timeout: 20000
        });
        console.log('✅ Second attempt successful!');
      } catch (error2) {
        console.log('❌ Second attempt also failed');
        console.log(`Error:`, error2.response?.data);
      }
    }
    
    // Step 3: Try a completely fresh login + immediate request
    console.log('\n3️⃣ Fresh login + immediate auth test...');
    
    const freshLogin = await axios.post(`${BASE_URL}/users/login`, {
      email: 'admin@sagipero.local', 
      password: 'adminpassword'
    });
    
    const freshToken = freshLogin.data.token;
    console.log('Fresh token obtained');
    
    // Immediate request with fresh token
    setTimeout(async () => {
      try {
        const immediateResponse = await axios.get(`${BASE_URL}/users`, {
          headers: { 'Authorization': `Bearer ${freshToken}` },
          timeout: 20000
        });
        console.log('✅ Immediate request after fresh login: SUCCESS');
      } catch (immediateError) {
        console.log('❌ Immediate request after fresh login: FAILED');
        console.log(`Error:`, immediateError.response?.data);
      }
    }, 100);
    
    // Wait a moment then try again
    setTimeout(async () => {
      try {
        const delayedResponse = await axios.get(`${BASE_URL}/users`, {
          headers: { 'Authorization': `Bearer ${freshToken}` },
          timeout: 20000
        });
        console.log('✅ Delayed request (5s later): SUCCESS');
      } catch (delayedError) {
        console.log('❌ Delayed request (5s later): FAILED');
        console.log(`Error:`, delayedError.response?.data);
      }
    }, 5000);
    
  } catch (error) {
    console.log('❌ Debug process failed');
    console.log('Error:', error.response?.data || error.message);
  }
}

// Add a timeout to keep the script running
setTimeout(() => {
  console.log('\n🏁 Debug session complete');
  process.exit(0);
}, 10000);

debugAuthIssue().catch(console.error);