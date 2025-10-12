// Script to add evacuation centers
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API = 'http://localhost:8080/api';

// Test user credentials (we'll need to login first to get a token)
const testUser = {
  email: 'testuser@sagipero.local',
  password: 'testpass123'
};

// Hagonoy Evacuation Centers
const evacuationCenters = [
  {
    name: "Hagonoy Municipal Evacuation Center",
    address: "San Jose, Hagonoy, Bulacan",
    capacity: 500,
    latitude: 14.8344,
    longitude: 120.7319,
    location: {
      lat: 14.8344,
      lng: 120.7319
    },
    contactNumber: "(044) 793-5811",
    facilities: {
      available: [
        "Emergency Power Supply",
        "Clean Water Supply",
        "Medical Station",
        "Kitchen",
        "Restrooms",
        "Sleeping Area"
      ]
    }
  },
  {
    name: "Hagonoy West Central School",
    address: "San Juan, Hagonoy, Bulacan",
    capacity: 300,
    latitude: 14.8367,
    longitude: 120.7336,
    location: {
      lat: 14.8367,
      lng: 120.7336
    },
    facilities: {
      available: [
        "Clean Water Supply",
        "Restrooms",
        "Sleeping Area",
        "Covered Court"
      ]
    }
  },
  {
    name: "Hagonoy National High School",
    address: "Santo Niño, Hagonoy, Bulacan",
    capacity: 400,
    latitude: 14.8375,
    longitude: 120.7347,
    location: {
      lat: 14.8375,
      lng: 120.7347
    },
    facilities: {
      available: [
        "Emergency Power Supply",
        "Clean Water Supply",
        "Restrooms",
        "Covered Court",
        "Kitchen Area"
      ]
    }
  }
];

(async () => {
  try {
    // 1. Login to get token
    console.log('Logging in...');
    const loginRes = await fetch(`${API}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const loginData = await loginRes.json();
    
    if (!loginData.token) {
      console.error('Failed to login:', loginData);
      return;
    }
    
    const token = loginData.token;
    console.log('Successfully logged in');

    // 2. Add each evacuation center
    for (const center of evacuationCenters) {
      console.log(`Creating evacuation center: ${center.name}`);
      const response = await fetch(`${API}/evacuation-centers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(center)
      });
      const data = await response.json();
      console.log('Created:', data);
    }

    console.log('All evacuation centers created successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
})();
