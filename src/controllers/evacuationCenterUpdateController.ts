import { Response } from 'express';
import { db } from '../index';
import { AuthRequest } from '../types/custom';

export const updateEvacuationCenter = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id
    const allowed: any = {}
    const { name, address, capacity, contactNumber, facilities, location, isActive, currentCount } = req.body
    if (typeof name !== 'undefined') allowed.name = name
    if (typeof address !== 'undefined') allowed.address = address
    if (typeof capacity !== 'undefined') allowed.capacity = Number(capacity)
    if (typeof contactNumber !== 'undefined') allowed.contactNumber = contactNumber
    if (typeof facilities !== 'undefined') allowed.facilities = facilities
    if (typeof location !== 'undefined') allowed.location = location
    if (typeof isActive !== 'undefined') allowed.isActive = Boolean(isActive)
    if (typeof currentCount !== 'undefined') allowed.currentCount = Number(currentCount)

    const center = await db.withRetry(async (prisma) => prisma.evacuationCenter.update({
      where: { id },
      data: {
        ...allowed,
        updatedAt: new Date()
      }
    }))

    res.json(center)
  } catch (error) {
    console.error('Update Evacuation Center error:', error)
    res.status(500).json({ error: 'Failed to update evacuation center' })
  }
}
