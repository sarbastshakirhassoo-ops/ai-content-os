import Link from 'next/link'

// ── Section type for grouped navigation ──────────────────────────────────────
type NavItem = { href: string; label: string; icon: string }
type NavSection = { title: string; items: NavItem[] }

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'System',
    items: [
      { href: '/',          label: 'Dashboard',       icon: '⊞'  },
      { href: '/pipeline',    label: 'Pipeline Live',    icon: '⛓️' },
      { href: '/first-video', label: 'Erstes Video',      icon: '🎬' },
      { href: '/workflow',  label: 'Workflow Canvas',  icon: '◈'  },
      { href: '/agents',    label: 'Alle Agenten',     icon: '◉'  },
    ],
  },
  {
    title: 'Recherche & Intel',
    items: [
      { href: '/trends',      label: 'Trend Scout',       icon: '🔥' },
      { href: '/competitor',  label: 'Competitor Analyse', icon: '🕵️' },
      { href: '/knowledge',   label: 'Knowledge Base',     icon: '🧠' },
    ],
  },
  {
    title: 'Content Creation',
    items: [
      { href: '/script',    label: 'Script Agent',   icon: '✍️' },
      { href: '/seo',       label: 'SEO Optimizer',  icon: '🔎' },
      { href: '/brand',     label: 'Brand Check',    icon: '🎨' },
    ],
  },
  {
    title: 'Produktion',
    items: [
      { href: '/assets',  label: 'Asset Library',   icon: '◫'  },
      { href: '/video',   label: 'Video Composer',  icon: '🎬' },
      { href: '/content', label: 'Video Projects',  icon: '▶'  },
    ],
  },
  {
    title: 'Publishing',
    items: [
      { href: '/calendar', label: 'Content Calendar', icon: '📅' },
      { href: '/upload',   label: 'YouTube Upload',   icon: '🚀' },
    ],
  },
  {
    title: 'Learning Loop',
    items: [
      { href: '/analytics',  label: 'Analytics',         icon: '◎'  },
      { href: '/engagement', label: 'Engagement Agent',  icon: '💬' },
      { href: '/learning',   label: 'Learning Agent',    icon: '🤖' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-surface border-r border-border flex flex-col z-50">
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-white">AI</div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Content OS</div>
            <div className="text-xs text-muted leading-tight">Agent Pipeline</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4 scrollbar-none">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted opacity-50">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-white hover:bg-card transition-colors group"
                >
                  <span className="text-base opacity-70 group-hover:opacity-100">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <div className="bg-card rounded-lg px-3 py-2 border border-border">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse"></div>
            <span className="text-xs text-warning font-medium">Demo Mode</span>
          </div>
          <p className="text-xs text-muted mt-1 leading-snug">Add API keys in .env to go live</p>
        </div>
      </div>
    </aside>
  )
}
