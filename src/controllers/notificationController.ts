import { Response } from 'express';
import { db } from '../index';
import { AuthRequest } from '../types/custom';
import { rawDb } from '../services/rawDatabase';

export const listNotifications = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    console.log('listNotifications: using raw database service for listing notifications');
    const notifications = await rawDb.listNotifications(req.user.id);

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

    console.log('markAsRead: using raw database service for checking notification');
    const notif = await rawDb.getNotificationById(id);
    
    if (!notif || notif.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    const updated = await db.withRetry(async (prisma) => 
      prisma.notification.update({ where: { id }, data: { isRead: true } })
    );
    res.json(updated);
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to mark notification' });
  }
};

export const markAllRead = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    await db.withRetry(async (prisma) => 
      prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } })
    );
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

    const notif = await db.withRetry(async (prisma) => prisma.notification.create({
      data: {
        userId: userId ,
        type: type || 'SYSTEM',
        title,
        message,
        data: data || {}
      }
    }));

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

export const sendNotification = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const { userId, role, title, message, data, all } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Missing title or message' });

    const pushStore = require('../utils/pushStore').default || require('../utils/pushStore');
    const push = require('../utils/push').default || require('../utils/push');

    // Helper to create notification in DB
    const createNotifFor = async (uid: string) => {
      try {
        await db.withRetry(async (prisma) => prisma.notification.create({ data: { userId: uid, type: 'SYSTEM', title, message, data: data || {} } }));
      } catch (e) { console.warn('createNotifFor failed for', uid, e); }
    };

    // Send to all registered tokens
    if (all) {
      const list = pushStore.listTokens();
  const uniqueUserIds: string[] = Array.from(new Set(list.map((l: any) => String(l.userId))));
      // create DB notifications (best-effort)
      for (const uid of uniqueUserIds) await createNotifFor(uid);
      // send push
      const tokens = list.map((l: any) => l.token);
      const tickets = await push.sendPushToTokens(tokens, title, message, data || {});
      return res.json({ status: 'sent', count: tokens.length, tickets });
    }

    // Send to role (ADMIN / RESPONDER / RESIDENT)
    if (role) {
      try {
        const { rawDb } = require('../services/rawDatabase');
      } catch (e) {}
      // use rawDb to list users by role
      const { rawDb } = require('../services/rawDatabase');
      const users = await rawDb.listUsers(role);
  const ids: string[] = users.map((u: any) => String(u.id));
      // create records and collect tokens
      const allTokens = pushStore.listTokens();
      const targetTokens = allTokens.filter((t: any) => ids.includes(t.userId)).map((t: any) => t.token);
      for (const uid of ids) await createNotifFor(uid);
      if (targetTokens.length > 0) {
        const tickets = await push.sendPushToTokens(targetTokens, title, message, data || {});
        return res.json({ status: 'sent', count: targetTokens.length, tickets });
      }
      return res.json({ status: 'ok', count: 0 });
    }

    // Send to a specific user
    if (userId) {
      // create DB notification
      const notif = await db.withRetry(async (prisma) => prisma.notification.create({ data: { userId: userId, type: 'SYSTEM', title, message, data: data || {} } }));
      // send push if tokens exist
      const tokens = pushStore.listTokens().filter((t: any) => t.userId === userId).map((t: any) => t.token);
      if (tokens.length > 0) await push.sendPushToTokens(tokens, title, message, data || {});
      return res.json({ status: 'sent', notif });
    }

    return res.status(400).json({ error: 'No target specified' });
  } catch (err) {
    console.error('sendNotification error:', err);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
};
