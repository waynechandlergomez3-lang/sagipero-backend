import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { db } from '../index';

import { AuthRequest } from '../types/custom';

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    console.log('Authorization header:', authHeader);
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      console.log('No token provided');
      throw new Error('No token provided');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('Decoded token:', decoded);
    } catch (err) {
      console.log('Token verification failed:', err);
      throw new Error('Invalid token');
    }

    const user = await db.withRetry(async (prisma) => prisma.user.findUnique({
      where: { id: decoded.userId },
      omit: {
        password: true
      }
    }));
    console.log('User lookup result:', user);

    if (!user) {
      console.log('User not found for id:', decoded.userId);
      throw new Error('User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error instanceof Error ? error.message : error);
    res.status(401).json({ error: 'Please authenticate' });
  }
};
