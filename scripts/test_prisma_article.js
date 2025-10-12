// Simple test that imports the generated Prisma client and queries the Article table
const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  try {
    const rows = await prisma.article.findMany({ take: 5 });
    console.log('Found articles:', rows.length);
    console.log(rows);
  } catch (err) {
    console.error('Prisma query error:', err && err.message ? err.message : err);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main();
