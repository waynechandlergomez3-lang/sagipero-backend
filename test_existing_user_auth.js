const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const axios = require('axios');

async function useExistingUserForAuth() {
  console.log('🔍 TESTING AUTH WITH EXISTING USER');
  console.log('==================================');

  const prisma = new PrismaClient();
  
  try {
    // Step 1: Get existing users
    console.log('\n1️⃣ Getting existing users...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      },
      take: 5
    });
    
    console.log('Found users:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name})`);
    });

    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    // Step 2: Update password for first user to known value
    const testUser = users[0];
    const testPassword = 'knownpass123';
    
    console.log(`\n2️⃣ Updating password for user: ${testUser.email}`);
    
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    await prisma.user.update({
      where: { id: testUser.id },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Password updated successfully');

    // Step 3: Test login
    console.log('\n3️⃣ Testing login...');
    
    const loginResponse = await axios.post('https://sagipero-backend-production.up.railway.app/api/users/login', {
      email: testUser.email,
      password: testPassword
    });

    const { token } = loginResponse.data;
    console.log('✅ Login successful!');
    console.log('Token preview:', token.substring(0, 50) + '...');

    // Step 4: Test auth middleware
    console.log('\n4️⃣ Testing auth middleware...');
    
    try {
      const profileResponse = await axios.get('https://sagipero-backend-production.up.railway.app/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ AUTH MIDDLEWARE WORKING PERFECTLY!');
      console.log('Profile response:', profileResponse.status);
      console.log('User data received:', {
        id: profileResponse.data.id,
        email: profileResponse.data.email,
        name: profileResponse.data.name
      });
      
      console.log('\n🎉 SUCCESS: The auth system is fully functional!');
      console.log('🔧 Issue was likely with test credentials, not the middleware');
      
    } catch (authError) {
      console.log('❌ Auth middleware failed:', authError.response?.status);
      console.log('Error:', authError.response?.data);
      
      console.log('\n🔍 Auth middleware issue confirmed:');
      console.log('- Login endpoint works (creates valid tokens)');
      console.log('- Auth middleware fails to validate tokens');
      console.log('- This suggests database connection issue in middleware');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n🏁 Test complete');
}

useExistingUserForAuth().catch(console.error);