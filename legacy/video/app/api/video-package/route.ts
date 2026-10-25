import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id') || '001'
    const path = join(process.cwd(), 'data', `video-package-${id}.json`)
    if (!existsSync(path)) {
      return NextResponse.json({ error: `Paket ${id} nicht gefunden` }, { status: 404 })
    }
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
