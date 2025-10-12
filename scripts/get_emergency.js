const { PrismaClient } = require('../src/generated/prisma');
const p = new PrismaClient();
(async ()=>{
  try{
    const e = await p.emergency.findUnique({ where: { id: 'b33cc6dd-05ab-41c1-a6d1-18e44067b9fa' }, select: { id:true, responderId:true, responderLocation:true } });
    console.log('emergency:', e);
  }catch(e){ console.error(e); process.exitCode=1; }finally{ await p.$disconnect(); }
})();
