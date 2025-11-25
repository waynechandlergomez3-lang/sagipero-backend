import { Router } from 'express'
import { createMediaSubmission, listMyMedia, listAllMedia, updateMediaStatus, deleteMediaSubmission, getMediaStats } from '../controllers/mediaController'
import { auth } from '../middleware/auth'

const router = Router()

// Public/authenticated routes for residents
router.post('/', auth, createMediaSubmission)
router.get('/my-submissions', auth, listMyMedia)
router.delete('/:id', auth, deleteMediaSubmission)

// Admin routes
router.get('/admin/all', auth, listAllMedia)
router.patch('/admin/:id/status', auth, updateMediaStatus)
router.get('/admin/stats', auth, getMediaStats)

export default router
