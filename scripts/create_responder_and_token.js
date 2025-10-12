require('dotenv').config();
const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

async function run(){
  const email = process.env.DEV_RESPONDER_EMAIL || 'dev-responder@example';
  let u = await prisma.user.findUnique({ where: { email } });
  if(!u) u = await prisma.user.create({ data: { email, password: 'changeme', name: 'Dev Responder', role: 'RESPONDER' } });
  const token = jwt.sign({ userId: u.id }, JWT_SECRET, { expiresIn: '7d' });
  console.log('RESPONDER_TOKEN=' + token);
  await prisma.$disconnect();
}

run().catch(e=>{ console.error(e); process.exit(1); });
