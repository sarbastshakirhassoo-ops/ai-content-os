import { forget, get } from '@/brain/memory/store'

export const dynamic = 'force-dynamic'

// Next 16: Routen-Parameter sind asynchron.
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!get(id)) return Response.json({ error: 'Eintrag nicht gefunden.' }, { status: 404 })
  return Response.json({ deleted: forget(id) })
}
