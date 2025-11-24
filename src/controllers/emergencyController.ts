import { Response } from 'express';
import { db } from '../index';
import { EmergencyStatus, ResponderStatus } from '../generated/prisma';
import { AuthRequest } from '../types/custom';
import pushStore from '../utils/pushStore';
import push from '../utils/push';
import { randomUUID } from 'crypto';
import { rawDb } from '../services/rawDatabase';
//force commit
export const createEmergency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n=== Creating Emergency ===');
      console.log('Request User:', req.user);
      console.log('Request Body:', JSON.stringify(req.body, null, 2));
    }
    
    let { type, description, location } = req.body;
    // normalize type
    if (typeof type === 'string') type = type.toUpperCase();
    // ensure location has lat/lng keys
    if (location && location.lat && location.lng) {
      location = { lat: Number(location.lat), lng: Number(location.lng) };
    }
    const userId = req.user?.id;
    
    if (!userId) {
      console.log('Authentication failed: No user ID in request');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

  // Fetch reporting user details so we can compute priority from their special/medical conditions
  console.log('createEmergency: using raw database service for fetching user details');
  const reportingUser = await rawDb.getUserForEmergency(userId);

  // Determine priority based on user's circumstances
  // New mapping:
  // - specialCircumstances (other than NONE) -> priority 1 (MOST SEVERE)
  // - medicalConditions present -> priority 2
  // - otherwise -> priority 3 (LEAST SEVERE / normal)
  // Normalize fields from raw DB (they may come back as JSON strings)
  let specialArr: any[] = [];
  let medicalArr: any[] = [];
  try {
    const rawSpecial = reportingUser?.specialCircumstances;
    if (Array.isArray(rawSpecial)) specialArr = rawSpecial;
    else if (typeof rawSpecial === 'string' && rawSpecial.length) {
      try { specialArr = JSON.parse(rawSpecial); } catch(e) { specialArr = [rawSpecial]; }
    }
  } catch (e) { specialArr = []; }
  try {
    const rawMedical = reportingUser?.medicalConditions;
    if (Array.isArray(rawMedical)) medicalArr = rawMedical;
    else if (typeof rawMedical === 'string' && rawMedical.length) {
      try { medicalArr = JSON.parse(rawMedical); } catch(e) { medicalArr = [rawMedical]; }
    }
  } catch (e) { medicalArr = []; }

  const hasSpecial = specialArr.some((s: any) => s && s !== 'NONE');
  const hasMedical = medicalArr.length > 0;

  // New mapping: 1 = MOST SEVERE (special), 2 = MEDIUM (medical), 3 = LEAST (normal)
  let priority = 3;
  if (hasSpecial) priority = 1;
  else if (hasMedical) priority = 2;
    
  // enforce one active emergency per user
  console.log('createEmergency: using raw database service for checking existing emergency');
  const existing = await rawDb.getActiveEmergencyForUser(userId);
  if (existing) { res.status(400).json({ error: 'You already have an active emergency' }); return; }

  const emergency = await db.withRetry(async (prisma) => prisma.emergency.create({
      data: {
        id: randomUUID(),
        type: type || 'SOS',
        description: description || 'Emergency reported',
        location: location || {},
        priority,
        status: EmergencyStatus.PENDING,
        userId: userId,
        updatedAt: new Date()
      },
      include: {
        User_Emergency_userIdToUser: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true
          }
        }
      }
    })
  );

    // Get Socket.IO instance
    const { getIO } = require('../realtime');
    const io = getIO();
    
    // Notify admin channel about new emergency
    io.to('admin_channel').emit('emergency:new', {
      ...emergency,
      timestamp: new Date().toISOString()
    });

    // Create notification for user
    const notif = await db.withRetry(async (prisma) => prisma.notification.create({
      data: {
        type: 'EMERGENCY',
        title: 'Emergency Created',
        message: `Your emergency has been created and responders have been notified.`,
        data: { emergencyId: emergency.id },
        userId: userId
      }
    }));

    // Emit real-time notification to the user
    try {
      const { getIO } = require('../realtime');
      const io = getIO();
      io.to(`user_${userId}`).emit('notification:new', notif);
    } catch (err) {
      console.warn('Failed to emit notification via socket:', err);
    }

    // Send push notification via Expo if token exists
    try {
      const tokens = pushStore.listTokens().filter(t => t.userId === userId).map(t => t.token);
      if (tokens.length > 0) {
        await push.sendPushToTokens(tokens, 'Emergency Created', 'Your emergency was received and responders notified.', { emergencyId: emergency.id });
      }
      // Notify admins and responders so staff get notified on their phones
      try {
        // find admin and responder users
        console.log('createEmergency: using raw database service for getting staff users');
        const staff = await rawDb.getStaffUsers();
        const staffIds = staff.map((s: any) => s.id);
        const allTokens = pushStore.listTokens();
        const staffTokens = allTokens.filter(t => staffIds.includes(t.userId)).map(t => t.token);
        if (staffTokens.length > 0) {
          // create a generic notification record for staff
          for (const sid of staffIds) {
            try {
              await db.withRetry(async (prisma) => 
                prisma.notification.create({ data: { userId: sid, type: 'EMERGENCY', title: 'New Emergency', message: `A new emergency was reported: ${emergency.type}`, data: { emergencyId: emergency.id } } })
              );
            } catch (e) { /* ignore per-user failures */ }
          }
          await push.sendPushToTokens(staffTokens, 'New Emergency', `Emergency reported: ${emergency.type}`, { emergencyId: emergency.id });
        }
      } catch (e) {
        console.warn('Failed to notify staff about new emergency', e);
      }
    } catch (err) {
      console.warn('Failed to send push notification:', err);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Created Emergency:', JSON.stringify(emergency, null, 2));
    }

  // record history
  try {
    await db.withRetry(async (prisma) => 
      prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${emergency.id}::uuid, 'CREATED', ${JSON.stringify(emergency)}::jsonb)`
    );
  } catch(e){ console.warn('Failed to record emergency history', e) }

    res.status(201).json(emergency);
  } catch (error) {
    console.error('Create emergency error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ error: 'Unable to create emergency' });
  }
};

export const listEmergencies = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('listEmergencies: using raw database service for listing emergencies');
    const emergencies = await rawDb.listEmergencies();
    console.log('listEmergencies: found', (emergencies || []).length, 'records');
    res.json(emergencies);
  } catch (error) {
    console.error('List emergencies error:', error);
    res.status(500).json({ error: 'Unable to list emergencies' });
  }
};

export const getEmergency = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing emergency id' });
    
    console.log('getEmergency: using raw database service for fetching emergency');
    const emergency = await rawDb.getEmergencyById(id);
    
    if (!emergency) return res.status(404).json({ error: 'Emergency not found' });

    // Do not expose resolved emergencies to admins or responders via this endpoint
    const requesterRole = req.user?.role;
    if ((requesterRole === 'ADMIN' || requesterRole === 'RESPONDER') && emergency.status === 'RESOLVED') {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    return res.json(emergency);
  } catch (err) {
    console.error('Get emergency error:', err);
  return res.status(500).json({ error: 'Unable to fetch emergency' });
  }
};

export const getLatestForUser = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    console.log('getLatestForUser: using raw database service for fetching latest emergency');
    const emergency = await rawDb.getLatestEmergencyForUser(userId);
    
    if (!emergency) return res.status(404).json({ error: 'No emergencies found' });
    return res.json(emergency);
  } catch (err) {
    console.error('Get latest emergency error:', err);
    return res.status(500).json({ error: 'Unable to fetch latest emergency' });
  }
};

export const getAllEmergenciesHistory = async (_req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    // Return a list of emergencies with key fields and an aggregated latest history entry
    const rows = await db.withRetry(async (prisma) => prisma.$queryRaw`
      SELECT e."id", e."type", e."status", e."priority", e."location", e."address", e."userId", e."responderId", e."createdAt", e."updatedAt",
             r.name as responder_name,
             h.event_type as last_event_type, h.payload as last_event_payload, h.created_at as last_event_at
      FROM "Emergency" e
      LEFT JOIN "User" r ON r.id = e."responderId"
      LEFT JOIN LATERAL (
        SELECT event_type, payload, created_at FROM public.emergency_history h WHERE h.emergency_id = e."id"::uuid ORDER BY created_at DESC LIMIT 1
      ) h ON TRUE
      ORDER BY e."createdAt" DESC
      LIMIT 100
    `);

    return res.json(rows);
  } catch (e) {
    console.error('Get all emergencies history error', e);
    return res.status(500).json({ error: 'Failed' });
  }
}

export const listPendingForResponder = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    // Only responders should call this
    if (!req.user || req.user.role !== 'RESPONDER') return res.status(403).json({ error: 'Forbidden' });

    console.log('listPendingForResponder: using raw database service for listing pending emergencies');
    const emergencies = await rawDb.listPendingEmergencies();

    // Transform data to match expected format
    const simplified = emergencies.map((e: any) => ({ 
      id: e.id, 
      type: e.type, 
      address: e.address, 
      location: e.location, 
      createdAt: e.createdAt, 
      user: { name: e.userName, phone: e.userPhone }, 
      priority: e.priority 
    }));
    return res.json(simplified);
  } catch (err) {
    console.error('List pending for responder error:', err);
    return res.status(500).json({ error: 'Unable to list pending emergencies' });
  }
};

export const requestAssignment = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user || req.user.role !== 'RESPONDER') return res.status(403).json({ error: 'Forbidden' });
    const { emergencyId, note } = req.body;
    if (!emergencyId) return res.status(400).json({ error: 'Missing emergencyId' });

    // create a notification for admins to review
    const notif = await db.withRetry(async (prisma) => prisma.notification.create({
      data: {
        type: 'EMERGENCY',
        title: 'Responder Request',
        message: `Responder ${req.user!.id} requested assignment for ${emergencyId}${note ? ': ' + note : ''}`,
        data: { emergencyId, responderId: req.user!.id, note },
        userId: req.user!.id
      }
    }));

    // emit to admin channel
    try {
      const { getIO } = require('../realtime');
      const io = getIO();
      io.to('admin_channel').emit('responder:request', { emergencyId, responderId: req.user.id, note, timestamp: new Date().toISOString() });
    } catch (err) {
      console.warn('Failed to emit responder request', err);
    }

    return res.json({ status: 'requested', notifId: notif.id });
  } catch (err) {
    console.error('Request assignment error:', err);
    return res.status(500).json({ error: 'Failed to request assignment' });
  }
};

export const resolveEmergency = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { emergencyId } = req.body;
    if (!emergencyId) return res.status(400).json({ error: 'Missing emergencyId' });

    // Only responder or admin can resolve
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const emergency = await db.withRetry(async (prisma) => 
    prisma.emergency.update({ where: { id: emergencyId }, data: { status: EmergencyStatus.RESOLVED, resolvedAt: new Date() } })
  );

    try {
      const { getIO } = require('../realtime');
      const io = getIO();
      io.to(`user_${emergency.userId}`).emit('emergency:resolved', { emergencyId });
      // notify admins so they can remove from their lists
      try { io.to('admin_channel').emit('emergency:resolved', { emergencyId }); } catch(e) {}
    } catch (err) {
      console.warn('Failed to emit resolved', err);
    }

    // update responder status back to AVAILABLE if there was a responder
    try {
      if (emergency.responderId) {
        await db.withRetry(async (prisma) => 
          prisma.user.update({ where: { id: emergency.responderId! }, data: { responderStatus: ResponderStatus.AVAILABLE } })
        );
      }
    } catch (e) { console.warn('Failed to update responder status after resolve', e) }

    // record history
    try {
      await db.withRetry(async (prisma) => 
        prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${emergency.id}::uuid, 'RESOLVED', ${JSON.stringify({ resolvedAt: emergency.resolvedAt })}::jsonb)`
      );
    } catch (e) { console.warn('Failed to record resolve history', e) }

    return res.json({ status: 'resolved' });
  } catch (err) {
    console.error('Resolve emergency error:', err);
    return res.status(500).json({ error: 'Failed to resolve emergency' });
  }
};

export const responderArrive = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { emergencyId } = req.body;
    if (!emergencyId) return res.status(400).json({ error: 'Missing emergencyId' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    // only responders (or admins) may mark arrival
    if (req.user.role !== 'RESPONDER' && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

  console.log('ResponderArrive: user=', req.user?.id, 'body=', JSON.stringify(req.body));
  const emergency = await db.withRetry(async (prisma) => 
    prisma.emergency.findUnique({ where: { id: emergencyId } })
  );
    if (!emergency) return res.status(404).json({ error: 'Emergency not found' });
    if (emergency.status === EmergencyStatus.RESOLVED) return res.status(400).json({ error: 'Emergency already resolved' });

    // ensure the responder marking arrival is the assigned responder unless admin
    if (req.user.role === 'RESPONDER' && emergency.responderId !== req.user.id) return res.status(403).json({ error: 'You are not assigned to this emergency' });

    let updatedEmergency: any = null;
    try {
      // use the typed enum to avoid accidental string mismatches
      updatedEmergency = await db.withRetry(async (prisma) => 
        prisma.emergency.update({ where: { id: emergencyId }, data: { status: EmergencyStatus.ARRIVED }, include: { User_Emergency_userIdToUser: true, User_Emergency_responderIdToUser: true } })
      );
    } catch (e) {
      console.error('ResponderArrive: prisma update failed, attempting SQL fallback to ensure DB persisted status ARRIVED', e);
      try {
        // raw SQL fallback: update status directly in DB. Use ::uuid cast for safety.
        await db.withRetry(async (prisma) => 
          prisma.$executeRaw`
            UPDATE "Emergency" SET status = 'ARRIVED', "updatedAt" = now() WHERE id = ${emergencyId}::uuid
          `
        );
        // read back the record
        updatedEmergency = await db.withRetry(async (prisma) => 
          prisma.emergency.findUnique({ where: { id: emergencyId }, include: { User_Emergency_userIdToUser: true, User_Emergency_responderIdToUser: true } })
        );
        console.log('ResponderArrive: SQL fallback update succeeded, fetched emergency:', updatedEmergency ? updatedEmergency.id : null);
      } catch (e2) {
        console.error('ResponderArrive: SQL fallback also failed', e2);
        // continue so we still try to write history and emit events, but surface error to client later
      }
    }

    // include responderName if possible
    let responderName: string | null = null;
    try { 
      const r = await db.withRetry(async (prisma) => 
        prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } })
      ); 
      responderName = r?.name || null; 
    } catch(e) { /* ignore */ }

    const payload = { responderId: req.user!.id, responderName, arrivedAt: new Date().toISOString() };

    try {
      // try primary insert
      await db.withRetry(async (prisma) => 
        prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${emergencyId}::uuid, 'ARRIVED', ${JSON.stringify(payload)}::jsonb)`
      );
    } catch (e) {
      console.warn('ResponderArrive: primary history insert failed, attempting fallback', e);
      try {
        // fallback without explicit ::uuid cast (some driver setups prefer this)
        await db.withRetry(async (prisma) => 
          prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${emergencyId}, 'ARRIVED', ${JSON.stringify(payload)}::jsonb)`
        );
      } catch (e2) { console.error('ResponderArrive: fallback history insert failed', e2); }
    }

    try {
      const { getIO } = require('../realtime');
      const io = getIO();
      // notify resident
      try { io.to(`user_${emergency.userId}`).emit('emergency:arrived', { emergencyId, ...payload }); } catch(e) { console.warn('ResponderArrive: emit to resident failed', e) }
      // notify admin channel
      try { io.to('admin_channel').emit('emergency:arrived', { emergencyId, ...payload }); } catch(e) { console.warn('ResponderArrive: emit to admin_channel failed', e) }
      // also emit updated emergency to responder and admins so clients can sync
      try { if (updatedEmergency) io.to(`user_${req.user.id}`).emit('emergency:updated', updatedEmergency); } catch(e) { console.warn('ResponderArrive: emit updated to responder failed', e) }
      try { if (updatedEmergency) io.to('admin_channel').emit('emergency:updated', updatedEmergency); } catch(e) { /* ignore */ }
    } catch (err) {
      console.warn('ResponderArrive: Failed to emit arrived event', err);
    }

    // Final persistence guarantee: if for any reason the Prisma update/fallback didn't persist,
    // ensure the DB row is updated to ARRIVED and fetch the fresh record to return.
    try {
      console.log('ResponderArrive: Ensuring DB status is ARRIVED for', emergencyId);
      await db.withRetry(async (prisma) => 
        prisma.$executeRaw`UPDATE "Emergency" SET status = 'ARRIVED', "updatedAt" = now() WHERE id = ${emergencyId}::uuid`
      );
      // fetch authoritative record
      updatedEmergency = await db.withRetry(async (prisma) => 
        prisma.emergency.findUnique({ where: { id: emergencyId }, include: { User_Emergency_userIdToUser: true, User_Emergency_responderIdToUser: true } })
      );
      console.log('ResponderArrive: After ensure update, status=', updatedEmergency?.status);
    } catch (ensureErr) {
      console.error('ResponderArrive: failed final ensure update', ensureErr);
    }

    return res.json(updatedEmergency ? updatedEmergency : { status: 'arrived' });
  } catch (err) {
    console.error('Responder arrive error:', err);
    const details: any = { message: err instanceof Error ? err.message : String(err) };
    if (err && (err as any).stack) details.stack = (err as any).stack;
    return res.status(500).json({ error: 'Failed to mark arrived', details });
  }
};

// (removed stray duplicate history insertion)

export const assignResponder = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { emergencyId, responderId } = req.body;
    if (!emergencyId || !responderId) return res.status(400).json({ error: 'Missing fields' });

    const existing = await db.withRetry(async (prisma) => 
      prisma.emergency.findUnique({ where: { id: emergencyId } })
    );
    if (!existing) return res.status(404).json({ error: 'Emergency not found' });
    if (existing.status === EmergencyStatus.RESOLVED) return res.status(400).json({ error: 'Cannot assign responder to a resolved emergency' });

    // ensure responder is available and qualified for this emergency type
    try {
      const rows: any = await db.withRetry(async (prisma) => 
        prisma.$queryRaw`SELECT "responderStatus", "responderTypes" FROM "User" WHERE id = ${responderId} LIMIT 1`
      );
      const userRow = rows && rows[0] ? rows[0] : null;
      const dbStatus = userRow ? (userRow.responderStatus || userRow.responderstatus) : null;
      const dbTypes = userRow ? (userRow.responderTypes || userRow.respondertypes || []) : [];
      if (!dbStatus) return res.status(404).json({ error: 'Responder not found' });
      // normalize types to uppercase strings
      const normalizedTypes = Array.isArray(dbTypes) ? dbTypes.map((t: any) => String(t).toUpperCase()) : [];
      const emergencyType = (existing.type || '').toString().toUpperCase();
      if (emergencyType && normalizedTypes.length > 0 && !normalizedTypes.includes(emergencyType)) {
        return res.status(400).json({ error: 'Responder not qualified for this emergency type' });
      }
      if (dbStatus !== 'AVAILABLE') {
        if (dbStatus === 'VEHICLE_UNAVAILABLE') return res.status(400).json({ error: 'Responder vehicle unavailable' });
        return res.status(400).json({ error: 'Responder not available' });
      }
    } catch (e) {
      console.warn('Failed to verify responder status/types with raw query, falling back to ORM', e);
      const responder = await db.withRetry(async (prisma) => 
        prisma.user.findUnique({ where: { id: responderId }, select: { responderStatus: true, responderTypes: true } })
      );
      if (!responder) return res.status(404).json({ error: 'Responder not found' });
      const rs: any = responder.responderStatus;
      const normalizedTypes = Array.isArray(responder.responderTypes) ? responder.responderTypes.map((t: any) => String(t).toUpperCase()) : [];
      const emergencyType = (existing.type || '').toString().toUpperCase();
      if (emergencyType && normalizedTypes.length > 0 && !normalizedTypes.includes(emergencyType)) {
        return res.status(400).json({ error: 'Responder not qualified for this emergency type' });
      }
      if (rs !== 'AVAILABLE') {
        if (rs === 'VEHICLE_UNAVAILABLE') return res.status(400).json({ error: 'Responder vehicle unavailable' });
        return res.status(400).json({ error: 'Responder not available' });
      }
    }

    // perform assign + set responder ON_DUTY in a transaction to avoid races
    let emergency;
    try {
      const results = await db.withRetry(async (prisma) => prisma.$transaction([
        prisma.emergency.update({ where: { id: emergencyId }, data: { responderId, status: EmergencyStatus.IN_PROGRESS }, include: { User_Emergency_userIdToUser: true, User_Emergency_responderIdToUser: true } }),
        prisma.user.update({ where: { id: responderId }, data: { responderStatus: ResponderStatus.ON_DUTY } })
      ]));
      emergency = results[0];
    } catch (e) {
      console.error('Assign transaction failed', e);
      return res.status(500).json({ error: 'Failed to assign responder' });
    }

    // fetch responder name to include in history payload for human-friendly display
    let responderName: string | null = null
    try {
      const r = await db.withRetry(async (prisma) => 
        prisma.user.findUnique({ where: { id: responderId }, select: { name: true } })
      );
      responderName = r?.name || null
    } catch(e) { console.warn('Failed to fetch responder name for history payload', e) }

    const assignPayload = { responderId, responderName, assignedAt: new Date().toISOString() }
    // record history entry for assignment (two variants kept for safety)
    try { 
      await db.withRetry(async (prisma) => 
        prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${emergency.id}, 'ASSIGNED', ${JSON.stringify(assignPayload)}::jsonb)`
      ); 
    } catch(e){ console.warn('Failed to record assign history', e) }
    try { 
      await db.withRetry(async (prisma) => 
        prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${emergency.id}::uuid, 'ASSIGNED', ${JSON.stringify(assignPayload)}::jsonb)`
      ); 
    } catch(e){ console.warn('Failed to record assign history', e) }

    // emit event to user and responder
    try {
      const { getIO } = require('../realtime');
      const io = getIO();
      io.to(`user_${emergency.userId}`).emit('emergency:assigned', emergency);
      if (responderId) io.to(`user_${responderId}`).emit('emergency:assigned', emergency);
    } catch (err) {
      console.warn('Failed to emit emergency assignment', err);
    }

    // create notification records and send push notifications to both resident and responder
    try {
      // notification to resident
      await db.withRetry(async (prisma) => prisma.notification.create({
        data: {
          userId: emergency.userId,
          type: 'EMERGENCY',
          title: 'Responder Assigned',
          message: `A responder has been assigned to your emergency.`,
          data: { emergencyId: emergency.id }
        }
      }));

      // notification to responder (if assigned)
      if (responderId) {
        await db.withRetry(async (prisma) => prisma.notification.create({
          data: {
            userId: responderId,
            type: 'EMERGENCY',
            title: 'Assignment Received',
            message: `You have been assigned to emergency ${emergency.id}.`,
            data: { emergencyId: emergency.id }
          }
        }));
      }

      // send push notifications (high priority) to resident and responder tokens
      try {
        const allTokens = pushStore.listTokens();
        const residentTokens = allTokens.filter(t => t.userId === emergency.userId).map(t => t.token);
        if (residentTokens.length > 0) {
          await push.sendPushToTokens(residentTokens, 'Responder Assigned', `A responder is on the way to your emergency.`, { emergencyId: emergency.id, assigned: true });
        }

        if (responderId) {
          const responderTokens = allTokens.filter(t => t.userId === responderId).map(t => t.token);
          if (responderTokens.length > 0) {
            await push.sendPushToTokens(responderTokens, 'Assigned to Emergency', `You were assigned to emergency ${emergency.id}.`, { emergencyId: emergency.id });
          }
        }
      } catch (e) {
        console.warn('Failed to send assignment push notifications', e);
      }
    } catch (e) {
      console.warn('Failed to create assignment notifications', e);
    }

    res.json(emergency);
  } catch (err) {
    console.error('Assign responder error:', err);
    res.status(500).json({ error: 'Failed to assign responder' });
  }
};

export const acceptAssignment = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { emergencyId } = req.body;
    if (!emergencyId) return res.status(400).json({ error: 'Missing emergencyId' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // ensure emergency exists
    const emergency = await db.withRetry(async (prisma) => 
      prisma.emergency.findUnique({ where: { id: emergencyId } })
    );
    if (!emergency) return res.status(404).json({ error: 'Emergency not found' });
    if (emergency.status === EmergencyStatus.RESOLVED) return res.status(400).json({ error: 'Emergency already resolved' });

    // only the assigned responder may accept (or admin)
    if (req.user.role === 'RESPONDER' && emergency.responderId !== req.user.id) return res.status(403).json({ error: 'You are not assigned to this emergency' });

    // update emergency status to ACCEPTED
    const updated = await db.withRetry(async (prisma) => 
      prisma.emergency.update({ where: { id: emergencyId }, data: { status: EmergencyStatus.ACCEPTED }, include: { User_Emergency_userIdToUser: true, User_Emergency_responderIdToUser: true } })
    );

    // update responder status to ON_DUTY
    try { 
      if (updated.responderId) 
        await db.withRetry(async (prisma) => 
          prisma.user.update({ where: { id: updated.responderId! }, data: { responderStatus: ResponderStatus.ON_DUTY } })
        ); 
    } catch(e){ console.warn('acceptAssignment: failed to set responder ON_DUTY', e) }

    // record history
    const payload = { responderId: req.user!.id, acceptedAt: new Date().toISOString() };
    try { 
      await db.withRetry(async (prisma) => 
        prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${emergencyId}::uuid, 'ACCEPTED', ${JSON.stringify(payload)}::jsonb)`
      ); 
    } catch(e){ console.warn('acceptAssignment: failed to record history', e) }

    // emit events to resident, responder, and admin
    try {
      const { getIO } = require('../realtime');
      const io = getIO();
      io.to(`user_${updated.userId}`).emit('emergency:accepted', { emergencyId, responderId: req.user.id });
      if (updated.responderId) io.to(`user_${updated.responderId}`).emit('emergency:accepted', { emergencyId, responderId: req.user.id });
      io.to('admin_channel').emit('emergency:accepted', { emergencyId, responderId: req.user.id });
    } catch (e) { console.warn('acceptAssignment: emit failed', e) }

    return res.json(updated);
  } catch (err) {
    console.error('Accept assignment error:', err);
    return res.status(500).json({ error: 'Failed to accept assignment' });
  }
}

export const updateResponderLocation = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { emergencyId, location } = req.body;
    if (!emergencyId || !location) return res.status(400).json({ error: 'Missing fields' });

    // ensure emergency exists and isn't resolved
    const emergency = await db.withRetry(async (prisma) => 
      prisma.emergency.findUnique({ where: { id: emergencyId } })
    );
    if (!emergency) return res.status(404).json({ error: 'Emergency not found' });
    if (emergency.status === EmergencyStatus.RESOLVED) return res.status(400).json({ error: 'Emergency already resolved' });

  // Use raw SQL update to avoid needing regenerated Prisma client for new field
  const jsonLoc = JSON.stringify(location);
  await db.withRetry(async (prisma) => 
    prisma.$executeRaw`UPDATE "Emergency" SET "responderLocation" = ${jsonLoc}::jsonb WHERE id = ${emergencyId}`
  );
  await db.withRetry(async (prisma) => 
    prisma.emergency.findUnique({ where: { id: emergencyId }, include: { User_Emergency_userIdToUser: true, User_Emergency_responderIdToUser: true } })
  );
  // record responder location history
  // include responder name in payload when possible for better admin UI
  try {
    const me = req.user?.id ? await db.withRetry(async (prisma) => 
      prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } })
    ) : null
    const payload = { location, ts: new Date().toISOString(), responderId: req.user?.id || null, responderName: me?.name || null }
    try { 
      await db.withRetry(async (prisma) => 
        prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${emergencyId}, 'RESPONDER_LOCATION', ${JSON.stringify(payload)}::jsonb)`
      ); 
    } catch(e){ console.warn('Failed to record responder location history', e) }
    try { 
      await db.withRetry(async (prisma) => 
        prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${emergencyId}::uuid, 'RESPONDER_LOCATION', ${JSON.stringify(payload)}::jsonb)`
      ); 
    } catch(e){ console.warn('Failed to record responder location history', e) }
  } catch(e) { console.warn('Failed to prepare responder location payload', e) }
    try {
      const { getIO } = require('../realtime');
      const io = getIO();
      // notify the resident user about responder location update
      io.to(`user_${emergency.userId}`).emit('emergency:responderLocation', { emergencyId, location });
    } catch (err) {
      console.warn('Failed to emit responder location', err);
    }

    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('Update responder location error:', err);
    res.status(500).json({ error: 'Failed to update responder location' });
  }
};

export const getEmergencyHistory = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing emergency id' });
    // Only admins or involved users can view history
    const emergency = await db.withRetry(async (prisma) => 
      prisma.emergency.findUnique({ where: { id }, select: { id: true, userId: true, responderId: true } })
    );
    if (!emergency) return res.status(404).json({ error: 'Emergency not found' });
    if (req.user?.role !== 'ADMIN' && req.user?.id !== emergency.userId && req.user?.id !== emergency.responderId) return res.status(403).json({ error: 'Forbidden' });
  const rows = await db.withRetry(async (prisma) => 
    prisma.$queryRaw`SELECT id, emergency_id, event_type, payload, created_at FROM public.emergency_history WHERE emergency_id = ${id}::uuid ORDER BY created_at ASC`
  );
    return res.json(rows);
  } catch (e) {
    console.error('Get emergency history error', e);
    return res.status(500).json({ error: 'Failed' });
  }
}

export const listFraudEmergencies = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const rows = await rawDb.listFraudEmergencies();
    return res.json(rows);
  } catch (e) {
    console.error('listFraudEmergencies error', e);
    return res.status(500).json({ error: 'Failed' });
  }
}

export const markFraud = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    // allow ADMINS always; allow RESPONDER only if they are the assigned responder for the emergency
    if (req.user.role !== 'ADMIN') {
      if (req.user.role === 'RESPONDER') {
        // verify assignment
        try {
          const emergency = await db.withRetry(async (prisma) => prisma.emergency.findUnique({ where: { id }, select: { responderId: true, status: true } }));
          if (!emergency) return res.status(404).json({ error: 'Emergency not found' });
          if (emergency.status === 'RESOLVED') return res.status(400).json({ error: 'Cannot mark a resolved emergency as fraud' });
          if (emergency.responderId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        } catch (e) {
          console.warn('markFraud: failed to verify responder assignment', e);
          return res.status(500).json({ error: 'Failed to verify permission' });
        }
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    const updated = await rawDb.markEmergencyFraud(id, true);

    // record history
    try {
      await db.withRetry(async (prisma) => prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${id}::uuid, 'MARKED_FRAUD', ${JSON.stringify({ markedBy: req.user!.id, at: new Date().toISOString() })}::jsonb)`);
    } catch (e) { console.warn('Failed to record fraud history', e); }

    // Emit to admin channel so admin UIs can update
    try { const { getIO } = require('../realtime'); getIO().to('admin_channel').emit('emergency:fraud', { id }); } catch(e) { console.warn('emit fraud event failed', e); }

    return res.json({ status: 'ok', updated });
  } catch (err) {
    console.error('markFraud error', err);
    return res.status(500).json({ error: 'Failed' });
  }
}

export const unmarkFraud = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing id' });

  const updated = await rawDb.markEmergencyFraud(id, false);
    try {
      await db.withRetry(async (prisma) => prisma.$executeRaw`INSERT INTO public.emergency_history (emergency_id, event_type, payload) VALUES (${id}::uuid, 'UNMARKED_FRAUD', ${JSON.stringify({ unmarkedBy: req.user!.id, at: new Date().toISOString() })}::jsonb)`);
    } catch (e) { console.warn('Failed to record unmark fraud history', e); }
    try { const { getIO } = require('../realtime'); getIO().to('admin_channel').emit('emergency:fraud:cleared', { id }); } catch(e) { console.warn('emit fraud cleared failed', e); }
    return res.json({ status: 'ok', updated });
  } catch (err) {
    console.error('unmarkFraud error', err);
    return res.status(500).json({ error: 'Failed' });
  }
}
