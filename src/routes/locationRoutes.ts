import { Router } from 'express';
import { updateLocation, getActiveUserCount } from '../controllers/locationController';
import { auth } from '../middleware/auth';

const router = Router();

// Support both POST and PUT for client compatibility
router.post('/', auth, updateLocation);
router.put('/', auth, updateLocation);
router.get('/active-count', getActiveUserCount);

export default router;
