const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

async function registerUserPlainPassword() {
  const prisma = new PrismaClient();
  try {
    const email = 'sampleuser@email.com';
    const plainPassword = 'pw123'; // Plain text - backend will hash it
    const userId = uuidv4();
    
    console.log('🔧 Registering user with PLAIN PASSWORD...');
    console.log('Email:', email);
    console.log('Password (plain):', plainPassword);
    console.log('User ID:', userId);
    
    // First delete the existing user with wrong password hash
    console.log('\n🗑️ Deleting existing user with wrong password...');
    await prisma.$executeRaw`
      DELETE FROM "User" WHERE email = ${email}
    `;
    console.log('✅ Existing user deleted');
    
    // Hash the password properly using the same method as existing users
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log('🔐 Hashing password for database storage...');
    console.log('Plain password:', plainPassword);
    console.log('Hashed password:', hashedPassword);
    
    // Insert user with properly hashed password
    const result = await prisma.$executeRaw`
      INSERT INTO "User" (
        id, 
        email, 
        password, 
        name, 
        role, 
        "createdAt", 
        "updatedAt"
      ) VALUES (
        ${userId},
        ${email},
        ${hashedPassword},
        'Sample User',
        'RESIDENT'::"UserRole",
        NOW(),
        NOW()
      )
    `;
    
    console.log('✅ User registered with plain password!');
    console.log('Rows affected:', result);
    
    // Verify the user was created
    const user = await prisma.$queryRaw`
      SELECT id, email, name, role, password, "createdAt" 
      FROM "User" 
      WHERE email = ${email}
    `;
    
    console.log('✅ User verification:', {
      id: user[0].id,
      email: user[0].email,
      name: user[0].name,
      role: user[0].role,
      passwordStored: user[0].password, // This should be plain text
      createdAt: user[0].createdAt
    });
    
  } catch (error) {
    console.error('❌ Error registering user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

registerUserPlainPassword();