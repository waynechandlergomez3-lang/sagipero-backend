import { Request, Response } from 'express'
import { prisma } from '../index'
import axios from 'axios'

// Simple HTML meta extractor (no new deps)
function extractMeta(html: string) {
  const meta: any = {}
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  meta.title = (ogTitle && ogTitle[1]) || (titleTag && titleTag[1]) || null
  meta.description = (ogDesc && ogDesc[1]) || null
  meta.image = (ogImage && ogImage[1]) || null
  return meta
}

export const createArticle = async (req: Request, res: Response) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'missing url' })

    // fetch url HTML
    const resp = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'SagiperoBot/1.0' } })
    const html = resp.data as string
    const meta = extractMeta(html)

    // derive source hostname
    let source = null
    try { source = (new URL(url)).hostname } catch(e) { /* ignore */ }

    const art = await prisma.article.create({ data: {
      url,
      title: meta.title || url,
      description: meta.description || '',
      imageUrl: meta.image || null,
      source: source || null
    } })

    return res.json(art)
  } catch (err) {
    console.error('createArticle', err)
    return res.status(500).json({ error: 'failed', details: (err as any).message })
  }
}

export const listArticles = async (_req: Request, res: Response) => {
  try {
    const list = await prisma.article.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
    return res.json(list)
  } catch (err) {
    console.error('listArticles', err)
    return res.status(500).json({ error: 'failed' })
  }
}

export const getLatestArticle = async (_req: Request, res: Response) => {
  try {
    const art = await prisma.article.findFirst({ orderBy: { createdAt: 'desc' } })
    return res.json(art)
  } catch (err) {
    console.error('getLatestArticle', err)
    return res.status(500).json({ error: 'failed' })
  }
}
