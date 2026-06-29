import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 Minuten Timeout

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { script } = body

  if (!script) {
    return NextResponse.json({ error: 'Script fehlt' }, { status: 400 })
  }

  const pexelsKey = process.env.PEXELS_API_KEY || ''
  const outputDir = join(process.cwd(), 'public', 'videos')
  const outputFile = `video_${Date.now()}.mp4`
  const outputPath = join(outputDir, outputFile)

  // Output-Ordner erstellen
  await execAsync(`mkdir -p "${outputDir}"`)

  const scriptPath = join(process.cwd(), 'src', 'scripts', 'video_creator.py')

  if (!existsSync(scriptPath)) {
    return NextResponse.json({ error: 'video_creator.py nicht gefunden' }, { status: 500 })
  }

  const inputData = JSON.stringify({ script, output_path: outputPath })
  const escapedData = inputData.replace(/"/g, '\\"')

  try {
    const { stdout, stderr } = await execAsync(
      `PEXELS_API_KEY="${pexelsKey}" python3 "${scriptPath}" "${escapedData}"`,
      { timeout: 280000, maxBuffer: 10 * 1024 * 1024 }
    )

    // Letzten JSON aus stdout extrahieren
    const lines = stdout.trim().split('\n')
    const lastLine = lines[lines.length - 1]
    const result = JSON.parse(lastLine)

    if (result.success) {
      return NextResponse.json({
        success: true,
        videoUrl: `/videos/${outputFile}`,
        duration: result.duration,
        path: outputPath,
      })
    }

    return NextResponse.json({ error: result.error }, { status: 500 })
  } catch (err: unknown) {
    const error = err as { message?: string; stderr?: string }
    console.error('Video creation error:', error)
    return NextResponse.json(
      { error: `Video-Erstellung fehlgeschlagen: ${error.message}` },
      { status: 500 }
    )
  }
}
