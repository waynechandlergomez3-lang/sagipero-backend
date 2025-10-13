import { Response } from 'express';
import { db } from '../index';
import { AuthRequest } from '../types/custom';
import { randomUUID } from 'crypto';

export const createEvacuationCenter = async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, capacity, location, contactNumber, facilities } = req.body;
    
    const center = await db.withRetry(async (prisma) => prisma.evacuationCenter.create({
      data: {
        id: randomUUID(),
        name,
        address,
        capacity: Number(capacity),
        location,
        contactNumber,
        facilities,
        currentCount: 0,
        isActive: true,
        updatedAt: new Date()
      }
    }));
    
    res.status(201).json(center);
  } catch (error) {
    console.error('Create Evacuation Center error:', error);
    res.status(500).json({ error: 'Failed to create evacuation center' });
  }
};

// Get all evacuation centers
export const getEvacuationCenters = async (_req: AuthRequest, res: Response) => {
  try {
    const centers = await db.withRetry(async (prisma) => prisma.evacuationCenter.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        capacity: true,
        currentCount: true,
        location: true,
        contactNumber: true,
        facilities: true,
        isActive: true,
        Emergency: {
          select: {
            id: true,
            type: true,
            status: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    }));
    res.json(centers);
  } catch (error) {
    console.error('Get Evacuation Centers error:', error);
    res.status(500).json({ error: 'Failed to fetch evacuation centers' });
  }
};
