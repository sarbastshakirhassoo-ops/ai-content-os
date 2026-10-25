import { listRuns } from '@/brain/trace'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get('limit') ?? 20)
  const safe = Number.isFinite(limit) ? Math.min(Math.max(1, limit), 100) : 20
  return Response.json({ runs: listRuns(safe) })
}
