const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTable() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'EvacuationCenter' 
      ORDER BY ordinal_position
    `;
    console.log('EvacuationCenter columns:', columns);
    
    // Also check the actual table content
    const sample = await prisma.evacuationCenter.findMany({ take: 1 });
    console.log('Sample evacuation center:', sample);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();