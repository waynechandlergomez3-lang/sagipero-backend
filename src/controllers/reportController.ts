import { Request, Response } from 'express'
import { generateSummary } from '../services/reportService'
import fs from 'fs'
import path from 'path'
// PDF generation: use pdfmake (no Chromium dependency) for server-side PDFs
// dynamic require to avoid TS type issues if not present at build time
const pdfMake: any = (() => { try { return require('pdfmake/build/pdfmake'); } catch (e) { return null; } })();
const vfsFonts: any = (() => { try { return require('pdfmake/build/vfs_fonts'); } catch (e) { return null; } })();

function renderReportHTML(summary: any) {
  const generatedAt = new Date().toLocaleString();
  const header = `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee;margin-bottom:12px"><div><h1 style=\"margin:0;font-size:20px\">Sagipero — Emergency Summary</h1><div style=\"color:#666;font-size:12px\">Period: ${summary.period} (${new Date(summary.start).toLocaleDateString()} – ${new Date(summary.end).toLocaleDateString()})</div></div><div style=\"text-align:right;color:#666;font-size:12px\">Generated: ${generatedAt}</div></div>`;

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
  </div>`;

  function tableFromArray(arr: any[], col1: string, col2: string) {
    if (!Array.isArray(arr) || arr.length === 0) return `<div style="color:#666;font-size:13px">No data</div>`;
    const rows = arr.map((r: any) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${r[col1] || r[0] || ''}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${r[col2] ?? r.count ?? ''}</td></tr>`).join('');
    return `<table style=\"width:100%;border-collapse:collapse;margin-top:8px;font-size:13px\"><thead><tr><th style=\"text-align:left;padding:6px 8px;border-bottom:2px solid #ddd\">${col1}</th><th style=\"text-align:right;padding:6px 8px;border-bottom:2px solid #ddd\">${col2}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  const byType = `<div style=\"margin-top:16px\"><h3 style=\"margin:6px 0\">Top Types</h3>${tableFromArray(summary.by_type || [], 'type', 'count')}</div>`;
  const byBarangay = `<div style=\"margin-top:16px\"><h3 style=\"margin:6px 0\">Top Barangays</h3>${tableFromArray(summary.by_barangay || [], 'barangay', 'count')}</div>`;

  const footer = `<div style=\"margin-top:24px;padding-top:12px;border-top:1px solid #eee;color:#999;font-size:12px\">Sagipero — Confidential operational report</div>`;

  const html = `<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#222; padding:18px;\">${header}${stats}${byType}${byBarangay}${footer}</body></html>`;
  return html;
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

    if (format === 'pdf') {
      // prefer pdfMake (no Chromium). Ensure library and VFS fonts are present.
      if (!pdfMake || !vfsFonts) {
        console.error('pdfmake or fonts not available');
        return res.status(500).json({ error: 'PDF generation not available on this server' });
      }
      // attach virtual file system fonts
      try { pdfMake.vfs = vfsFonts.pdfMake.vfs; } catch (e) { console.warn('Failed to attach vfs fonts', e); }

      // build a simple pdfmake document definition from the summary
      const generatedAt = new Date().toLocaleString();
      const docDefinition: any = {
        info: { title: `Sagipero Report ${period} ${date || new Date().toISOString().slice(0,10)}` },
        pageSize: 'A4',
        pageMargins: [24, 36, 24, 36],
        content: [
          { text: 'Sagipero — Emergency Summary', style: 'header' },
          { text: `Period: ${summary.period} (${new Date(summary.start).toLocaleDateString()} – ${new Date(summary.end).toLocaleDateString()})`, style: 'subheader' },
          { text: `Generated: ${generatedAt}\n\n`, style: 'meta' },
          {
            columns: [
              { width: '*', text: '' },
              {
                width: 'auto',
                table: {
                  body: [
                    ['Created', String(summary.created || 0)],
                    ['Resolved', String(summary.resolved || 0)],
                    ['Pending', String(summary.pending || 0)],
                    ['Fraud', String(summary.fraud || 0)]
                  ]
                },
                layout: 'noBorders'
              }
            ]
          },
          { text: '\nTop Types', style: 'sectionHeader' },
          (Array.isArray(summary.by_type) && summary.by_type.length > 0) ?
            { table: { headerRows: 1, widths: ['*','auto'], body: [[{text:'Type', bold:true},{text:'Count', bold:true}], ...summary.by_type.map((r:any)=>[String(r.type||r[0]||''), String(r.count||r[1]||r.count||'')])] }, layout: 'lightHorizontalLines' }
            : { text: 'No data', style: 'muted' },
          { text: '\nTop Barangays', style: 'sectionHeader' },
          (Array.isArray(summary.by_barangay) && summary.by_barangay.length > 0) ?
            { table: { headerRows: 1, widths: ['*','auto'], body: [[{text:'Barangay', bold:true},{text:'Count', bold:true}], ...summary.by_barangay.map((r:any)=>[String(r.barangay||r[0]||''), String(r.count||r[1]||r.count||'')])] }, layout: 'lightHorizontalLines' }
            : { text: 'No data', style: 'muted' },
          { text: '\n\nSagipero — Confidential operational report', style: 'footer' }
        ],
        styles: {
          header: { fontSize: 18, bold: true, margin: [0,0,0,6] },
          subheader: { fontSize: 10, color: '#666', margin: [0,0,0,6] },
          meta: { fontSize: 9, color: '#666' },
          sectionHeader: { fontSize: 13, bold: true, margin: [0,8,0,6] },
          muted: { color: '#666' },
          footer: { fontSize: 8, color: '#999', margin: [0,12,0,0] }
        }
      };

      const fileName = `report_${period}_${(date||new Date().toISOString()).slice(0,10)}.pdf`;
      const dir = path.join(process.cwd(), 'uploads', 'reports')
      try { fs.mkdirSync(dir, { recursive: true }) } catch(e){}
      const filePath = path.join(dir, fileName)

      try {
        // pdfMake in Node: create PDFKit document and get buffer
        const printer = pdfMake;
        // createPdf returns an object with getBuffer in Node builds
        const pdfDocGenerator: any = pdfMake.createPdf(docDefinition);
        // getBuffer uses callback
        await new Promise((resolve, reject) => {
          pdfDocGenerator.getBuffer((buffer: Buffer | undefined) => {
            if (!buffer) return reject(new Error('Empty PDF buffer'));
            try {
              fs.writeFileSync(filePath, buffer);
              resolve(true);
            } catch (err) { reject(err); }
          });
        });
        const urlPath = `/uploads/reports/${fileName}`
        return res.json({ url: urlPath, file: fileName })
      } catch (e) {
        console.error('PDF generation (pdfmake) failed', e)
        // fallback: return JSON summary so admin UI can still present data
        return res.status(500).json({ error: 'Failed to generate PDF', details: String(e) })
      }
    }

    return res.json(summary)
  } catch (e) {
    console.error('getSummary error', e)
    return res.status(500).json({ error: 'Failed to generate report' })
  }
}
