import { db } from './database'

function periodBounds(period: string, refDate?: string) {
  const d = refDate ? new Date(refDate) : new Date();
  const start = new Date(d);
  let end = new Date(d);

  switch ((period || 'daily').toLowerCase()) {
    case 'daily':
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      break;
    case 'weekly': {
      // start on Monday
      const day = start.getDay();
      const diff = (day === 0 ? -6 : 1) - day; // move to Monday
      start.setDate(start.getDate() + diff);
      start.setHours(0,0,0,0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
      break;
    }
    case 'quarterly': {
      const month = start.getMonth();
      const quarterStartMonth = Math.floor(month / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      start.setHours(0,0,0,0);
      end = new Date(start);
      end.setMonth(start.getMonth() + 3, 0); // last day of quarter
      end.setHours(23,59,59,999);
      break;
    }
    case 'annual':
      start.setMonth(0,1); start.setHours(0,0,0,0);
      end = new Date(start); end.setFullYear(start.getFullYear()+1); end.setMilliseconds(-1);
      break;
    default:
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
  }

  return { start, end };
}

export async function generateSummary(period: string, refDate?: string) {
  const { start, end } = periodBounds(period, refDate);

  // Use db.withRetry to run several aggregations
  const results = await db.withRetry(async (prisma) => {
    // total emergencies created in period
    const created: any = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "Emergency" WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    `;

    const resolved: any = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "Emergency" WHERE "resolvedAt" IS NOT NULL AND "resolvedAt" >= ${start} AND "resolvedAt" <= ${end}
    `;

    const pending: any = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "Emergency" WHERE status != 'RESOLVED' AND "createdAt" <= ${end}
    `;

    const fraud: any = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "Emergency" WHERE "isFraud" = TRUE AND "createdAt" >= ${start} AND "createdAt" <= ${end}
    `;

    const by_type: any = await prisma.$queryRaw`
      SELECT type, COUNT(*)::int as count FROM "Emergency" WHERE "createdAt" >= ${start} AND "createdAt" <= ${end} GROUP BY type ORDER BY count DESC LIMIT 10
    `;

    const by_barangay: any = await prisma.$queryRaw`
      SELECT COALESCE(u.barangay,'UNKNOWN') as barangay, COUNT(*)::int as count
      FROM "Emergency" e
      LEFT JOIN "User" u ON e."userId" = u.id
      WHERE e."createdAt" >= ${start} AND e."createdAt" <= ${end}
      GROUP BY COALESCE(u.barangay,'UNKNOWN') ORDER BY count DESC LIMIT 20
    `;

    const notifications: any = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "Notification" WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    `;

    const weather_alerts: any = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "WeatherAlert" WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
    `;

    const active_responders: any = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT id)::int as count FROM "User" WHERE role = 'RESPONDER' AND "responderStatus" = 'ON_DUTY'
    `;

    return {
      period: period || 'daily',
      start: start.toISOString(),
      end: end.toISOString(),
      created: (created && created[0] && created[0].count) || 0,
      resolved: (resolved && resolved[0] && resolved[0].count) || 0,
      pending: (pending && pending[0] && pending[0].count) || 0,
      fraud: (fraud && fraud[0] && fraud[0].count) || 0,
      by_type: Array.isArray(by_type) ? by_type : [],
      by_barangay: Array.isArray(by_barangay) ? by_barangay : [],
      notifications: (notifications && notifications[0] && notifications[0].count) || 0,
      weather_alerts: (weather_alerts && weather_alerts[0] && weather_alerts[0].count) || 0,
      active_responders: (active_responders && active_responders[0] && active_responders[0].count) || 0
    };
  });

  return results;
}

export async function generateResponderSummary(period: string, refDate?: string) {
  const { start, end } = periodBounds(period, refDate);

  const rows = await db.withRetry(async (prisma) => {
    // Build per-responder aggregates based on emergency_history action events and Emergency table
    const sql = `
      WITH actions AS (
        SELECT
          h.emergency_id::text as emergency_id,
          (h.payload->>'responderId') as responder_id,
          MIN(h.created_at) as action_at
        FROM public.emergency_history h
        WHERE h.event_type IN ('ACCEPTED','ARRIVED','ASSIGNED')
          AND h.created_at >= ${start}
          AND h.created_at <= ${end}
        GROUP BY h.emergency_id, (h.payload->>'responderId')
      )
      SELECT
        COALESCE(u.id, a.responder_id) as responder_id,
        COALESCE(u.name, '(Unknown)') as name,
        COUNT(DISTINCT a.emergency_id) as acted_count,
        COUNT(DISTINCT CASE WHEN em."resolvedAt" IS NOT NULL AND em."resolvedAt" >= ${start} AND em."resolvedAt" <= ${end} AND em."responderId" = COALESCE(u.id, a.responder_id) THEN em.id END) as resolved_count,
        COUNT(DISTINCT CASE WHEN em."isFraud" = TRUE AND em."createdAt" >= ${start} AND em."createdAt" <= ${end} AND em."responderId" = COALESCE(u.id, a.responder_id) THEN em.id END) as fraud_count,
        AVG(EXTRACT(EPOCH FROM (a.action_at - em."createdAt"))) as avg_response_seconds
      FROM actions a
      LEFT JOIN "Emergency" em ON em."id"::text = a.emergency_id::text
      LEFT JOIN "User" u ON u.id = a.responder_id
      WHERE em."createdAt" >= ${start} AND em."createdAt" <= ${end}
      GROUP BY COALESCE(u.id, a.responder_id), COALESCE(u.name, '(Unknown)')
      ORDER BY acted_count DESC NULLS LAST
    `;

    const data: any = await prisma.$queryRawUnsafe(sql);
    return data || [];
  });

  // Compute totals
  const totalResponders = Array.isArray(rows) ? rows.length : 0;
  return { period: period || 'daily', start: start.toISOString(), end: end.toISOString(), totalResponders, responders: rows };
}
