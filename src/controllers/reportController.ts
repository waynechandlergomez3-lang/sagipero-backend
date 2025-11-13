import { Request, Response } from 'express'
import { generateSummary } from '../services/reportService'
import fs from 'fs'
import path from 'path'

// PDF generation: use PDFKit (no Chromium dependency and no external fonts required)
// dynamic require so the module is optional at build time
const PDFDocument: any = (() => { try { return require('pdfkit') } catch (e) { return null } })()

function renderReportHTML(summary: any) {
  const generatedAt = new Date().toLocaleString()
  const header = `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee;margin-bottom:12px"><div><h1 style=\"margin:0;font-size:20px\">Sagipero — Emergency Summary</h1><div style=\"color:#666;font-size:12px\">Period: ${summary.period} (${new Date(summary.start).toLocaleDateString()} – ${new Date(summary.end).toLocaleDateString()})</div></div><div style=\"text-align:right;color:#666;font-size:12px\">Generated: ${generatedAt}</div></div>`

  const stats = `
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0">
    <div style="flex:1;min-width:140px;padding:12px;background:#f7fbff;border-radius:8px;border:1px solid #e6f0fb">
      <div style="font-size:12px;color:#666">Created</div>
      <div style="font-size:20px;font-weight:700">${summary.created}</div>
    </div>
    <div style="flex:1;min-width:140px;padding:12px;background:#fff7f7;border-radius:8px;border:1px solid #fdecea">
      <div style="font-size:12px;color:#666">Resolved</div>
      <div style="font-size:20px;font-weight:700">${summary.resolved}</div>
    </div>
    <div style="flex:1;min-width:140px;padding:12px;background:#fffaf0;border-radius:8px;border:1px solid #fff4d6">
      <div style="font-size:12px;color:#666">Pending</div>
      <div style="font-size:20px;font-weight:700">${summary.pending}</div>
    </div>
    <div style="flex:1;min-width:140px;padding:12px;background:#f8fff7;border-radius:8px;border:1px solid #e8f6ea">
      <div style="font-size:12px;color:#666">Fraud</div>
      <div style="font-size:20px;font-weight:700">${summary.fraud}</div>
    </div>
  </div>`

  function tableFromArray(arr: any[], col1: string, col2: string) {
    if (!Array.isArray(arr) || arr.length === 0) return `<div style="color:#666;font-size:13px">No data</div>`
    const rows = arr.map((r: any) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${r[col1] || r[0] || ''}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${r[col2] ?? r.count ?? ''}</td></tr>`).join('')
    return `<table style=\"width:100%;border-collapse:collapse;margin-top:8px;font-size:13px\"><thead><tr><th style=\"text-align:left;padding:6px 8px;border-bottom:2px solid #ddd\">${col1}</th><th style=\"text-align:right;padding:6px 8px;border-bottom:2px solid #ddd\">${col2}</th></tr></thead><tbody>${rows}</tbody></table>`
  }

  const byType = `<div style=\"margin-top:16px\"><h3 style=\"margin:6px 0\">Top Types</h3>${tableFromArray(summary.by_type || [], 'type', 'count')}</div>`
  const byBarangay = `<div style=\"margin-top:16px\"><h3 style=\"margin:6px 0\">Top Barangays</h3>${tableFromArray(summary.by_barangay || [], 'barangay', 'count')}</div>`

  const footer = `<div style=\"margin-top:24px;padding-top:12px;border-top:1px solid #eee;color:#999;font-size:12px\">Sagipero — Confidential operational report</div>`

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#222; padding:18px;">${header}${stats}${byType}${byBarangay}${footer}</body></html>`
  return html
}

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
    const base = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`

    // CSV — stream directly to avoid relying on static file hosting
    if (format === 'csv') {
      const csv = jsonToCsv(summary)
      const fileName = `report_${period}_${(date||new Date().toISOString()).slice(0,10)}.csv`
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      return res.send(csv)
    }

    // PDF using PDFKit
    if (format === 'pdf') {
      if (!PDFDocument) {
        console.error('PDFKit not available')
        return res.status(500).json({ error: 'PDF generation not available on this server' })
      }

      const fileName = `report_${period}_${(date||new Date().toISOString()).slice(0,10)}.pdf`
      const dir = path.join(process.cwd(), 'uploads', 'reports')
      try { fs.mkdirSync(dir, { recursive: true }) } catch(e){}
      const filePath = path.join(dir, fileName)

      try {
        const doc = new PDFDocument({ size: 'A4', margin: 24 })
        const chunks: Buffer[] = []
        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        const pdfDone = new Promise<Buffer>((resolve, reject) => {
          doc.on('end', () => resolve(Buffer.concat(chunks)))
          doc.on('error', (err: Error) => reject(err))
        })

        // Header
        doc.fontSize(18).text('Sagipero — Emergency Summary', { align: 'left' })
        doc.moveDown(0.2)
        doc.fontSize(10).fillColor('#666').text(`Period: ${summary.period} (${new Date(summary.start).toLocaleDateString()} – ${new Date(summary.end).toLocaleDateString()})`)
        doc.fontSize(9).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`)
        doc.moveDown(0.8)

        // Stats table-like
        doc.fillColor('#000').fontSize(12)
        const stats = [
          ['Created', String(summary.created || 0)],
          ['Resolved', String(summary.resolved || 0)],
          ['Pending', String(summary.pending || 0)],
          ['Fraud', String(summary.fraud || 0)]
        ]
        const col1Width = 200
        stats.forEach(row => {
          doc.fontSize(11).text(row[0], { continued: true, width: col1Width })
          doc.text(row[1], { align: 'right' })
        })
        doc.moveDown(0.8)

        // Top Types
        doc.fontSize(13).text('Top Types', { underline: true })
        if (Array.isArray(summary.by_type) && summary.by_type.length > 0) {
          summary.by_type.forEach((r: any) => {
            doc.fontSize(11).text(`${r.type || r[0] || ''}`, { continued: true, width: col1Width })
            doc.text(String(r.count || r[1] || r.count || ''), { align: 'right' })
          })
        } else {
          doc.fontSize(10).fillColor('#666').text('No data')
          doc.fillColor('#000')
        }
        doc.moveDown(0.6)

        // Top Barangays
        doc.fontSize(13).text('Top Barangays', { underline: true })
        if (Array.isArray(summary.by_barangay) && summary.by_barangay.length > 0) {
          summary.by_barangay.forEach((r: any) => {
            doc.fontSize(11).text(`${r.barangay || r[0] || ''}`, { continued: true, width: col1Width })
            doc.text(String(r.count || r[1] || r.count || ''), { align: 'right' })
          })
        } else {
          doc.fontSize(10).fillColor('#666').text('No data')
          doc.fillColor('#000')
        }

        doc.moveDown(1)
        doc.fontSize(9).fillColor('#999').text('Sagipero — Confidential operational report')

        doc.end()
        const buffer = await pdfDone

        // Send PDF directly so downloads work regardless of static-file hosting
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
        return res.send(buffer)
      } catch (err) {
        console.error('PDF generation (PDFKit) failed', err)
        return res.status(500).json({ error: 'Failed to generate PDF', details: String(err) })
      }
    }

    return res.json(summary)
  } catch (e) {
    console.error('getSummary error', e)
    return res.status(500).json({ error: 'Failed to generate report' })
  }
}
