require('dotenv').config();
const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const generateToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

async function run(){
  const adminEmail = process.env.ADMIN_EMAIL || 'dev-admin@example';
  let user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if(!user){
    user = await prisma.user.create({ data: { email: adminEmail, password: 'changeme', name: 'Dev Admin', role: 'ADMIN' } });
    console.log('Created admin user', user.id);
  }
  const token = generateToken(user.id);
  console.log('ADMIN_TOKEN=' + token);
  await prisma.$disconnect();
}

run().catch(e=>{ console.error(e); process.exit(1) });
