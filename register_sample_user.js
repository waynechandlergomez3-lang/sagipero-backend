const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function registerSampleUser() {
  const prisma = new PrismaClient();
  try {
    const email = 'sampleuser@email.com';
    const password = 'pw123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        password: hashedPassword,
        name: 'Sample User',
        role: 'RESIDENT',
        updatedAt: new Date(),
        createdAt: new Date()
      }
    });
    console.log('✅ Registered user:', user.email);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️ User already exists:', error.meta.target);
    } else {
      console.error('❌ Error registering user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

registerSampleUser();