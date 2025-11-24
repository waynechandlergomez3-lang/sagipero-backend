import { Response } from 'express';
import { db } from '../services/database';
import { AuthRequest } from '../types/custom';
import { randomUUID } from 'crypto';

export const listVehicles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // optional responder filter ?responderId=...
    const responderId = typeof req.query.responderId === 'string' ? req.query.responderId : undefined;
    const vehicles = await db.withRetry(async (client) => {
      if (responderId) return await client.vehicle.findMany({ where: { responderId } });
      return await client.vehicle.findMany({ orderBy: { createdAt: 'desc' } });
    });
    res.json(vehicles);
  } catch (err) {
    console.error('listVehicles error', err);
    res.status(500).json({ error: 'Failed to list vehicles' });
  }
}

export const getVehicleById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as any;
    const vehicle = await db.withRetry(async (client) => client.vehicle.findUnique({ where: { id } }));
    if (!vehicle) { res.status(404).json({ error: 'Vehicle not found' }); return; }
    res.json(vehicle);
  } catch (err) {
    console.error('getVehicleById error', err);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
}

export const createVehicle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { responderId, plateNumber, model, color, active } = req.body as any;

    // Admins can create vehicles for any responder. Responders can create vehicles for themselves.
    let targetResponderId: string;
    if (req.user && req.user.role === 'ADMIN') {
      if (!responderId) { res.status(400).json({ error: 'Missing responderId' }); return; }
      targetResponderId = responderId
    } else if (req.user && req.user.role === 'RESPONDER') {
      targetResponderId = req.user.id
    } else {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const vehicle = await db.withRetry(async (client) => {
      return await client.vehicle.create({ data: {
        id: randomUUID(), responderId: targetResponderId, plateNumber: plateNumber || null, model: model || null, color: color || null, active: active === undefined ? true : !!active, updatedAt: new Date()
      }});
    });
    res.status(201).json(vehicle);
  } catch (err) {
    console.error('createVehicle error', err);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
}

export const updateVehicle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as any;
    const { responderId, plateNumber, model, color, active } = req.body as any;

    // Fetch existing vehicle
    const existing = await db.withRetry(async (client) => client.vehicle.findUnique({ where: { id } }));
    if (!existing) { res.status(404).json({ error: 'Vehicle not found' }); return; }

    if (!req.user) { res.status(403).json({ error: 'Forbidden' }); return; }

    // Admins may update any vehicle. Responders may update only their own vehicle.
    if (req.user.role === 'RESPONDER' && existing.responderId !== req.user.id) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (req.user.role !== 'ADMIN' && req.user.role !== 'RESPONDER') { res.status(403).json({ error: 'Forbidden' }); return; }

    const data: any = {};
    // only admins may reassign a vehicle to another responder
    if (req.user.role === 'ADMIN' && responderId !== undefined) data.responderId = responderId;
    if (plateNumber !== undefined) data.plateNumber = plateNumber;
    if (model !== undefined) data.model = model;
    if (color !== undefined) data.color = color;
    if (active !== undefined) data.active = !!active;
    if (Object.keys(data).length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }
    data.updatedAt = new Date();
    const vehicle = await db.withRetry(async (client) => client.vehicle.update({ where: { id }, data }));
    res.json(vehicle);
  } catch (err) {
    console.error('updateVehicle error', err);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
}

export const deleteVehicle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as any;
    const existing = await db.withRetry(async (client) => client.vehicle.findUnique({ where: { id } }));
    if (!existing) { res.status(404).json({ error: 'Vehicle not found' }); return; }
    if (!req.user) { res.status(403).json({ error: 'Forbidden' }); return; }
    // Admins may delete any vehicle; responders may delete their own
    if (req.user.role === 'RESPONDER' && existing.responderId !== req.user.id) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (req.user.role !== 'ADMIN' && req.user.role !== 'RESPONDER') { res.status(403).json({ error: 'Forbidden' }); return; }
    await db.withRetry(async (client) => client.vehicle.delete({ where: { id } }));
    res.json({ status: 'deleted' });
  } catch (err) {
    console.error('deleteVehicle error', err);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
}
