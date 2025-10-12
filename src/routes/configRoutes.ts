import { Router } from 'express'

const router = Router()

router.get('/', (_req, res) => {
  const localIp = process.env.LOCAL_IP || null
  const port = process.env.PORT || '8080'
  const apiBase = localIp ? `http://${localIp}:${port}/api` : null
  const socketBase = localIp ? `http://${localIp}:${port}` : null
  res.json({ apiBase, socketBase, localIp, port })
})

export default router
