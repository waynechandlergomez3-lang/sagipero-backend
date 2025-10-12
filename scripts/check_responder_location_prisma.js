const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();
(async ()=>{
  try{
    const e = await prisma.emergency.findMany({ take: 3, select: { id: true, responderLocation: true } });
    console.log('found emergencies:', e);
  }catch(e){
    console.error('prisma error:', e);
    process.exitCode = 1;
  }finally{
    await prisma.$disconnect();
  }
})();
