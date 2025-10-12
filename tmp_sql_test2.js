const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();
(async ()=>{
  try{
  const sql = `SELECT e."id", e."type", e."status", e."priority", e."location", e."address", e."userId", e."responderId", e."createdAt", e."updatedAt", h.event_type as last_event_type, h.payload as last_payload, h.created_at as last_event_at FROM "Emergency" e LEFT JOIN LATERAL ( SELECT event_type, payload, created_at FROM public.emergency_history h WHERE h.emergency_id = e."id"::uuid ORDER BY created_at DESC LIMIT 1 ) h ON TRUE ORDER BY e."createdAt" DESC LIMIT 100`;
    console.log('SQL:', sql.substring(0,200));
    const rows = await prisma.$queryRawUnsafe(sql);
    console.log('rows', rows.length);
  }catch(e){ console.error('ERR', e); }finally{ await prisma.$disconnect(); }
})();
