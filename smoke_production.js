// Production Smoke Test for Sagipero Backend
// Tests all major controllers against the hosted Railway backend
// Run: node smoke_production.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Debug function to check what we're actually sending
async function debugRequest(endpoint, options = {}) {
  console.log('🔍 DEBUG REQUEST:');
  console.log('  Endpoint:', `${API}${endpoint}`);
  console.log('  Headers:', JSON.stringify(options.headers, null, 2));
  console.log('  Method:', options.method || 'GET');
  console.log('  Body:', options.body ? options.body.substring(0, 100) + '...' : 'none');
}

// Production API URL
const API = 'https://sagipero-backend-production.up.railway.app/api';

// Utility functions
async function makeRequest(endpoint, options = {}) {
  try {
    // Ensure Content-Type is explicitly set for requests with body
    const requestOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    // Debug what we're sending
    if (options.body) {
      console.log('🔍 Request Debug:');
      console.log('  Content-Type:', requestOptions.headers['Content-Type']);
      console.log('  Body type:', typeof options.body);
      console.log('  Body preview:', options.body.substring(0, 50) + '...');
    }
    
    const response = await fetch(`${API}${endpoint}`, requestOptions);
    
    const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));
    
    return {
      status: response.status,
      ok: response.ok,
      data: data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      data: { error: error.message }
    };
  }
}

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  const response = await fetch('https://sagipero-backend-production.up.railway.app/health');
  const data = await response.json();
  console.log('✅ Health:', data);
  return response.ok;
}

async function signup(userData) {
  console.log(`\n👤 Signing up ${userData.role || 'RESIDENT'}: ${userData.name}`);
  const result = await makeRequest('/users/signup', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  
  if (result.ok) {
    console.log(`✅ Signup successful - ID: ${result.data.user?.id}`);
    return result.data;
  } else {
    console.log(`❌ Signup failed:`, result.data);
    return null;
  }
}

async function login(email, password) {
  console.log(`\n🔐 Logging in: ${email}`);
  const result = await makeRequest('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  if (result.ok) {
    console.log(`✅ Login successful - Token: ${result.data.token?.slice(0, 20)}...`);
    return result.data;
  } else {
    console.log(`❌ Login failed:`, result.data);
    return null;
  }
}

async function createEmergency(token, emergencyData) {
  console.log(`\n🚨 Creating emergency: ${emergencyData.type}`);
  const result = await makeRequest('/emergencies', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(emergencyData)
  });
  
  if (result.ok) {
    console.log(`✅ Emergency created - ID: ${result.data.id}`);
    return result.data;
  } else {
    console.log(`❌ Emergency creation failed:`, result.data);
    return null;
  }
}

async function listEmergencies(token) {
  console.log('\n📋 Listing emergencies...');
  const result = await makeRequest('/emergencies', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (result.ok) {
    console.log(`✅ Found ${result.data.length} emergencies`);
    return result.data;
  } else {
    console.log(`❌ Failed to list emergencies:`, result.data);
    return null;
  }
}

async function assignResponder(adminToken, emergencyId, responderId) {
  console.log(`\n👨‍🚒 Assigning responder ${responderId} to emergency ${emergencyId}`);
  const result = await makeRequest('/emergencies/assign', {
    method: 'POST', 
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ emergencyId, responderId })
  });
  
  if (result.ok) {
    console.log(`✅ Responder assigned successfully`);
    return result.data;
  } else {
    console.log(`❌ Assignment failed:`, result.data);
    return null;
  }
}

async function acceptAssignment(responderToken, emergencyId) {
  console.log(`\n✋ Responder accepting assignment for emergency ${emergencyId}`);
  const result = await makeRequest('/emergencies/accept', {
    method: 'POST',
    headers: { Authorization: `Bearer ${responderToken}` },
    body: JSON.stringify({ emergencyId })
  });
  
  if (result.ok) {
    console.log(`✅ Assignment accepted`);
    return result.data;
  } else {
    console.log(`❌ Accept failed:`, result.data);
    return null;
  }
}

async function markArrived(responderToken, emergencyId) {
  console.log(`\n🚗 Responder marking arrival for emergency ${emergencyId}`);
  const result = await makeRequest('/emergencies/arrive', {
    method: 'POST',
    headers: { Authorization: `Bearer ${responderToken}` },
    body: JSON.stringify({ emergencyId })
  });
  
  if (result.ok) {
    console.log(`✅ Arrival marked`);
    return result.data;
  } else {
    console.log(`❌ Mark arrival failed:`, result.data);
    return null;
  }
}

async function resolveEmergency(adminToken, emergencyId) {
  console.log(`\n✅ Resolving emergency ${emergencyId}`);
  const result = await makeRequest('/emergencies/resolve', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ emergencyId })
  });
  
  if (result.ok) {
    console.log(`✅ Emergency resolved`);
    return result.data;
  } else {
    console.log(`❌ Resolve failed:`, result.data);
    return null;
  }
}

async function getEmergencyHistory(adminToken, emergencyId) {
  console.log(`\n📚 Getting history for emergency ${emergencyId}`);
  const result = await makeRequest(`/emergencies/${emergencyId}/history`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  
  if (result.ok) {
    console.log(`✅ History retrieved - ${result.data.length} entries`);
    return result.data;
  } else {
    console.log(`❌ History retrieval failed:`, result.data);
    return null;
  }
}

async function createEvacuationCenter(adminToken) {
  console.log('\n🏢 Creating evacuation center...');
  const centerData = {
    name: `Smoke Test Center ${Date.now()}`,
    address: '123 Test Street, Test City',
    capacity: 100,
    location: { lat: 14.5995, lng: 120.9842 },
    contactNumber: '+63912345678',
    facilities: ['Water', 'Electricity', 'Medical Station']
  };
  
  const result = await makeRequest('/evacuation-centers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(centerData)
  });
  
  if (result.ok) {
    console.log(`✅ Evacuation center created - ID: ${result.data.id}`);
    return result.data;
  } else {
    console.log(`❌ Evacuation center creation failed:`, result.data);
    return null;
  }
}

async function createWeatherAlert(adminToken) {
  console.log('\n🌪️ Creating weather alert...');
  const alertData = {
    title: `Smoke Test Weather Alert ${Date.now()}`,
    message: 'This is a test weather alert for smoke testing',
    area: { name: 'Test Area', coordinates: [14.5995, 120.9842] },
    daily: false,
    hourlyIndexes: [1, 2, 3]
  };
  
  const result = await makeRequest('/weather-alerts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(alertData)
  });
  
  if (result.ok) {
    console.log(`✅ Weather alert created - ID: ${result.data.id}`);
    return result.data;
  } else {
    console.log(`❌ Weather alert creation failed:`, result.data);
    return null;
  }
}

async function updateLocation(userToken) {
  console.log('\n📍 Updating user location...');
  const locationData = {
    latitude: 14.5995 + Math.random() * 0.01,
    longitude: 120.9842 + Math.random() * 0.01
  };
  
  const result = await makeRequest('/location', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify(locationData)
  });
  
  if (result.ok) {
    console.log(`✅ Location updated`);
    return result.data;
  } else {
    console.log(`❌ Location update failed:`, result.data);
    return null;
  }
}

// Main smoke test
async function runSmokeTest() {
  console.log('🚀 Starting Production Smoke Test for Sagipero Backend');
  console.log(`📡 API URL: ${API}`);
  
  const timestamp = Date.now();
  let testsPassed = 0;
  let testsTotal = 0;
  
  try {
    // Test 1: Health Check
    testsTotal++;
    if (await testHealthCheck()) testsPassed++;
    
    // Test 2: Create Admin User
    testsTotal++;
    const adminData = {
      email: `smoke-admin-${timestamp}@example.com`,
      password: 'SecurePass123!',
      name: 'Smoke Test Admin',
      role: 'ADMIN',
      phone: '+63912345678',
      address: '123 Admin Street',
      barangay: 'Test Barangay'
    };
    
    const adminSignup = await signup(adminData);
    if (adminSignup) testsPassed++;
    
    // Test 3: Admin Login
    testsTotal++;
    const adminLogin = await login(adminData.email, adminData.password);
    if (adminLogin?.token) testsPassed++;
    const adminToken = adminLogin?.token;
    
    // Test 4: Create Responder User
    testsTotal++;
    const responderData = {
      email: `smoke-responder-${timestamp}@example.com`,
      password: 'SecurePass123!',
      name: 'Smoke Test Responder',
      role: 'RESPONDER',
      phone: '+63987654321',
      address: '456 Responder Ave',
      barangay: 'Responder Barangay'
    };
    
    const responderSignup = await signup(responderData);
    if (responderSignup) testsPassed++;
    
    // Test 5: Responder Login
    testsTotal++;
    const responderLogin = await login(responderData.email, responderData.password);
    if (responderLogin?.token) testsPassed++;
    const responderToken = responderLogin?.token;
    
    // Test 6: Create Resident User
    testsTotal++;
    const residentData = {
      email: `smoke-resident-${timestamp}@example.com`,
      password: 'SecurePass123!',
      name: 'Smoke Test Resident',
      role: 'RESIDENT',
      phone: '+63555666777',
      address: '789 Resident Road',
      barangay: 'Resident Barangay'
    };
    
    const residentSignup = await signup(residentData);
    if (residentSignup) testsPassed++;
    
    // Test 7: Resident Login
    testsTotal++;
    const residentLogin = await login(residentData.email, residentData.password);
    if (residentLogin?.token) testsPassed++;
    const residentToken = residentLogin?.token;
    
    // Test 8: Update Location
    testsTotal++;
    if (residentToken && await updateLocation(residentToken)) testsPassed++;
    
    // Test 9: Create Emergency
    testsTotal++;
    const emergencyData = {
      type: 'FLOOD',
      description: 'Smoke test emergency - flooding in test area',
      location: { lat: 14.5995, lng: 120.9842 }
    };
    
    let emergency = null;
    if (residentToken) {
      emergency = await createEmergency(residentToken, emergencyData);
      if (emergency) testsPassed++;
    }
    
    // Test 10: List Emergencies
    testsTotal++;
    if (adminToken && await listEmergencies(adminToken)) testsPassed++;
    
    // Test 11: Assign Responder
    testsTotal++;
    if (adminToken && emergency?.id && responderSignup?.user?.id) {
      const assignment = await assignResponder(adminToken, emergency.id, responderSignup.user.id);
      if (assignment) testsPassed++;
    }
    
    // Test 12: Accept Assignment
    testsTotal++;
    if (responderToken && emergency?.id) {
      const acceptance = await acceptAssignment(responderToken, emergency.id);
      if (acceptance) testsPassed++;
    }
    
    // Test 13: Mark Arrived
    testsTotal++;
    if (responderToken && emergency?.id) {
      const arrived = await markArrived(responderToken, emergency.id);
      if (arrived) testsPassed++;
    }
    
    // Test 14: Get Emergency History
    testsTotal++;
    if (adminToken && emergency?.id) {
      const history = await getEmergencyHistory(adminToken, emergency.id);
      if (history) testsPassed++;
    }
    
    // Test 15: Create Evacuation Center
    testsTotal++;
    if (adminToken && await createEvacuationCenter(adminToken)) testsPassed++;
    
    // Test 16: Create Weather Alert
    testsTotal++;
    if (adminToken && await createWeatherAlert(adminToken)) testsPassed++;
    
    // Test 17: Resolve Emergency
    testsTotal++;
    if (adminToken && emergency?.id) {
      const resolved = await resolveEmergency(adminToken, emergency.id);
      if (resolved) testsPassed++;
    }
    
    // Test 18: Prevent Duplicate Emergency (should fail)
    testsTotal++;
    if (residentToken) {
      const duplicateEmergency = await createEmergency(residentToken, emergencyData);
      // This should fail since previous emergency was just resolved, but let's test anyway
      if (duplicateEmergency === null) testsPassed++; // null means it failed as expected
    }
    
  } catch (error) {
    console.log('\n💥 Critical error during smoke test:', error.message);
  }
  
  // Results
  console.log('\n' + '='.repeat(60));
  console.log('📊 SMOKE TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsTotal - testsPassed}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / testsTotal) * 100)}%`);
  
  if (testsPassed === testsTotal) {
    console.log('\n🎉 ALL TESTS PASSED! Production backend is working correctly.');
  } else if (testsPassed / testsTotal >= 0.8) {
    console.log('\n✅ Most tests passed. Backend is mostly functional.');
  } else {
    console.log('\n⚠️  Many tests failed. Backend needs attention.');
  }
  
  console.log('\n🏁 Smoke test completed.');
}

// Run the smoke test
runSmokeTest().catch(console.error);