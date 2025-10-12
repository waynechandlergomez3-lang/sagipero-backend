const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();
(async ()=>{
  try{
    const emergencyId = 'b33cc6dd-05ab-41c1-a6d1-18e44067b9fa';
    const responderId = '668a973d-7942-424e-b26c-55b97154f25e';
  const res = await prisma.emergency.update({ where: { id: emergencyId }, data: { responderId, responderLocation: { lat: 14.5995, lng: 120.9842 }, status: 'IN_PROGRESS' } });
    console.log('updated emergency:', res.id, res.responderId);
  }catch(e){
    console.error('error:', e);
    process.exitCode = 1;
  }finally{ await prisma.$disconnect(); }
})();
