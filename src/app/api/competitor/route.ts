import { NextResponse } from 'next/server'
import { CompetitorAgent } from '@/agents/competitor-agent'

export const dynamic = 'force-dynamic'

// Kuratierte Luxury/Motivation Creator-Liste für unsere Nische
const NICHE_ACCOUNTS = [
  { handle: 'wesleyywang',     platform: 'instagram', niche: 'Luxury Lifestyle' },
  { handle: 'wisdom.kaye',     platform: 'instagram', niche: 'Motivation' },
  { handle: 'erikakullberg',   platform: 'instagram', niche: 'Lifestyle' },
  { handle: 'jackmorris',      platform: 'instagram', niche: 'Luxury Travel' },
  { handle: 'luxurylaunches',  platform: 'instagram', niche: 'Luxury Cars' },
  { handle: 'motivationmadness', platform: 'tiktok', niche: 'Motivation' },
  { handle: 'successmindset_',  platform: 'tiktok',   niche: 'Success Mindset' },
  { handle: 'cinematicreels',   platform: 'instagram', niche: 'Cinematic' },
]

export async function GET() {
  const agent = new CompetitorAgent()

  // Alle Accounts parallel analysieren
  const results = await Promise.allSettled(
    NICHE_ACCOUNTS.map(acc =>
      agent.run({
        handle:   acc.handle,
        platform: acc.platform,
        niche:    'Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic',
      }).then(r => ({
        handle:   acc.handle,
        platform: acc.platform,
        niche:    acc.niche,
        data:     r.data || {},
        success:  r.success,
      }))
    )
  )

  const accounts = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { handle: NICHE_ACCOUNTS[i].handle, platform: NICHE_ACCOUNTS[i].platform, niche: NICHE_ACCOUNTS[i].niche, data: {}, success: false, error: r.reason?.message }
  )

  // Aggregierte Insights
  const allHooks     = accounts.flatMap(a => (a.data as any)?.topHooks     || [])
  const allHashtags  = accounts.flatMap(a => (a.data as any)?.topHashtags  || [])
  const allTopics    = accounts.flatMap(a => (a.data as any)?.topTopics    || [])

  return NextResponse.json({
    accounts,
    aggregated: {
      topHooks:    [...new Set(allHooks)].slice(0, 8),
      topHashtags: [...new Set(allHashtags)].slice(0, 15),
      topTopics:   [...new Set(allTopics)].slice(0, 10),
    },
    analyzedAt: new Date().toISOString(),
  })
}
