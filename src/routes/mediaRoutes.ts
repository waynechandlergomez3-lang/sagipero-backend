import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { createMediaSubmission, listMyMedia, listAllMedia, updateMediaStatus, deleteMediaSubmission, getMediaStats, uploadMedia, verifyMediaAsEmergency } from '../controllers/mediaController'
import { auth } from '../middleware/auth'

// Ensure uploads directory exists (use absolute path to avoid issues with working directory)
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  }
})

const router = Router()

// File upload endpoint
router.post('/upload', auth, upload.single('media'), uploadMedia)

// Public/authenticated routes for residents
router.post('/', auth, createMediaSubmission)
router.get('/my-submissions', auth, listMyMedia)
router.delete('/:id', auth, deleteMediaSubmission)

// Admin routes
router.get('/admin/all', auth, listAllMedia)
router.patch('/admin/:id/status', auth, updateMediaStatus)
router.get('/admin/stats', auth, getMediaStats)
router.post('/admin/verify', auth, verifyMediaAsEmergency)

export default router
