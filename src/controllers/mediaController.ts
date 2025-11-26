import { Response } from 'express'
import { db } from '../services/database'
import { AuthRequest } from '../types/custom'
import { randomUUID } from 'crypto'
import { EmergencyStatus, ResponderStatus } from '../generated/prisma'

export const uploadMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    const { description, emergencyType, location } = req.body as any

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file provided' })
      return
    }

    // Check if user already has an active emergency
    try {
      const activeEmergency = await db.withRetry(async (prisma) => 
        prisma.emergency.findFirst({
          where: {
            userId,
            status: { in: ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ACCEPTED', 'ARRIVED'] }
          }
        })
      )
      
      if (activeEmergency) {
        res.status(400).json({ 
          error: 'You already have an active emergency. Please resolve it before submitting new media.',
          activeEmergencyId: activeEmergency.id,
          activeEmergencyStatus: activeEmergency.status
        })
        return
      }
    } catch (e) {
      console.warn('Failed to check active emergencies', e)
    }

    // Determine media type from file mimetype
    let mediaType = 'photo'
    if (req.file.mimetype.startsWith('video')) {
      mediaType = 'video'
    }

    // Create media URL from the uploaded file path
    const mediaUrl = `/uploads/${req.file.filename}`

    // Parse location if provided
    let parsedLocation = null
    let locationLat = null
    let locationLng = null
    if (location) {
      try {
        if (typeof location === 'string') {
          parsedLocation = JSON.parse(location)
        } else {
          parsedLocation = location
        }
        locationLat = parsedLocation.lat || parsedLocation.latitude
        locationLng = parsedLocation.lng || parsedLocation.longitude
      } catch (e) {
        console.warn('Failed to parse location', e)
      }
    }

    const data: any = {
      id: randomUUID(),
      userId,
      mediaUrl,
      mediaType,
      caption: description || null,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Add optional fields
    if (emergencyType) data.emergencyType = emergencyType
    if (parsedLocation) data.location = parsedLocation
    if (locationLat) data.locationLat = locationLat
    if (locationLng) data.locationLng = locationLng

    const submission = await db.withRetry(async (client) => {
      return await client.citizenMedia.create({ data })
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
        where: Object.keys(where).length > 0 ? where : {},
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

export const verifyMediaAsEmergency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden - only admins can verify media' })
      return
    }

    const { mediaId } = req.body as any
    if (!mediaId) {
      res.status(400).json({ error: 'mediaId is required' })
      return
    }

    // Get the media submission
    const media = await db.withRetry(async (client) => 
      client.citizenMedia.findUnique({ 
        where: { id: mediaId },
        include: { User: { select: { id: true, name: true, phone: true, barangay: true } } }
      })
    )

    if (!media) {
      res.status(404).json({ error: 'Media not found' })
      return
    }

    if (media.status !== 'PENDING') {
      res.status(400).json({ error: 'Only pending media can be verified' })
      return
    }

    // Check if user has active emergency
    const activeEmergency = await db.withRetry(async (prisma) =>
      prisma.emergency.findFirst({
        where: {
          userId: media.userId,
          status: { in: ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ACCEPTED', 'ARRIVED'] }
        }
      })
    )

    if (activeEmergency) {
      // Update media status to REJECTED with note about active emergency
      await db.withRetry(async (client) =>
        client.citizenMedia.update({
          where: { id: mediaId },
          data: {
            status: 'REJECTED',
            reviewedAt: new Date(),
            reviewedBy: req.user?.id,
            notes: `User has active emergency: ${activeEmergency.id} (${activeEmergency.status})`
          }
        })
      )

      res.status(400).json({ 
        error: 'Cannot verify: User has an active emergency',
        userActiveEmergency: {
          id: activeEmergency.id,
          type: activeEmergency.type,
          status: activeEmergency.status,
          createdAt: activeEmergency.createdAt
        }
      })
      return
    }

    // Create emergency from media submission in transaction
    const results = await db.withRetry(async (prisma) => {
      return await prisma.$transaction(async (tx: any) => {
        // 1. Create emergency
        const mediaData = media as any
        const emergency = await tx.emergency.create({
          data: {
            id: randomUUID(),
            type: mediaData.emergencyType || 'CITIZEN_REPORT',
            description: media.caption || 'Citizen media report',
            location: mediaData.location || { lat: mediaData.locationLat, lng: mediaData.locationLng } || {},
            status: EmergencyStatus.PENDING,
            userId: media.userId,
            priority: 2, // Medium priority for citizen reports
            updatedAt: new Date()
          }
        })

        // 2. Update media status to APPROVED
        await tx.citizenMedia.update({
          where: { id: mediaId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedBy: req.user?.id,
            updatedAt: new Date()
          }
        })

        return emergency
      })
    })

    // Log history
    try {
      await db.withRetry(async (prisma) =>
        prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${results.id}::uuid, 'CREATED_FROM_MEDIA', ${JSON.stringify({ mediaId, mediaUrl: media.mediaUrl, verifiedBy: req.user?.id })}::jsonb)`
      )
    } catch (e) {
      console.warn('Failed to record verification history', e)
    }

    // Emit real-time notification
    try {
      const { getIO } = require('../realtime')
      getIO().to('admin_channel').emit('emergency:new', {
        ...results,
        source: 'citizen_media',
        mediaId,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      console.warn('Failed to emit emergency notification', err)
    }

    res.status(201).json({
      status: 'verified',
      message: 'Media verified and emergency created',
      emergency: results
    })
  } catch (err) {
    console.error('verifyMediaAsEmergency error', err)
    res.status(500).json({ error: 'Failed to verify media', details: err instanceof Error ? err.message : 'Unknown error' })
  }
}
