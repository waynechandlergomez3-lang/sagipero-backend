import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../types/custom';

export const listNotifications = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, title: true, message: true, data: true, isRead: true, createdAt: true }
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error listing notifications:', error);
    res.status(500).json({ error: 'Failed to list notifications' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.json(updated);
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to mark notification' });
  }
};

export const markAllRead = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Failed to mark all' });
  }
};

export const createNotification = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const { userId, type, title, message, data } = req.body;
    if (!userId || !title || !message) return res.status(400).json({ error: 'Missing fields' });

    const notif = await prisma.notification.create({
      data: {
        userId: userId ,
        type: type || 'SYSTEM',
        title,
        message,
        data: data || {}
      }
    });

    // emit in real-time
    try {
      const { getIO } = require('../realtime');
      const io = getIO();
      io.to(`user_${userId}`).emit('notification:new', notif);
    } catch (err) {
      console.warn('Failed to emit notification:new', err);
    }

    // send push to user's registered tokens if any
    try {
      const pushStore = require('../utils/pushStore').default || require('../utils/pushStore');
      const push = require('../utils/push').default || require('../utils/push');
      const tokens = (pushStore.listTokens() || []).filter((t: any) => t.userId === userId).map((t: any) => t.token);
      if (tokens.length > 0) {
        await push.sendPushToTokens(tokens, notif.title, notif.message, notif.data || {});
      }
    } catch (err) {
      console.warn('Failed to send push for created notification', err);
    }

    return res.json(notif);
  } catch (err) {
    console.error('Create notification error:', err);
    return res.status(500).json({ error: 'Failed to create notification' });
  }
};
