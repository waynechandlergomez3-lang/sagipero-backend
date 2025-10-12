const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();
(async ()=>{
  const id = process.argv[2];
  if(!id){ console.error('Usage: node get_history.js <emergencyId>'); process.exit(1); }
  try{
    const rows = await prisma.$queryRaw`SELECT id, event_type, payload, created_at FROM public.emergency_history h WHERE h.emergency_id = ${id}::uuid ORDER BY created_at ASC`;
    console.log(JSON.stringify(rows, null, 2));
  }catch(e){ console.error('Error fetching history', e); process.exit(1); }
  finally{ await prisma.$disconnect(); }
})();
