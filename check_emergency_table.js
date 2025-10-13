const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEmergencyTable() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Emergency' 
      ORDER BY ordinal_position
    `;
    console.log('Emergency columns:', columns);
    
    // Also check the actual table content
    const sample = await prisma.emergency.findMany({ take: 1 });
    console.log('Sample emergency:', sample);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmergencyTable();