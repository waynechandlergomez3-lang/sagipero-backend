const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API = 'https://sagipero-backend-production.up.railway.app/api';

async function createSampleUser() {
  console.log('🔧 CREATING USER VIA SIGNUP ENDPOINT');
  console.log('====================================');

  const user = {
    email: 'sampleuser@email.com',
    password: 'pw123',
    name: 'Sample User',
    role: 'RESIDENT',
    phone: '+639000000999',
    address: 'Sample Street',
    barangay: 'Sample Barangay'
  };

  try {
    console.log('Creating user:', user.email);
    console.log('Password:', user.password);
    
    const res = await fetch(`${API}/users/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    
    const data = await res.json();
    
    if (res.ok) {
      console.log('✅ User created successfully via signup endpoint!');
      console.log('User ID:', data.user?.id);
      console.log('User name:', data.user?.name);
      console.log('User role:', data.user?.role);
      
      // Test login immediately
      console.log('\n🧪 Testing login with new user...');
      
      const loginRes = await fetch(`${API}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password
        })
      });
      
      const loginData = await loginRes.json();
      
      if (loginRes.ok) {
        console.log('✅ LOGIN SUCCESSFUL!');
        console.log('Token received:', loginData.token ? 'YES' : 'NO');
        console.log('User data:', {
          id: loginData.user?.id,
          email: loginData.user?.email,
          name: loginData.user?.name,
          role: loginData.user?.role
        });
        
        console.log('\n🎉 SUCCESS: User creation and login working perfectly!');
        
      } else {
        console.log('❌ Login failed:', loginData.error);
      }
      
    } else {
      if (data.error && data.error.includes('already exists')) {
        console.log('ℹ️ User already exists, testing login...');
        
        // Test login with existing user
        const loginRes = await fetch(`${API}/users/login`, {
          method: 'POST',  
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            password: user.password
          })
        });
        
        const loginData = await loginRes.json();
        
        if (loginRes.ok) {
          console.log('✅ LOGIN SUCCESSFUL with existing user!');
          console.log('User:', loginData.user?.email);
        } else {
          console.log('❌ Login failed with existing user:', loginData.error);
        }
        
      } else {
        console.log('❌ Signup failed:', data.error || data);
      }
    }
    
  } catch (err) {
    console.error('❌ Network error:', err.message);
  }
}

createSampleUser();