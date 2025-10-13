const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWeatherAlertTable() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'WeatherAlert' 
      ORDER BY ordinal_position
    `;
    console.log('WeatherAlert columns:', columns);
    
    // Also check the actual table content
    const sample = await prisma.weatherAlert.findMany({ take: 1 });
    console.log('Sample weather alert:', sample);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkWeatherAlertTable();