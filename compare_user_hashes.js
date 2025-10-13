const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function compareUsers() {
  const prisma = new PrismaClient();
  try {
    console.log('🔍 COMPARING NEW USER VS EXISTING USERS');
    console.log('======================================');
    
    // Step 1: Get the new user
    console.log('\n1️⃣ New user (sampleuser@email.com):');
    const newUser = await prisma.$queryRaw`
      SELECT id, email, name, password, role, "createdAt"
      FROM "User" 
      WHERE email = 'sampleuser@email.com'
    `;
    
    if (newUser.length > 0) {
      console.log('✅ Found new user:', {
        id: newUser[0].id,
        email: newUser[0].email,
        name: newUser[0].name,
        role: newUser[0].role,
        createdAt: newUser[0].createdAt
      });
      console.log('Password hash:', newUser[0].password);
      console.log('Hash starts with:', newUser[0].password.substring(0, 10));
      console.log('Hash length:', newUser[0].password.length);
    }
    
    // Step 2: Get an existing working user
    console.log('\n2️⃣ Existing user (admin@sagipero.local):');
    const existingUser = await prisma.$queryRaw`
      SELECT id, email, name, password, role, "createdAt"
      FROM "User" 
      WHERE email = 'admin@sagipero.local'
    `;
    
    if (existingUser.length > 0) {
      console.log('✅ Found existing user:', {
        id: existingUser[0].id,
        email: existingUser[0].email,
        name: existingUser[0].name,
        role: existingUser[0].role,
        createdAt: existingUser[0].createdAt
      });
      console.log('Password hash:', existingUser[0].password);
      console.log('Hash starts with:', existingUser[0].password.substring(0, 10));
      console.log('Hash length:', existingUser[0].password.length);
    }
    
    // Step 3: Compare hash formats
    if (newUser.length > 0 && existingUser.length > 0) {
      console.log('\n3️⃣ Hash comparison:');
      console.log('New user hash format:     ', newUser[0].password.substring(0, 7), '(bcrypt)');
      console.log('Existing user hash format:', existingUser[0].password.substring(0, 7), '(?)');
      
      const sameFormat = newUser[0].password.substring(0, 4) === existingUser[0].password.substring(0, 4);
      console.log('Same hash format:', sameFormat ? '✅ YES' : '❌ NO');
      
      if (!sameFormat) {
        console.log('\n🔍 ISSUE DETECTED: Different password hash formats!');
        console.log('- New user uses bcrypt ($2b$)');
        console.log('- Existing user might use different hashing method');
        console.log('- This explains why login fails for new user');
      }
    }
    
    // Step 4: Test password verification for both
    console.log('\n4️⃣ Password verification tests:');
    
    if (newUser.length > 0) {
      const newUserValid = await bcrypt.compare('pw123', newUser[0].password);
      console.log('New user password (pw123):', newUserValid ? '✅ VALID' : '❌ INVALID');
    }
    
    if (existingUser.length > 0) {
      const existingUserValid = await bcrypt.compare('adminpassword', existingUser[0].password);
      console.log('Existing user password (adminpassword):', existingUserValid ? '✅ VALID' : '❌ INVALID');
    }
    
  } catch (error) {
    console.error('❌ Error comparing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareUsers();