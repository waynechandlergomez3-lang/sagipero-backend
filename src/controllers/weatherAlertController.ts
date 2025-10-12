import { Response } from 'express'
import { prisma } from '../index'
import { AuthRequest } from '../types/custom'

// List weather alerts (public to admin only)
export const listWeatherAlerts = async (_req: AuthRequest, res: Response) => {
  try{
    const alerts = await prisma.weatherAlert.findMany({ orderBy: { createdAt: 'desc' } })
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
  const { title, message, area: areaIn, hourlyIndexes, daily, scope, startAt, endAt, forecast } = req.body
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

  const wa = await prisma.weatherAlert.create({ data: { title, message, area: area || null, hourlyIndexes: hourlyIndexes || [], daily: !!daily, /* store meta in area.meta for now */ } })

    // create notification records for all users and send push
    const users = await prisma.user.findMany({ select: { id: true } })
    const notifs = []
    for(const u of users){
      const n = await prisma.notification.create({ data: { user: { connect: { id: u.id } }, type: 'WEATHER', title, message, data: { weatherAlertId: wa.id, meta: payloadMeta } } })
      notifs.push(n)
      // emit via realtime
      try{ const { getIO } = require('../realtime'); const io = getIO(); io.to(`user_${u.id}`).emit('notification:new', n) }catch(e){/* ignore */}
    }

    // send push to all tokens with richer payload (include forecast summary if available)
  try{
    const push = require('../utils/push'); const pushStore = require('../utils/pushStore'); const tokens = pushStore.listTokens().map((t:any)=>t.token);
    // build a short summary for the push body prioritizing forecast clues if present
    let pushBody = message || '';
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
    const dataPayload = { weatherAlert: wa, meta: { ...payloadMeta, ...(wa.area && (wa.area as any).meta ? (wa.area as any).meta : {}) } };
    const tickets = await push.sendPushToTokens(tokens, title, pushBody, dataPayload);
    console.log('push tickets', tickets?.length || 0);
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
    await prisma.weatherAlert.delete({ where: { id } })
    return res.json({ status: 'ok' })
  }catch(err){ console.error('deleteWeatherAlert', err); return res.status(500).json({ error: 'failed' }) }
}
