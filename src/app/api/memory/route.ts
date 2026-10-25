import { countByKind, list } from '@/brain/memory/store'
import { MEMORY_KINDS, type MemoryKind } from '@/brain/memory/types'
import { isStale } from '@/brain/memory/recall'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const kindParam = new URL(request.url).searchParams.get('kind')
  const kind = MEMORY_KINDS.includes(kindParam as MemoryKind) ? (kindParam as MemoryKind) : undefined
  const entries = list(kind).map((e) => ({ ...e, stale: isStale(e) }))
  return Response.json({ entries, counts: countByKind() })
}
