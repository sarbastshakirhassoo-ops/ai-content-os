import { NextRequest, NextResponse } from 'next/server'
import { UploadAgent } from '@/agents/upload-agent'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
  
    const title       = formData.get('title') as string
    const description = formData.get('description') as string
    const tags        = (formData.get('tags') as string || '').split(',').map(t => t.trim()).filter(Boolean)
    const videoFile   = formData.get('video') as File | null
  
    if (!title || !description) {
      return NextResponse.json({ error: 'Titel und Beschreibung fehlen' }, { status: 400 })
    }
  
    let videoPath: string | undefined
  
    // Video-Datei temporär speichern
    if (videoFile && videoFile.size > 0) {
      const buffer = Buffer.from(await videoFile.arrayBuffer())
      videoPath = join(tmpdir(), `upload_${Date.now()}.mp4`)
      writeFileSync(videoPath, buffer)
    }
  
    const agent  = new UploadAgent()
    const result = await agent.run({ title, description, tags, videoPath })
  
    return NextResponse.json(result.data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[POST] Fehler:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
