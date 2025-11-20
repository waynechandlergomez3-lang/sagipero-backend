import { Router } from 'express';
import { listVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicleController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, listVehicles);
router.get('/:id', auth, getVehicleById);
router.post('/', auth, createVehicle);
router.put('/:id', auth, updateVehicle);
router.delete('/:id', auth, deleteVehicle);

export default router;
