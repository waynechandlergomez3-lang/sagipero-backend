const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();
(async ()=>{
  try {
    const rows = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='emergency_history'`;
    console.log('pg_tables lookup:', rows);
  } catch(e){
    console.error('err', e);
  } finally {
    await prisma.$disconnect();
  }
})();
