const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main(){
  try{
    const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, barangay: true }, take: 10 });
    console.log('Users:', users.length);
    console.log(users.map(u=>({ id: u.id.slice(0,8), email: u.email, name: u.name, barangay: u.barangay })));
  }catch(e){
    console.error('Prisma error:', e && e.message || e);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main();
