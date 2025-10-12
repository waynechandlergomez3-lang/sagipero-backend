const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();
(async ()=>{
  try{
    const r = await prisma.user.findMany({ where: { role: 'RESPONDER' }, select: { id: true, email: true, name: true } });
    console.log('responders:', r);
  }catch(e){
    console.error(e); process.exitCode=1;
  }finally{ await prisma.$disconnect(); }
})();
