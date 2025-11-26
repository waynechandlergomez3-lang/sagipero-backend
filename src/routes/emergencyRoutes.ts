import { Router } from 'express';
import { Response } from 'express';
import { createEmergency, listEmergencies, getLatestForUser, getEmergency, assignResponder, updateResponderLocation, listPendingForResponder, requestAssignment, resolveEmergency, getEmergencyHistory, getAllEmergenciesHistory, acceptAssignment, listFraudEmergencies, markFraud, unmarkFraud, dispatchEmergency } from '../controllers/emergencyController';

import { responderArrive } from '../controllers/emergencyController';
import { auth } from '../middleware/auth';
import { body } from 'express-validator';
import { AuthRequest } from '../types/custom';

const router = Router();

// General emergency endpoints
router.post('/', auth, [
  body('type').notEmpty(),
  body('description').notEmpty(),
  body('location').isObject()
], createEmergency);

router.get('/', auth, listEmergencies);

// Get latest emergency for authenticated user
router.get('/latest', auth, getLatestForUser);

// Get single emergency
router.get('/:id', auth, getEmergency);

// Assign a responder to an emergency (admin or system)
router.post('/assign', auth, [ body('emergencyId').notEmpty(), body('responderId').notEmpty() ], assignResponder);

// Dispatch emergency with responder and vehicles (admin only)
router.post('/dispatch', auth, [ body('emergencyId').notEmpty(), body('responderId').notEmpty() ], dispatchEmergency);

// Responder posts location updates for an assigned emergency
router.post('/responder/location', auth, [ body('emergencyId').notEmpty(), body('location').isObject() ], updateResponderLocation);

// Responder: list pending emergencies
router.get('/pending', auth, listPendingForResponder);

// Responder: request assignment for an emergency
router.post('/request', auth, [ body('emergencyId').notEmpty() ], requestAssignment);

// Mark emergency resolved (responder)
router.post('/resolve', auth, [ body('emergencyId').notEmpty() ], resolveEmergency);

// Mark responder arrived at scene
router.post('/arrive', auth, [ body('emergencyId').notEmpty() ], responderArrive);

// Accept an assignment (responder)
router.post('/accept', auth, [ body('emergencyId').notEmpty() ], acceptAssignment);

// history
router.get('/:id/history', auth, getEmergencyHistory);

// fraud management (admin)
router.get('/fraud/list', auth, listFraudEmergencies);
router.put('/:id/mark-fraud', auth, markFraud);
router.put('/:id/unmark-fraud', auth, unmarkFraud);

// overall emergencies history (admin)
router.get('/history/all', auth, (req: AuthRequest, res: Response) => {
  // only admins
  if(req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' })
  return getAllEmergenciesHistory(req, res as any)
});

// SOS specific endpoint
router.post('/sos', auth, [
  body('location').isObject().withMessage('Location is required'),
  body('location.lat').isFloat().withMessage('Valid latitude is required'),
  body('location.lng').isFloat().withMessage('Valid longitude is required'),
  body('type').optional().isIn(['MEDICAL','FIRE','FLOOD','EARTHQUAKE'])
], async (req: AuthRequest, res: Response) => {
  try {
    console.log('Incoming SOS POST body:', JSON.stringify(req.body));
    // Add SOS specific fields to the request
    // allow `type` to be provided either at top-level or nested in location.type
    const incomingType = req.body.type || (req.body.location && req.body.location.type) || undefined;
    const sosData = {
      ...req.body,
      type: incomingType || 'SOS',
      description: req.body.description || 'Emergency SOS Alert',
      priority: 3
    };
    
    // Create a new request object with the SOS data
    const sosRequest = {
      ...req,
      body: sosData
    } as AuthRequest;
    
    await createEmergency(sosRequest, res);
  } catch (error) {
    console.error('SOS endpoint error:', error);
    res.status(500).json({ error: 'Failed to process SOS request' });
  }
});

export default router;
