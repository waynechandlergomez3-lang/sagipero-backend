const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function debugUserLogin() {
  const prisma = new PrismaClient();
  try {
    const email = 'sampleuser@email.com';
    const testPassword = 'pw123';
    
    console.log('🔍 DEBUGGING USER LOGIN');
    console.log('=======================');
    
    // Step 1: Check if user exists
    console.log('\n1️⃣ Checking if user exists...');
    const user = await prisma.$queryRaw`
      SELECT id, email, name, password, role 
      FROM "User" 
      WHERE email = ${email}
    `;
    
    if (user.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    console.log('✅ User found:', {
      id: user[0].id,
      email: user[0].email,
      name: user[0].name,
      role: user[0].role
    });
    console.log('Password hash preview:', user[0].password.substring(0, 20) + '...');
    
    // Step 2: Test password verification
    console.log('\n2️⃣ Testing password verification...');
    const isPasswordValid = await bcrypt.compare(testPassword, user[0].password);
    
    if (isPasswordValid) {
      console.log('✅ Password verification: CORRECT');
      console.log('The password hash matches the input password');
    } else {
      console.log('❌ Password verification: INCORRECT');
      console.log('The password hash does NOT match the input password');
      
      // Try creating a new hash to compare
      console.log('\n🔧 Creating fresh hash for comparison...');
      const freshHash = await bcrypt.hash(testPassword, 10);
      console.log('Original hash:', user[0].password);
      console.log('Fresh hash:   ', freshHash);
      
      const freshCheck = await bcrypt.compare(testPassword, freshHash);
      console.log('Fresh hash verification:', freshCheck ? '✅ WORKS' : '❌ BROKEN');
    }
    
    // Step 3: Test the login controller logic manually
    console.log('\n3️⃣ Manual login controller test...');
    console.log('Input email:', email);
    console.log('Input password:', testPassword);
    console.log('DB email:', user[0].email);
    console.log('Email match:', email === user[0].email ? '✅ YES' : '❌ NO');
    console.log('Password hash available:', user[0].password ? '✅ YES' : '❌ NO');
    
  } catch (error) {
    console.error('❌ Error debugging login:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserLogin();