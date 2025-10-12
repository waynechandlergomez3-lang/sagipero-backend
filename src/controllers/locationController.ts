import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../types/custom';
import { getIO } from '../realtime';

export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const loc = await prisma.location.upsert({
      where: { userId },
      update: { latitude: Number(latitude), longitude: Number(longitude) },
      create: { userId, latitude: Number(latitude), longitude: Number(longitude) }
    });

    // Emit location change
    try { getIO().emit('location_changed', { userId, latitude: loc.latitude, longitude: loc.longitude }); } catch (e) { }

    res.json(loc);
    return;
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Unable to update location' });
    return;
  }
};

export const getActiveUserCount = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get count of locations updated in the last 5 minutes
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const count = await prisma.location.count({
      where: {
        updatedAt: { gte: cutoff }
      }
    });
    res.json({ count });
    return;
  } catch (error) {
    console.error('Active user count error:', error);
    res.status(500).json({ error: 'Unable to get active users' });
    return;
  }
};
