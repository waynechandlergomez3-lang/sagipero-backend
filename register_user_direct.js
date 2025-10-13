const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function registerUserDirectSQL() {
  const prisma = new PrismaClient();
  try {
    const email = 'sampleuser@email.com';
    const password = 'pw123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    console.log('🔧 Registering user with direct SQL...');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', userId);
    
    // Use raw SQL to insert the user, only using columns that exist
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
    
    console.log('✅ User registered successfully!');
    console.log('Rows affected:', result);
    
    // Verify the user was created
    const user = await prisma.$queryRaw`
      SELECT id, email, name, role, "createdAt" 
      FROM "User" 
      WHERE email = ${email}
    `;
    
    console.log('✅ User verification:', user[0]);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️ User already exists with email:', email);
      
      // Show the existing user
      const existingUser = await prisma.$queryRaw`
        SELECT id, email, name, role, "createdAt"
        FROM "User" 
        WHERE email = ${email}
      `;
      console.log('Existing user:', existingUser[0]);
      
    } else {
      console.error('❌ Error registering user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

registerUserDirectSQL();