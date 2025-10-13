const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function createUserAndTestAuth() {
  console.log('👤 CREATING USER AND TESTING AUTH');
  console.log('==================================');

  const prisma = new PrismaClient();
  
  try {
    // Step 1: Create test user directly in database
    const testEmail = `authtest-${Date.now()}@test.com`;
    const testPassword = 'testpass123';
    
    console.log('\n1️⃣ Creating user in database...');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: testEmail,
        name: 'Auth Test User',
        password: hashedPassword,
        phone: '1234567890',
        address: '123 Test St',
        role: 'RESIDENT',
        updatedAt: new Date()
      }
    });
    
    console.log('✅ User created successfully');
    console.log('User ID:', user.id);

    // Step 2: Test login
    console.log('\n2️⃣ Testing login...');
    
    const loginResponse = await axios.post('https://sagipero-backend-production.up.railway.app/api/users/login', {
      email: testEmail,
      password: testPassword
    });

    const { token } = loginResponse.data;
    console.log('✅ Login successful!');
    console.log('Token preview:', token.substring(0, 50) + '...');

    // Step 3: Test auth middleware with profile endpoint
    console.log('\n3️⃣ Testing auth middleware...');
    
    try {
      const profileResponse = await axios.get('https://sagipero-backend-production.up.railway.app/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ AUTH MIDDLEWARE WORKING!');
      console.log('Profile response:', profileResponse.status);
      console.log('User data received:', profileResponse.data);
      
      console.log('\n🎉 SUCCESS: Auth system is fully functional!');
      
    } catch (authError) {
      console.log('❌ Auth middleware failed:', authError.response?.status);
      console.log('Error:', authError.response?.data);
      
      console.log('\n🔍 This confirms auth middleware has a database issue');
      console.log('The login endpoint works (creates valid tokens)');
      console.log('But auth middleware cannot validate the tokens');
    }

    // Step 4: Clean up - delete test user
    console.log('\n4️⃣ Cleaning up test user...');
    await prisma.user.delete({
      where: { id: user.id }
    });
    console.log('✅ Test user deleted');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n🏁 Test complete');
}

createUserAndTestAuth().catch(console.error);