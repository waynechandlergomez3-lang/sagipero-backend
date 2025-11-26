import { Router, Response } from 'express';
import { signup, login, getProfile, updateProfile, updateSituationStatus, listUsers, updateUserById, deleteUserById, toggleResponderByAdmin, createUserByAdmin, getUserById } from '../controllers/userController';
import { updateLocation } from '../controllers/locationController';
import { db } from '../index';
import { AuthRequest } from '../types/custom';
import { auth } from '../middleware/auth';
import { body } from 'express-validator';
import pushStore from '../utils/pushStore';

const router = Router();

router.post('/signup', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  body('role').optional().isIn(['RESIDENT', 'ADMIN', 'RESPONDER']),
  body('phone').optional(),
  body('address').optional()
], signup);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], login);

// Admin: list users
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  return listUsers(req, res);
});

router.get('/profile', auth, getProfile);
// Get profile (current user)
router.get('/profile', auth, getProfile);

// Update profile (current user)
router.patch('/profile', auth, [
  body('name').optional().notEmpty(),
  body('phone').optional(),
  body('address').optional(),
  body('bloodType').optional(),
  body('emergencyContactName').optional(),
  body('emergencyContactPhone').optional(),
  body('emergencyContactRelation').optional(),
  body('medicalConditions').optional().isArray(),
  body('allergies').optional().isArray(),
  body('responderTypes').optional().isArray(),
  body('specialCircumstances').optional().isArray()
], updateProfile);

router.put('/situation-status', auth, [
  body('status').isIn(['SAFE', 'NEED_ASSISTANCE', 'EMERGENCY'])
], updateSituationStatus);

// Endpoint for responders to update their availability/status
router.post('/status', auth, [
  body('status').isIn(['AVAILABLE', 'ON_DUTY', 'VEHICLE_UNAVAILABLE', 'OFFLINE'])
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { status } = req.body;
  // Persist status using Prisma client
  await db.withRetry(async (prisma) => 
    prisma.user.update({ where: { id: userId }, data: { responderStatus: status } })
  );
    // emit to admin channel
    try { const { getIO } = require('../realtime'); getIO().to('admin_channel').emit('responder:status', { responderId: userId, status }); } catch (e) {}
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Failed to update user status', err);
    return res.status(500).json({ error: 'Failed' });
  }
});

// Register push token for current user
router.post('/push-token', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!token) return res.status(400).json({ error: 'Missing token' });
    pushStore.saveToken(userId, token);
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Failed to save push token', err);
    return res.status(500).json({ error: 'Failed' });
  }
});

// Location sharing endpoints - both POST and PUT for client compatibility
router.post('/location', auth, updateLocation);
router.put('/location', auth, updateLocation);

// Admin: update user
router.put('/:id', auth, async (req: AuthRequest, res: Response) => {
  return updateUserById(req, res);
});

// Admin: get single user
router.get('/:id', auth, async (req: AuthRequest, res: Response) => {
  return getUserById(req, res);
});

// Admin: create user
router.post('/', auth, [
  body('email').isEmail(),
  body('name').notEmpty(),
  body('medicalConditions').optional().isArray(),
  body('allergies').optional().isArray(),
  body('bloodType').optional(),
  body('emergencyContactName').optional(),
  body('emergencyContactPhone').optional(),
  body('emergencyContactRelation').optional()
], async (req: AuthRequest, res: Response) => {
  return createUserByAdmin(req, res);
});

// Admin: delete user
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  return deleteUserById(req, res);
});

// Admin toggle responder status
router.post('/toggle-responder', auth, async (req: AuthRequest, res: Response) => {
  return toggleResponderByAdmin(req, res);
});

export default router;

