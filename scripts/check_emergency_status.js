const { prisma } = require('../src');

async function main(){
  const id = process.argv[2];
  if(!id){
    console.error('Usage: node check_emergency_status.js <emergencyId>');
    process.exit(1);
  }
  const e = await prisma.emergency.findUnique({ where: { id }, include: { user: true, responder: true } });
  console.log(JSON.stringify(e, null, 2));
}

main().catch(e=>{ console.error(e); process.exit(1); });
