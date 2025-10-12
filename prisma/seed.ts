import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const pw = await bcrypt.hash('adminpassword', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sagipero.local' },
    update: {},
    create: {
      email: 'admin@sagipero.local',
      password: pw,
      name: 'Local Admin',
      role: 'ADMIN'
    }
  });
  console.log('Admin id:', admin.id);

  // create an additional test admin for acceptance tests
  const pwAdmin2 = await bcrypt.hash('admin2password', 10);
  const admin2 = await prisma.user.upsert({
    where: { email: 'admin2@sagipero.local' },
    update: {},
    create: {
      email: 'admin2@sagipero.local',
      password: pwAdmin2,
      name: 'Secondary Admin',
      role: 'ADMIN'
    }
  });
  console.log('Admin2 id:', admin2.id);

  // create responder users for testing emergency responses
  const pwResponder1 = await bcrypt.hash('responder1', 10);
  const responder1 = await prisma.user.upsert({
    where: { email: 'responder1@sagipero.local' },
    update: {},
    create: {
      email: 'responder1@sagipero.local',
      password: pwResponder1,
      name: 'Responder One',
      role: 'RESPONDER',
      phone: '+639171111111'
    }
  });
  console.log('Responder1 id:', responder1.id);

  const pwResponder2 = await bcrypt.hash('responder2', 10);
  const responder2 = await prisma.user.upsert({
    where: { email: 'responder2@sagipero.local' },
    update: {},
    create: {
      email: 'responder2@sagipero.local',
      password: pwResponder2,
      name: 'Responder Two',
      role: 'RESPONDER',
      phone: '+639172222222'
    }
  });
  console.log('Responder2 id:', responder2.id);

  await prisma.evacuationCenter.upsert({
    where: { id: 'evac-1' },
    update: {},
    create: {
      id: 'evac-1',
      name: 'Hagonoy Evac Center 1',
      address: 'Main St., Hagonoy',
      capacity: 200,
      location: { lat: 14.799, lng: 120.787 }
    }
  });

  await prisma.emergencyHotline.upsert({
    where: { id: 'hotline-1' },
    update: {},
    create: {
      id: 'hotline-1',
      name: 'Emergency Hotline',
      number: '911',
      description: 'General emergency line'
    }
  });

  console.log('Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
