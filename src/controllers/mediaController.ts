import { Response } from 'express'
import { db } from '../services/database'
import { AuthRequest } from '../types/custom'
import { randomUUID } from 'crypto'

export const uploadMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    const { description } = req.body as any

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file provided' })
      return
    }

    // Determine media type from file mimetype
    let mediaType = 'photo'
    if (req.file.mimetype.startsWith('video')) {
      mediaType = 'video'
    }

    // Create media URL from the uploaded file path
    const mediaUrl = `/uploads/${req.file.filename}`

    const submission = await db.withRetry(async (client) => {
      return await client.citizenMedia.create({
        data: {
          id: randomUUID(),
          userId,
          mediaUrl,
          mediaType,
          caption: description || null,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    })

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: submission
    })
  } catch (err) {
    console.error('uploadMedia error', err)
    res.status(500).json({ error: 'Failed to upload media', details: err instanceof Error ? err.message : 'Unknown error' })
  }
}

export const createMediaSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { mediaUrl, mediaType, caption } = req.body as any
    const userId = req.user?.id

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    if (!mediaUrl) {
      res.status(400).json({ error: 'mediaUrl is required' })
      return
    }

    // Validate media type
    const validTypes = ['photo', 'video']
    if (mediaType && !validTypes.includes(mediaType.toLowerCase())) {
      res.status(400).json({ error: 'Invalid mediaType. Must be "photo" or "video"' })
      return
    }

    const submission = await db.withRetry(async (client) => {
      return await client.citizenMedia.create({
        data: {
          id: randomUUID(),
          userId,
          mediaUrl,
          mediaType: mediaType || 'photo',
          caption: caption || null,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    })

    res.status(201).json(submission)
  } catch (err) {
    console.error('createMediaSubmission error', err)
    res.status(500).json({ error: 'Failed to create media submission' })
  }
}

export const listMyMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const media = await db.withRetry(async (client) => {
      return await client.citizenMedia.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
    })

    res.json(media)
  } catch (err) {
    console.error('listMyMedia error', err)
    res.status(500).json({ error: 'Failed to list media' })
  }
}

export const listAllMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined
    const userIdFilter = typeof req.query.userId === 'string' ? req.query.userId : undefined

    const where: any = {}
    if (statusFilter) where.status = statusFilter
    if (userIdFilter) where.userId = userIdFilter

    const media = await db.withRetry(async (client) => {
      return await client.citizenMedia.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          User: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              barangay: true
            }
          }
        }
      })
    })

    res.json(media)
  } catch (err) {
    console.error('listAllMedia error', err)
    res.status(500).json({ error: 'Failed to list media' })
  }
}

export const updateMediaStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const { id } = req.params as any
    const { status, notes } = req.body as any

    if (!status) {
      res.status(400).json({ error: 'status is required' })
      return
    }

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED']
    if (!validStatuses.includes(status.toUpperCase())) {
      res.status(400).json({ error: 'Invalid status' })
      return
    }

    const media = await db.withRetry(async (client) => {
      return await client.citizenMedia.update({
        where: { id },
        data: {
          status: status.toUpperCase(),
          reviewedAt: new Date(),
          reviewedBy: req.user?.id,
          notes: notes || null,
          updatedAt: new Date()
        }
      })
    })

    res.json(media)
  } catch (err) {
    console.error('updateMediaStatus error', err)
    res.status(500).json({ error: 'Failed to update media status' })
  }
}

export const deleteMediaSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as any
    const userId = req.user?.id

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    // Check if media belongs to user or user is admin
    const media = await db.withRetry(async (client) => {
      return await client.citizenMedia.findUnique({ where: { id } })
    })

    if (!media) {
      res.status(404).json({ error: 'Media not found' })
      return
    }

    if (media.userId !== userId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    await db.withRetry(async (client) => {
      return await client.citizenMedia.delete({ where: { id } })
    })

    res.json({ status: 'deleted' })
  } catch (err) {
    console.error('deleteMediaSubmission error', err)
    res.status(500).json({ error: 'Failed to delete media' })
  }
}

export const getMediaStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const stats = await db.withRetry(async (client) => {
      const total = await client.citizenMedia.count()
      const pending = await client.citizenMedia.count({ where: { status: 'PENDING' } })
      const approved = await client.citizenMedia.count({ where: { status: 'APPROVED' } })
      const rejected = await client.citizenMedia.count({ where: { status: 'REJECTED' } })

      return { total, pending, approved, rejected }
    })

    res.json(stats)
  } catch (err) {
    console.error('getMediaStats error', err)
    res.status(500).json({ error: 'Failed to get media stats' })
  }
}
