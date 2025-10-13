import { Server, Socket } from 'socket.io';
import { verifyToken } from './utils/jwt';
import { db } from './index';

let io: Server | null = null;

export const setIO = (server: Server) => {
  io = server;

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = verifyToken(token);
      const user = await db.withRetry(async (prisma) => prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true }
      }));

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    if (socket.data.user) {
      // Join user-specific room
      socket.join(`user_${socket.data.user.id}`);
      
      // If user is admin, join admin channel
      if (socket.data.user.role === 'ADMIN') {
        socket.join('admin_channel');
      }
    }
    
    // Listen for responder location updates
    socket.on('responder:location', async (payload: any) => {
      try {
        const user = socket.data.user;
        if (!user) return;
        const { emergencyId, location } = payload || {};
        if (!emergencyId || !location) return;

        // Optional: ensure only responders update locations
        if (user.role !== 'RESPONDER') return;

        // Update emergency's responderLocation and set responderId. Only set status to IN_PROGRESS
        // if the emergency is not already ARRIVED or RESOLVED (avoid clobbering ARRIVED).
        const existing = await db.withRetry(async (prisma) => 
          prisma.emergency.findUnique({ where: { id: emergencyId }, select: { status: true } })
        );
        const shouldSetInProgress = existing && existing.status !== 'ARRIVED' && existing.status !== 'RESOLVED';
        await db.withRetry(async (prisma) => prisma.emergency.update({
          where: { id: emergencyId },
          data: { responderLocation: location, responderId: user.id, ...(shouldSetInProgress ? { status: 'IN_PROGRESS' } : {}) }
        }));

        // Fetch emergency to get userId
        const emergency = await db.withRetry(async (prisma) => 
          prisma.emergency.findUnique({ where: { id: emergencyId } })
        );
        if (emergency) {
          socket.join(`user_${emergency.userId}`); // ensure responder socket also joins resident room to emit
          io?.to(`user_${emergency.userId}`).emit('emergency:responderLocation', { emergencyId, location });
        }
      } catch (err) {
        console.error('responder:location handler error', err);
      }
    });

    // Listen for responder status updates (AVAILABLE/ON_DUTY/OFFLINE)
    socket.on('responder:status', async (payload: any) => {
      try {
        const user = socket.data.user;
        if (!user) return;
        if (user.role !== 'RESPONDER') return;
        const { status } = payload || {};
        if (!status) return;
        // persist to user table
  // Use raw SQL to set responderStatus until Prisma client is regenerated
  await db.withRetry(async (prisma) => 
    prisma.$executeRaw`UPDATE "User" SET "responderStatus" = ${status} WHERE id = ${user.id}`
  );
        // broadcast updated responder availability to admin channel
        io?.to('admin_channel').emit('responder:status', { responderId: user.id, status });
      } catch (err) {
        console.error('responder:status handler error', err);
      }
    });

    // Listen for sos triggered from clients (some clients may emit with additional type info)
    socket.on('sos:triggered', async (payload: any) => {
      try {
        const { emergencyId, location } = payload || {};
        if (!emergencyId) return;

        // If the payload contains a more specific type inside location.type, update the emergency record
        const incomingType = location && (location.type || location?.type);
        if (incomingType && typeof incomingType === 'string') {
          // fetch current emergency
          const existing = await db.withRetry(async (prisma) => 
            prisma.emergency.findUnique({ where: { id: emergencyId } })
          );
          if (existing && existing.type === 'SOS' && existing.id === emergencyId) {
            const normalized = incomingType.toUpperCase();
            if (['MEDICAL','FIRE','FLOOD','EARTHQUAKE'].includes(normalized)) {
              await db.withRetry(async (prisma) => 
                prisma.emergency.update({ where: { id: emergencyId }, data: { type: normalized } })
              );
              // notify admin channel about updated type
              io?.to('admin_channel').emit('emergency:updated', { emergencyId, type: normalized });
            }
          }
        }
      } catch (err) {
        console.error('sos:triggered handler error', err);
      }
    });
  });
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};
