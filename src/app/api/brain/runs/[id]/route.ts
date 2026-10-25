import { getRun } from '@/brain/trace'

export const dynamic = 'force-dynamic'

// Next 16: Routen-Parameter sind asynchron.
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const run = getRun(id)
  if (!run) return Response.json({ error: 'Lauf nicht gefunden.' }, { status: 404 })
  return Response.json({ run })
}
