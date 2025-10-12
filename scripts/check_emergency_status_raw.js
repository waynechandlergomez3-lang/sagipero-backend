const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();
(async ()=>{
  const id = process.argv[2];
  if(!id){ console.error('Usage: node check_emergency_status_raw.js <id>'); process.exit(1); }
  try{
    const e = await prisma.emergency.findUnique({ where: { id }, include: { user: true, responder: true } });
    console.log(JSON.stringify(e, null, 2));
  }catch(e){ console.error('Error', e); process.exit(1); }
  finally{ await prisma.$disconnect(); }
})();
