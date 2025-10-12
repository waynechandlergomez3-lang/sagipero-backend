import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../types/custom';

export const createEvacuationCenter = async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, capacity, location, contactNumber, facilities } = req.body;
    
    const center = await prisma.evacuationCenter.create({
      data: {
        name,
        address,
        capacity: Number(capacity),
        location,
        contactNumber,
        facilities,
        currentCount: 0,
        isActive: true
      }
    });
    
    res.status(201).json(center);
  } catch (error) {
    console.error('Create Evacuation Center error:', error);
    res.status(500).json({ error: 'Failed to create evacuation center' });
  }
};

// Get all evacuation centers
export const getEvacuationCenters = async (_req: AuthRequest, res: Response) => {
  try {
    const centers = await prisma.evacuationCenter.findMany({
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
        emergencies: {
          select: {
            id: true,
            type: true,
            status: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(centers);
  } catch (error) {
    console.error('Get Evacuation Centers error:', error);
    res.status(500).json({ error: 'Failed to fetch evacuation centers' });
  }
};
