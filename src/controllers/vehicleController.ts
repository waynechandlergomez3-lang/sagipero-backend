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
    // only admins can create vehicles via admin API
    if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return; }
    const { responderId, plateNumber, model, color, active } = req.body as any;
    if (!responderId) { res.status(400).json({ error: 'Missing responderId' }); return; }
    const vehicle = await db.withRetry(async (client) => {
      return await client.vehicle.create({ data: {
        id: randomUUID(), responderId, plateNumber: plateNumber || null, model: model || null, color: color || null, active: active === undefined ? true : !!active, updatedAt: new Date()
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
    if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return; }
    const { id } = req.params as any;
    const { responderId, plateNumber, model, color, active } = req.body as any;
    const data: any = {};
    if (responderId !== undefined) data.responderId = responderId;
    if (plateNumber !== undefined) data.plateNumber = plateNumber;
    if (model !== undefined) data.model = model;
    if (color !== undefined) data.color = color;
    if (active !== undefined) data.active = active;
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
    if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return; }
    const { id } = req.params as any;
    await db.withRetry(async (client) => client.vehicle.delete({ where: { id } }));
    res.json({ status: 'deleted' });
  } catch (err) {
    console.error('deleteVehicle error', err);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
}
