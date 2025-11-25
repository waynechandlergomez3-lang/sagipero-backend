import { Router } from 'express'
import { listInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, inventorySummary } from '../controllers/inventoryController'
import { auth } from '../middleware/auth'

const router = Router()

// Summary must come before /:id to avoid route matching conflicts
router.get('/summary', auth, inventorySummary)
router.get('/', auth, listInventory)
router.post('/', auth, createInventoryItem)
router.put('/:id', auth, updateInventoryItem)
router.delete('/:id', auth, deleteInventoryItem)

export default router
