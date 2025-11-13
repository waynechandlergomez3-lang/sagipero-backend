import { Request, Response } from 'express'
import { generateSummary } from '../services/reportService'
import fs from 'fs'
import path from 'path'

function jsonToCsv(obj: any) {
  // Simple CSV: flatten top-level fields and arrays as JSON strings
  const rows: string[] = []
  const flat: any = {}
  for (const k of Object.keys(obj)) {
    if (Array.isArray(obj[k]) || typeof obj[k] === 'object') flat[k] = JSON.stringify(obj[k])
    else flat[k] = obj[k]
  }
  const headers = Object.keys(flat)
  rows.push(headers.join(','))
  rows.push(headers.map(h=>`"${String(flat[h]).replace(/"/g,'""')}"`).join(','))
  return rows.join('\n')
}

export const getSummary = async (req: Request, res: Response) => {
  try {
    const period = String(req.query.period || 'daily')
    const date = req.query.date ? String(req.query.date) : undefined
    const format = String(req.query.format || 'json')

    const summary = await generateSummary(period, date)

    if (format === 'csv') {
      const csv = jsonToCsv(summary)
      const fileName = `report_${period}_${(date||new Date().toISOString()).slice(0,10)}.csv`;
      const dir = path.join(process.cwd(), 'uploads', 'reports')
      try { fs.mkdirSync(dir, { recursive: true }) } catch(e){}
      const filePath = path.join(dir, fileName)
      fs.writeFileSync(filePath, csv, 'utf8')
      // return downloadable URL
      const urlPath = `/uploads/reports/${fileName}`
      return res.json({ url: urlPath, file: fileName })
    }

    return res.json(summary)
  } catch (e) {
    console.error('getSummary error', e)
    return res.status(500).json({ error: 'Failed to generate report' })
  }
}
