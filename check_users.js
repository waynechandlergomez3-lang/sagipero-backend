const { PrismaClient } = require('./dist');

async function checkUsers() {
  const prisma = new PrismaClient();
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      },
      take: 5
    });
    
    console.log('Found users:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.firstName} ${user.lastName})`);
    });
    
    if (users.length === 0) {
      console.log('No users found. Creating test user...');
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('securepassword123', 10);
      
      const newUser = await prisma.user.create({
        data: {
          email: 'testuser@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: hashedPassword,
          phoneNumber: '1234567890',
          dateOfBirth: new Date('1990-01-01'),
          address: '123 Test St',
          role: 'RESIDENT'
        }
      });
      
      console.log('✅ Created test user:', newUser.email);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();