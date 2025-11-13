import { Response } from 'express'
import { db } from '../index'
import { AuthRequest } from '../types/custom'
import { randomUUID } from 'crypto'
import { rawDb } from '../services/rawDatabase'

// List weather alerts (public to admin only)
export const listWeatherAlerts = async (_req: AuthRequest, res: Response) => {
  try{
    console.log('listWeatherAlerts: using raw database service for listing weather alerts');
    const alerts = await rawDb.listWeatherAlerts();
    return res.json(alerts)
  }catch(err){
    console.error('listWeatherAlerts', err)
    // Prisma P2022 indicates the database schema is out of sync with the Prisma schema
    if((err as any)?.code === 'P2022'){
      return res.status(500).json({ error: 'prisma_schema_mismatch', message: 'Database schema does not match Prisma schema. Run `npx prisma migrate dev --name add_weather_alerts` and `npx prisma generate`, then restart the server.' })
    }
    return res.status(500).json({ error: 'failed' })
  }
}

// Create a weather alert: store in weatherAlert table and create notifications + push
export const createWeatherAlert = async (req: AuthRequest, res: Response) => {
  try{
    const { title, message, area: areaIn, hourlyIndexes, daily, scope, startAt, endAt, forecast, severity, targetRoles, targetUserIds, broadcastAll } = req.body
  if(!title || !message) return res.status(400).json({ error: 'missing fields' })

  const payloadMeta = { scope: scope || null, startAt: startAt || null, endAt: endAt || null }

  // merge forecast (optional) into area.meta so notification payload contains condition/temp
  let area = areaIn || null;
  try{
    if(forecast){
      area = area || {};
      area.meta = { ...(area.meta || {}), ...forecast };
    }
  }catch(e){ /* ignore */ }

  const wa = await db.withRetry(async (prisma) => prisma.weatherAlert.create({ data: { 
    id: randomUUID(),
    type: 'WEATHER',
    severity: 'MEDIUM',
    title, 
    description: message || '',
    message,
    source: 'SYSTEM',
    location: {},
    startsAt: new Date(),
    area: area || null, 
    hourlyIndexes: hourlyIndexes || [], 
    daily: !!daily,
    updatedAt: new Date()
  } }))

    // create notification records for target users in a single batch to avoid repeated prepared-statement calls
    console.log('createWeatherAlert: determining target users for notification send');
    let users: any[] = []
    // priority: explicit user ids -> roles -> broadcast all
    if(Array.isArray(targetUserIds) && targetUserIds.length){
      users = targetUserIds.map((id:string)=>({ id }))
    }else if(Array.isArray(targetRoles) && targetRoles.length){
      const ids = new Set<string>()
      for(const r of targetRoles){
        try{
          const list = await rawDb.listUsers(r)
          for(const u of list) ids.add(u.id)
        }catch(e){ console.warn('failed to list users for role', r, e) }
      }
      users = Array.from(ids).map(id => ({ id }))
    }else if(broadcastAll){
      users = await rawDb.listAllUsers()
    }else{
      // default to all users for backward compatibility
      users = await rawDb.listAllUsers()
    }
    try{
      const notificationsData = users.map((u:any) => ({
        userId: u.id,
        type: 'WEATHER',
        title,
        message,
        data: { weatherAlertId: wa.id, meta: payloadMeta }
      }));

      // Use a single createMany call which is far cheaper and avoids preparing many statements
      if(notificationsData.length){
        await db.withRetry(async (prisma) =>
          prisma.notification.createMany({ data: notificationsData })
        );
      }

      // Emit realtime events to connected sockets (no DB operations here)
      try{
        const { getIO } = require('../realtime'); const io = getIO();
        for(const u of users){
          try{ io.to(`user_${u.id}`).emit('notification:new', { type: 'WEATHER', title, message, weatherAlertId: wa.id }) }catch(e){/* ignore per-user */}
        }
      }catch(e){/* ignore realtime errors */}
    }catch(e){
      console.warn('createWeatherAlert: failed to create notifications in batch, falling back to best-effort emit', e);
    }

    // send push to tokens belonging to the targeted users with richer payload (include forecast summary if available)
    try{
      const push = require('../utils/push'); const pushStore = require('../utils/pushStore');
      // map tokens to target user ids
      const allTokens = pushStore.listTokens();
      // debug: log how many tokens we have (mask tokens for privacy)
      try{
        const sample = allTokens.slice(0,3).map((t:any)=>`${t.userId}: ${t.token.slice(0,6)}...${t.token.slice(-6)}`)
        console.log('createWeatherAlert: push token store contains', allTokens.length, 'entries; sample:', sample)
      }catch(e){/* ignore logging errors */}

      let tokens: string[] = [];
      if(broadcastAll){
        tokens = allTokens.map((t:any) => t.token);
      }else{
        const targetUserIdSet = new Set(users.map(u=>u.id));
        tokens = allTokens.filter((t:any)=> targetUserIdSet.has(t.userId)).map((t:any)=>t.token);
        if(!tokens.length){
          console.warn('createWeatherAlert: no push tokens matched target users, falling back to all tokens');
          tokens = allTokens.map((t:any) => t.token);
        }
      }
    // build a short summary for the push body prioritizing forecast clues if present
  let pushBody = message || '';
  // prefix urgent indicator for high severity
  const sev = (severity || 'MEDIUM').toString().toUpperCase();
  if(sev === 'SEVERE' || sev === 'HIGH' || sev === 'CRITICAL') pushBody = `⚠️ URGENT: ${pushBody}`;
    try{
      // area.meta may contain forecast info if admin attached it
      let meta = (wa.area && (wa.area as any).meta) ? (wa.area as any).meta : null;
      // fallback: try to extract simple clues from the message if no meta
      if(!meta){
        const msg = (message || '').toLowerCase();
        meta = {} as any;
  const conditionMatches: string[] = [];
  ['thunder', 'storm', 'rain', 'shower', 'overcast', 'cloud', 'snow', 'fog', 'wind'].forEach(k => { if(msg.includes(k)) conditionMatches.push(k); });
        if(conditionMatches.length) meta.condition = conditionMatches.slice(0,3).join(', ');
        const tempMatch = msg.match(/(-?\d{1,2})\s?°?\s?(c|f)?/i);
        if(tempMatch){
          const t = Number(tempMatch[1]);
          meta.temp = t;
        }
      }
      if(meta){
        const parts: string[] = [];
        if(meta.condition) parts.push(meta.condition);
        if(typeof meta.temp === 'number') parts.push(`${Math.round(meta.temp)}°C`);
        if(parts.length) pushBody = `${parts.join(' • ')} — ${pushBody}`;
      }
    }catch(e){ /* ignore meta parsing errors */ }

    // include meta in payload for client use
      const dataPayload = { weatherAlert: wa, severity: sev, meta: { ...payloadMeta, ...(wa.area && (wa.area as any).meta ? (wa.area as any).meta : {}) }, urgent: (sev === 'SEVERE' || sev === 'CRITICAL') };
      if(tokens.length === 0){
        console.warn('createWeatherAlert: no push tokens available to send');
      }else{
        const tickets = await push.sendPushToTokens(tokens, title, pushBody, dataPayload);
        console.log('push tickets', tickets?.length || 0, 'for tokens', tokens.length);
      }
  }catch(e){ console.warn('push send failed', e) }

    return res.json(wa)
  }catch(err){
    console.error('createWeatherAlert', err)
    if((err as any)?.code === 'P2022'){
      return res.status(500).json({ error: 'prisma_schema_mismatch', message: 'Database schema does not match Prisma schema. Run `npx prisma migrate dev --name add_weather_alerts` and `npx prisma generate`, then restart the server.' })
    }
    return res.status(500).json({ error: 'failed' })
  }
}

export const deleteWeatherAlert = async (req: AuthRequest, res: Response) => {
  try{
    const { id } = req.params
    await db.withRetry(async (prisma) => 
      prisma.weatherAlert.delete({ where: { id } })
    )
    return res.json({ status: 'ok' })
  }catch(err){ console.error('deleteWeatherAlert', err); return res.status(500).json({ error: 'failed' }) }
}
