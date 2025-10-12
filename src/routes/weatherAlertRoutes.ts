import { Router } from 'express'
import { listWeatherAlerts, createWeatherAlert, deleteWeatherAlert } from '../controllers/weatherAlertController'
import { auth } from '../middleware/auth'

const router = Router()

router.get('/', auth, listWeatherAlerts)
router.post('/', auth, createWeatherAlert)
router.delete('/:id', auth, deleteWeatherAlert)

export default router
