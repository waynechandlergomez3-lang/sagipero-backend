const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function simulateLoginController() {
  const prisma = new PrismaClient();
  try {
    console.log('🧪 SIMULATING LOGIN CONTROLLER LOGIC');
    console.log('====================================');
    
    const email = 'sampleuser@email.com';
    const password = 'pw123';
    
    console.log('Input credentials:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    
    // Step 1: Find user (same query as login controller)
    console.log('\n1️⃣ Finding user in database...');
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        barangay: true,
        specialCircumstances: true,
        medicalConditions: true,
        allergies: true,
        bloodType: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true
      }
    });
    
    console.log('User found:', user ? '✅ YES' : '❌ NO');
    
    if (!user) {
      console.log('❌ LOGIN FAILED: User not found');
      return;
    }
    
    console.log('User data:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);
    console.log('  Password hash:', user.password ? 'Present' : 'Missing');
    
    // Step 2: Verify password (same logic as login controller)
    console.log('\n2️⃣ Verifying password...');
    console.log('Input password:', password);
    console.log('Stored hash preview:', user.password.substring(0, 20) + '...');
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid ? '✅ YES' : '❌ NO');
    
    if (!isPasswordValid) {
      console.log('❌ LOGIN FAILED: Invalid password');
      return;
    }
    
    // Step 3: Generate token (simulate)
    console.log('\n3️⃣ Would generate token...');
    console.log('✅ LOGIN SUCCESS: All checks passed');
    
    // Compare with working user
    console.log('\n4️⃣ Comparing with working admin user...');
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@sagipero.local' },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true
      }
    });
    
    if (adminUser) {
      console.log('Admin user found:', '✅ YES');
      const adminPasswordValid = await bcrypt.compare('adminpassword', adminUser.password);
      console.log('Admin password valid:', adminPasswordValid ? '✅ YES' : '❌ NO');
    }
    
  } catch (error) {
    console.error('❌ Error in login simulation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateLoginController();