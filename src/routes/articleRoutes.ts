import { Router } from 'express'
import { createArticle, listArticles, getLatestArticle } from '../controllers/articleController'
import { auth } from '../middleware/auth'

const router = Router()

router.get('/', auth, listArticles)
router.get('/latest', getLatestArticle)
router.post('/', auth, createArticle)

export default router
