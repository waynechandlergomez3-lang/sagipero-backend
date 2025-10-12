import { Router } from 'express';
import { updateLocation, getActiveUserCount } from '../controllers/locationController';
import { auth } from '../middleware/auth';

const router = Router();

router.post('/', auth, updateLocation);
router.get('/active-count', getActiveUserCount);

export default router;
