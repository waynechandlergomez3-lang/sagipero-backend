// Assign random barangay (Barangay 1..5) to all users that have NULL barangay
const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main(){
  const users = await prisma.user.findMany({ where: { barangay: null }, select: { id: true } });
  console.log('Users without barangay:', users.length);
  const choices = ['Barangay 1','Barangay 2','Barangay 3','Barangay 4','Barangay 5'];
  for(const u of users){
    const pick = choices[Math.floor(Math.random()*choices.length)];
    await prisma.user.update({ where: { id: u.id }, data: { barangay: pick } });
  }
  console.log('Assigned barangay to users.');
  await prisma.$disconnect();
}

main().catch(e=>{ console.error(e); process.exit(1); });
