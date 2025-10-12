import { Router } from 'express';
import {
  updateMedicalProfile,
  getCommonMedicalConditions,
  getCommonAllergies,
  uploadDocument,
  getUserDocuments,
  verifyDocument
} from '../controllers/medicalProfileController';
import { auth } from '../middleware/auth';
import multer from 'multer';
import { body } from 'express-validator';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.put('/profile', auth, [
  body('specialCircumstances').optional().isArray(),
  body('medicalConditions').optional().isArray(),
  body('allergies').optional().isArray(),
  body('bloodType').optional().isString(),
  body('emergencyContactName').optional().isString(),
  body('emergencyContactPhone').optional().isString(),
  body('emergencyContactRelation').optional().isString()
], updateMedicalProfile);

router.get('/conditions', auth, getCommonMedicalConditions);
router.get('/allergies', auth, getCommonAllergies);

router.post('/documents', auth, upload.single('document'), [
  body('type').notEmpty().isString()
], uploadDocument);

router.get('/documents', auth, getUserDocuments);

router.put('/documents/:documentId/verify', auth, [
  body('verified').isBoolean()
], verifyDocument);

export default router;
