import { NextRequest, NextResponse } from 'next/server'
import { VideoAgent } from '@/agents/video-agent'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { script } = body

  if (!script) {
    return NextResponse.json({ error: 'Script fehlt' }, { status: 400 })
  }

  try {
    const agent = new VideoAgent()
    const result = await agent.run({
      topic: script.topic || '',
      niche: script.niche || 'Fashion, Lifestyle, Travel',
      hook: script.hook || '',
      script: script.sections?.map((s: { text: string }) => s.text).join('\n\n') || '',
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        videoUrl: result.data?.videoUrl || '/videos/demo_video.mp4',
        duration: 30,
        generatedBy: result.data?.generatedBy || 'InVideo AI',
        prompt: result.data?.prompt || '',
      })
    }

    return NextResponse.json({ error: result.error || 'Unbekannter Fehler' }, { status: 500 })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/video] Fehler:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
