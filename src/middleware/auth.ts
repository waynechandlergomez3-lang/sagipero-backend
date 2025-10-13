import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { rawDb } from '../services/rawDatabase';

import { AuthRequest } from '../types/custom';

export const auth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  console.log('🔐 AUTH MIDDLEWARE STARTED');
  
  try {
    const authHeader = req.header('Authorization');
    console.log('🔍 Authorization header:', authHeader ? `Present (${authHeader.substring(0, 20)}...)` : 'Missing');
    
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ No token provided');
      res.status(401).json({ error: 'Please authenticate' });
      return;
    }

    console.log('🎫 Token extracted:', token.substring(0, 50) + '...');

    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('✅ Token verified successfully:', decoded);
    } catch (err) {
      console.log('❌ Token verification failed:', err);
      res.status(401).json({ error: 'Please authenticate' });
      return;
    }

    console.log('🔍 Looking up user with ID:', decoded.userId);
    
    try {
      console.log('� Using raw database service for auth to avoid prepared statement conflicts');
      
      const user = await rawDb.getUserById(decoded.userId);
      console.log('🔍 User lookup result:', user ? `Found: ${user.email}` : 'Not found');

      if (!user) {
        console.log('❌ User not found for id:', decoded.userId);
        res.status(401).json({ error: 'Please authenticate' });
        return;
      }

      req.user = user;
      console.log('✅ Auth middleware successful via raw database service, proceeding to route');
      next();
      return;
      
    } catch (dbError) {
      console.error('� Raw database error in auth middleware:', dbError);
      res.status(401).json({ error: 'Please authenticate' });
      return;
    }

  } catch (error) {
    console.error('💥 Auth middleware error:', error instanceof Error ? error.message : error);
    console.error('💥 Full error:', error);
    res.status(401).json({ error: 'Please authenticate' });
    return;
  }
};
