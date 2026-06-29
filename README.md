# AI Content Operating System

Vollautomatische Content-Pipeline für Fashion / Lifestyle / Travel Reels.  
Zielstil: @killa_wp, @tobydeboer, @shotbyolisa, @meet.marketss — ästhetische, cinematische Short-Form-Videos.

---

## Quick Start

```bash
npm install
npx prisma db push
npm run dev
# → http://localhost:3000
```

---

## 14-Agenten Pipeline

### Row 1 — Recherche & Intel
| Agent | Slug | Status | API |
|-------|------|--------|-----|
| 🔥 Trend Scout | `trend-agent` | ✅ Fertig | Reddit, HackerNews, YouTube, TikTok |
| 🕵️ Competitor Analyst | `competitor-agent` | ✅ Fertig | RapidAPI: instagram-scraper-stable-api, tiktok-api23, YouTube Data API v3 |
| 🧠 Knowledge Base | `knowledge-agent` | ✅ Fertig | JSON: src/data/knowledge-base.json |

### Row 2 — Content Creation
| Agent | Slug | Status | API |
|-------|------|--------|-----|
| ✍️ Script Writer | `script-agent` | ✅ Fertig | OpenAI GPT-4 |
| 🔎 SEO Optimizer | `seo-agent` | ✅ Fertig | OpenAI GPT-4 |
| 🎨 Brand Consistency | `brand-agent` | ✅ Fertig | OpenAI GPT-4 |

### Row 3 — Produktion
| Agent | Slug | Status | API |
|-------|------|--------|-----|
| 📦 Asset Manager | `asset-manager-agent` | ✅ Fertig | Pexels API (kostenlos) |
| 🎬 Video Composer | `video-agent` | 🔄 In Umbau | → Wird auf Shotstack API umgestellt |
| 🔍 QC Inspector | `qc-agent` | ✅ Fertig | Intern |

### Row 4 — Publishing
| Agent | Slug | Status | API |
|-------|------|--------|-----|
| 📅 Content Calendar | `calendar-agent` | ✅ Fertig | Intern |
| 🚀 Upload Bot | `upload-agent` | ✅ Fertig | YouTube Data API v3 |

### Row 5 — Learning Loop
| Agent | Slug | Status | API |
|-------|------|--------|-----|
| 📊 Analytics Brain | `analytics-agent` | ✅ Fertig | YouTube Analytics API |
| 💬 Engagement Analyzer | `engagement-agent` | ✅ Fertig | OpenAI GPT-4 |
| ⚡ Learning Agent | `optimization-agent` | ✅ Fertig | Intern |

---

## UI Seiten

| Route | Status |
|-------|--------|
| `/` | ✅ Dashboard mit KPIs, Alerts, Pipeline-Timeline |
| `/workflow` | ✅ n8n-Style Canvas (Handles + Bezier Edges) |
| `/agents` | ✅ Agent-Übersicht |
| `/trends` | ✅ Trend Scout |
| `/competitor` | ✅ Competitor Analyse |
| `/knowledge` | ✅ Knowledge Base |
| `/script` | ✅ Script Writer |
| `/seo` | ✅ SEO Optimizer |
| `/brand` | ✅ Brand Check |
| `/assets` | ✅ Asset Library |
| `/video` | ✅ Video Composer |
| `/calendar` | ✅ Content Calendar |
| `/upload` | ✅ YouTube Upload |
| `/analytics` | ✅ Analytics |
| `/engagement` | ✅ Engagement Agent |
| `/content` | ✅ Video Projekte |

---

## Environment Variables

Erstelle `.env` (NIEMALS auf GitHub committen!):

```env
RAPIDAPI_KEY="dein-key"
YOUTUBE_CLIENT_ID="dein-client-id"
YOUTUBE_CLIENT_SECRET="dein-client-secret"
YOUTUBE_REFRESH_TOKEN="dein-refresh-token"
OPENAI_API_KEY="dein-openai-key"
PEXELS_API_KEY="dein-pexels-key"
SHOTSTACK_API_KEY="dein-shotstack-key"
```

---

## Instagram API (Competitor Agent)

Host: `instagram-scraper-stable-api.p.rapidapi.com` (POST form-data)
- Profile: `POST /get_ig_user_info_v2.php`
- Posts: `POST /get_ig_user_posts_v2.php`

Bei API-Fehler → automatischer Fallback auf Mock-Daten (kein Crash).

---

## Architektur-Prinzipien

- Graceful Fallback: Jeder Agent fällt bei API-Fehler auf Mock-Daten zurück
- TypeScript Cast: `data as unknown as Record<string, unknown>` für ReactFlow
- No FFmpeg in Production: Video-Rendering über Shotstack Cloud API
- Knowledge Base: JSON-dateibasiert (src/data/knowledge-base.json)
- Sidebar: 6 Sektionen — System, Recherche, Content, Produktion, Publishing, Learning

---

## Nische & Zielstil

Nische: Fashion / Lifestyle / Travel  
Referenz: @killa_wp, @tobydeboer, @shotbyolisa, @meet.marketss  
Format: 9:16 Hochformat, 15-30 Sek., cinematisch, warm/moody Color Grading  
Plattformen: Instagram Reels → TikTok → YouTube Shorts

---

## Offene TODOs

- [ ] Video Agent auf Shotstack API umbauen
- [ ] Shotstack Account: https://shotstack.io
- [ ] OpenAI API Key einbinden
- [ ] Pexels API Key einbinden
- [ ] Deployment auf Vercel

---

Stack: Next.js 14 · TypeScript · Tailwind · Prisma · @xyflow/react  
Letzter Sync: Juni 2026
