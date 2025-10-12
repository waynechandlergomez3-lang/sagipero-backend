const { PrismaClient } = require('./src/generated/prisma');
const p = new PrismaClient();
(async ()=>{
  try{
    const cols = await p.$queryRaw`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='Emergency'`;
    console.log(cols);
  }catch(e){ console.error(e) }finally{ await p.$disconnect(); }
})();
