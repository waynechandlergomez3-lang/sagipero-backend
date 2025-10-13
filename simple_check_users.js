const { PrismaClient } = require('@prisma/client');

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
    
    // Test login with the first user if available
    if (users.length > 0) {
      console.log('\n🔍 Using first user for auth test:', users[0].email);
      return users[0].email;
    } else {
      console.log('No users found');
      return null;
    }
    
  } catch (error) {
    console.error('Database error:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers().then(email => {
  if (email) {
    console.log(`\n✅ Use this email for testing: ${email}`);
    console.log('You may need to check what password was used or reset it');
  }
});