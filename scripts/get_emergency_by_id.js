const { PrismaClient } = require('../src/generated/prisma');
const p = new PrismaClient();
(async () => {
  try {
    const id = 'b71dcf99-826e-4b89-84bd-f39ecf487c56';
    const e = await p.emergency.findUnique({ where: { id } });
    console.log('emergency:', e);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await p.$disconnect();
  }
})();
