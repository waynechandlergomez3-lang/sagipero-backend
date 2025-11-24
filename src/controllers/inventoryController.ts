import { Response } from 'express'
import { db } from '../services/database'
import { AuthRequest } from '../types/custom'
import { randomUUID } from 'crypto'

export const listInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const responderId = typeof req.query.responderId === 'string' ? req.query.responderId : undefined
    const availableParam = typeof req.query.available === 'string' ? req.query.available : undefined
    const available = availableParam === undefined ? undefined : (availableParam === 'true' || availableParam === '1')
    const items = await db.withRetry(async (client) => {
      const where: any = {}
      if (responderId) where.responderId = responderId
      if (available !== undefined) where.available = available
      return await client.inventoryItem.findMany({ where: Object.keys(where).length ? where : undefined, orderBy: { createdAt: 'desc' } })
    })
    res.json(items)
  } catch (err) {
    console.error('listInventory error', err)
    res.status(500).json({ error: 'Failed to list inventory' })
  }
}

export const createInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // require admin to create items via admin UI
    if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return }
    const { responderId, name, sku, quantity, unit, notes, isActive, available } = req.body as any
    if (!name) { res.status(400).json({ error: 'Missing name' }); return }
    const item = await db.withRetry(async (client) => client.inventoryItem.create({ data: {
      id: randomUUID(), responderId: responderId || null, name, sku: sku || null, quantity: quantity == null ? 0 : Number(quantity), unit: unit || null, notes: notes || null, isActive: isActive === undefined ? true : !!isActive, available: available === undefined ? true : !!available, updatedAt: new Date()
    }}))
    res.status(201).json(item)
  } catch (err) {
    console.error('createInventoryItem error', err)
    res.status(500).json({ error: 'Failed to create inventory item' })
  }
}

export const updateInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return }
    const { id } = req.params as any
    const { responderId, name, sku, quantity, unit, notes, isActive, available } = req.body as any
    const data: any = {}
    if (responderId !== undefined) data.responderId = responderId
    if (name !== undefined) data.name = name
    if (sku !== undefined) data.sku = sku
    if (quantity !== undefined) data.quantity = Number(quantity)
    if (unit !== undefined) data.unit = unit
    if (notes !== undefined) data.notes = notes
    if (isActive !== undefined) data.isActive = isActive
    if (available !== undefined) data.available = !!available
    if (Object.keys(data).length === 0) { res.status(400).json({ error: 'No fields to update' }); return }
    data.updatedAt = new Date()
    const item = await db.withRetry(async (client) => client.inventoryItem.update({ where: { id }, data }))
    res.json(item)
  } catch (err) {
    console.error('updateInventoryItem error', err)
    res.status(500).json({ error: 'Failed to update inventory item' })
  }
}

export const deleteInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return }
    const { id } = req.params as any
    await db.withRetry(async (client) => client.inventoryItem.delete({ where: { id } }))
    res.json({ status: 'deleted' })
  } catch (err) {
    console.error('deleteInventoryItem error', err)
    res.status(500).json({ error: 'Failed to delete inventory item' })
  }
}

export const inventorySummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summary = await db.withRetry(async (client) => {
      const totalItems = await client.inventoryItem.count()
      const totalQuantityRaw: any = await client.$queryRaw`SELECT COALESCE(SUM(quantity)::int,0) as total FROM "InventoryItem"`
      const totalQuantity = (totalQuantityRaw && totalQuantityRaw[0] && totalQuantityRaw[0].total) || 0
      const availableRaw: any = await client.$queryRaw`SELECT COALESCE(SUM(CASE WHEN "available" THEN 1 ELSE 0 END)::int,0) as available_count FROM "InventoryItem"`
      const availableCount = (availableRaw && availableRaw[0] && availableRaw[0].available_count) || 0
      const unavailableRaw: any = await client.$queryRaw`SELECT COALESCE(SUM(CASE WHEN NOT "available" THEN 1 ELSE 0 END)::int,0) as unavailable_count FROM "InventoryItem"`
      const unavailableCount = (unavailableRaw && unavailableRaw[0] && unavailableRaw[0].unavailable_count) || 0
      return { totalItems, totalQuantity, availableCount, unavailableCount }
    })
    res.json(summary)
  } catch (err) {
    console.error('inventorySummary error', err)
    res.status(500).json({ error: 'Failed to get inventory summary' })
  }
}
