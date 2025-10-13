const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient();
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true, // using name instead of firstName/lastName
        role: true
      },
      take: 5
    });
    
    console.log('Found users:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - ${user.role}`);
    });
    
    // Test login with the first user if available
    if (users.length > 0) {
      console.log('\n🔍 First user for testing:', users[0].email);
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
  }
});