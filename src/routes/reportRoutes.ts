import { Router } from 'express'
import { getSummary } from '../controllers/reportController'
import { auth } from '../middleware/auth'

const router = Router()

// Reports: summary
router.get('/summary', auth, getSummary)

export default router
