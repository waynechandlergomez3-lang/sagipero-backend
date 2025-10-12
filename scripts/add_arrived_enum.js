const { PrismaClient } = require('../src/generated/prisma');

(async () => {
  const prisma = new PrismaClient();
  try {
    console.log('Checking/adding ARRIVED to EmergencyStatus enum...');
    const sql = `DO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid\n    WHERE lower(t.typname) = lower('EmergencyStatus') AND e.enumlabel = 'ARRIVED'\n  ) THEN\n    ALTER TYPE "EmergencyStatus" ADD VALUE 'ARRIVED';\n  END IF;\nEND$$;`;
    await prisma.$executeRawUnsafe(sql);
    console.log('Executed enum update (no-op if already present).');
  } catch (e) {
    console.error('Failed to update enum type:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
