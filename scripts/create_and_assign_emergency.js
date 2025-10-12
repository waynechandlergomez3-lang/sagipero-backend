const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();
(async () => {
  try {
    const userId = '029ce8e6-5831-480a-994e-db9905b7c75d';
    console.log('Creating emergency for user', userId);

    // Create emergency (PENDING)
    const em = await prisma.emergency.create({
      data: {
        type: 'SOS',
        description: 'Automated test emergency created for user.',
        location: { lat: 14.5995, lng: 120.9842 },
        priority: 3,
        status: 'PENDING',
        user: { connect: { id: userId } }
      }
    });
    console.log('Created emergency', em.id);

    // Find responder2 by email, else fallback to any responder
    let responder = await prisma.user.findFirst({ where: { email: 'responder2@sagipero.local', role: 'RESPONDER' } });
    if (!responder) {
      console.log('responder2 not found, picking first responder...');
      responder = await prisma.user.findFirst({ where: { role: 'RESPONDER' } });
    }
    if (!responder) throw new Error('No responder users present in the DB');
    console.log('Using responder:', responder.id, responder.email);

    // Assign responder and set mock responderLocation and set status to IN_PROGRESS
    const updated = await prisma.emergency.update({
      where: { id: em.id },
      data: {
        responderId: responder.id,
        responderLocation: { lat: 14.6000, lng: 120.9850 },
        status: 'IN_PROGRESS'
      }
    });
    console.log('Assigned responder and updated emergency:', updated.id, updated.responderId, updated.responderLocation);

    // Create notification for resident
    const notif = await prisma.notification.create({
      data: {
        user: { connect: { id: userId } },
        type: 'EMERGENCY',
        title: 'Responder Assigned',
        message: `A responder has been assigned to your emergency (${updated.id}).`,
        data: { emergencyId: updated.id }
      }
    });
    console.log('Created notification for resident:', notif.id);

    // Optionally create notification for responder
    try {
      await prisma.notification.create({
        data: {
          user: { connect: { id: responder.id } },
          type: 'EMERGENCY',
          title: 'New Assignment',
          message: `You have been assigned to emergency ${updated.id}.`,
          data: { emergencyId: updated.id }
        }
      });
      console.log('Created notification for responder');
    } catch (e) {
      console.warn('Failed to create notification for responder', e.message || e);
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
