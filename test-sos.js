// Test SOS functionality
// Run: node test-sos.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const io = require('socket.io-client');

const API = 'http://localhost:8080/api';
const SOCKET_URL = 'http://localhost:8080';

const testUser = {
  email: 'resident@sagipero.local',
  password: 'testpass123',
  name: 'Test Resident',
  phone: '+639171234567',
  bloodType: 'O+',
  medicalInfo: { allergies: ['penicillin'], conditions: ['hypertension'] }
};

const testResponder = {
  email: 'responder@sagipero.local',
  password: 'testpass123',
  name: 'Test Responder',
  phone: '+639187654321',
  role: 'RESPONDER'
};

const connectSocket = (token) => {
  return io(SOCKET_URL, {
    auth: { token }
  });
};

(async () => {
  try {
    // 1. Create test responder if not exists
    let responderRes = await fetch(`${API}/users/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testResponder)
    });
    let responder = await responderRes.json();
    console.log('Responder Setup:', responder);

    // Login as responder
    let responderLoginRes = await fetch(`${API}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testResponder.email, password: testResponder.password })
    });
    let responderLogin = await responderLoginRes.json();
    console.log('Responder Login:', responderLogin);

    // Connect responder to socket
    const responderSocket = connectSocket(responderLogin.token);
    responderSocket.on('emergency_alert', (data) => {
      console.log('Responder received emergency alert:', data);
    });

    // Update responder location (near test coordinates)
    await fetch(`${API}/location`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${responderLogin.token}`
      },
      body: JSON.stringify({ latitude: 14.81, longitude: 120.79 }) // Nearby location
    });

    // 2. Create test resident if not exists
    let residentRes = await fetch(`${API}/users/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    let resident = await residentRes.json();
    console.log('Resident Setup:', resident);

    // Login as resident
    let residentLoginRes = await fetch(`${API}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password })
    });
    let residentLogin = await residentLoginRes.json();
    console.log('Resident Login:', residentLogin);

    // 3. Trigger SOS
    console.log('Triggering SOS...');
    let sosRes = await fetch(`${API}/emergencies/sos`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${residentLogin.token}`
      },
      body: JSON.stringify({
        location: { lat: 14.8, lng: 120.78 }
      })
    });
    let sos = await sosRes.json();
    console.log('SOS Response:', sos);

    // Wait for 2 seconds to receive socket notifications
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    responderSocket.disconnect();
    console.log('Test complete!');
  } catch (error) {
    console.error('Test failed:', error);
  }
})();
