import { Router } from 'express';
import { createEvacuationCenter, getEvacuationCenters } from '../controllers/evacuationCenterController';
import { auth } from '../middleware/auth';
import { body } from 'express-validator';

const router = Router();

router.post('/', auth, [
  body('name').notEmpty(),
  body('address').notEmpty(),
  body('capacity').isInt({ min: 1 }),
  body('location').isObject(),
  body('contactNumber').optional().isString(),
  body('facilities').optional().isObject()
], createEvacuationCenter);

router.get('/', auth, getEvacuationCenters);

export default router;
