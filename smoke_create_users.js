// Smoke test to create users for admin-web login
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API = 'https://sagipero-backend-production.up.railway.app/api';

const users = [
  {
    email: 'admin@sagipero.local',
    password: 'adminpassword',
    name: 'Admin User',
    role: 'ADMIN',
    phone: '+639000000001',
    address: 'Admin HQ',
    barangay: 'Central'
  },
  {
    email: 'responder@sagipero.local',
    password: 'responder',
    name: 'Responder 1',
    role: 'RESPONDER',
    phone: '+639000000002',
    address: 'Responder Base',
    barangay: 'North'
  },
  {
    email: 'responder1@sagipero.local',
    password: 'responder2',
    name: 'Responder 2',
    role: 'RESPONDER',
    phone: '+639000000003',
    address: 'Responder Base 2',
    barangay: 'South'
  },
  {
    email: 'testuser@sagipero.local',
    password: 'password123',
    name: 'Test User',
    role: 'RESIDENT',
    phone: '+639000000004',
    address: 'Test Street',
    barangay: 'East'
  }
];

async function createUser(user) {
  try {
    const res = await fetch(`${API}/users/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ Created: ${user.email}`);
    } else {
      if (data.error && data.error.includes('already exists')) {
        console.log(`ℹ️  Already exists: ${user.email}`);
      } else {
        console.log(`❌ Failed: ${user.email} -`, data.error || data);
      }
    }
  } catch (err) {
    console.error(`❌ Network error for ${user.email}:`, err.message);
  }
}

(async () => {
  for (const user of users) {
    await createUser(user);
  }
})();
