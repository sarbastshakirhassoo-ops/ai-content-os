// ─────────────────────────────────────────────────────────────────────────────
// Demo-Data — NUR für Agent-Definitions (Sidebar, Agents-Page)
// Kein Demo-Content, keine Demo-Videos, keine Demo-KPIs
// Nische: Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentDef } from '@/types'

export const AGENT_DEFINITIONS: AgentDef[] = [
  {
    id: 'agent-1', slug: 'trend-agent', name: 'Trend Scout', icon: '🔥',
    description: 'Scannt YouTube, TikTok, Instagram, Reddit und Google News auf virale Luxury-Lifestyle, Motivation und Nostalgie-Trends. Berechnet Opportunity Score und Hook-Potenzial.',
    input: 'Nische (automatisch: Luxury Lifestyle + Motivation)', output: 'Trend-Liste, Opportunity Scores, Hook-Ideen, Asset-Keywords',
    status: 'idle', errorCount: 0, color: '#f59e0b', position: { x: 50, y: 80 },
  },
  {
    id: 'agent-2', slug: 'competitor-agent', name: 'Competitor Analyst', icon: '🕵️',
    description: 'Analysiert Top-Creator der Nische. Erkennt Hook-Muster, Schnittstil, Musikstil, Posting-Zeiten und erfolgreiche Formate für Luxury-Cinematic-Content.',
    input: 'Nische + Trend vom Trend Scout', output: 'Competitor Report: Hooks, Formate, Hashtags, Ästhetik-Analyse',
    status: 'idle', errorCount: 0, color: '#8b5cf6', position: { x: 270, y: 80 },
  },
  {
    id: 'agent-3', slug: 'knowledge-agent', name: 'Knowledge Base', icon: '🧠',
    description: 'Internes Gedächtnis — verhindert doppelte Topics, liefert beste Hooks aus vergangenen Videos, Hashtag-Bibliothek und Learnings aus Analytics.',
    input: 'Topic + Nische', output: 'Duplikat-Check, Top-Hooks, Top-Hashtags, Asset-Keywords, Learnings',
    status: 'idle', errorCount: 0, color: '#06b6d4', position: { x: 490, y: 80 },
  },
  {
    id: 'agent-4', slug: 'script-agent', name: 'Script Writer', icon: '✍️',
    description: 'Erstellt High-Retention Skripte im Cinematic Luxury Stil, motivierend, nostalgisch. Keine Scam-Phrasen. Strukturiert nach Hook → Visual → Emotion → CTA.',
    input: 'Topic, Nische, Competitor-Kontext, KB-Insights', output: 'Script, Hook, Szenen, CTA, Video-Prompt, Scene-Keywords',
    status: 'idle', errorCount: 0, color: '#ec4899', position: { x: 50, y: 280 },
  },
  {
    id: 'agent-5', slug: 'seo-agent', name: 'SEO Optimizer', icon: '🔍',
    description: 'Erstellt plattformoptimierte Metadaten für YouTube Shorts, TikTok und Instagram Reels. Luxury Lifestyle SEO-Keywords, Hashtag-Sets, alternative Titel.',
    input: 'Script + Topic vom Script Writer', output: 'YT-Titel, Beschreibung, TikTok-Caption, IG-Caption, 30 Hashtags',
    status: 'idle', errorCount: 0, color: '#10b981', position: { x: 270, y: 280 },
  },
  {
    id: 'agent-6', slug: 'brand-agent', name: 'Brand Consistency', icon: '🎨',
    description: 'Prüft ob Script und SEO zur Luxury-Lifestyle-Marke passen. Erkennt Scam-Sprache, unrealistische Versprechen und Brand-Abweichungen automatisch.',
    input: 'Script + SEO-Daten', output: 'Brand Score, Issues, Auto-Fix-Vorschläge',
    status: 'idle', errorCount: 0, color: '#f97316', position: { x: 490, y: 280 },
  },
  {
    id: 'agent-7', slug: 'asset-manager-agent', name: 'Asset Manager', icon: '🎬',
    description: 'Sucht lizenzreines Material via Pexels, Pixabay, Mixkit, Unsplash. Prüft jede Lizenz. Blockiert Szenen ohne rechtmäßig nutzbare Assets. YouTube als Quelle verboten.',
    input: 'Scene-Keywords vom Script Writer', output: 'Asset-Manifest mit Lizenz, Quelle, URL, Luxury-Score pro Szene',
    status: 'idle', errorCount: 0, color: '#6366f1', position: { x: 710, y: 280 },
  },
  {
    id: 'agent-8', slug: 'video-agent', name: 'Video Generation Engine', icon: '⚙️',
    description: 'Modulare Video Engine — wählt automatisch den besten verfügbaren Generator: FFmpeg (lokal) → Shotstack (API) → Manifest Fallback. Ken Burns, Crossfade, Color Grade, Film Grain, Untertitel.',
    input: 'Script, Assets, Musikstil, Color Look, Format', output: 'MP4 9:16, Video-URL, Render-Stats, Generator-Info',
    status: 'idle', errorCount: 0, color: '#ef4444', position: { x: 50, y: 480 },
  },
  {
    id: 'agent-9', slug: 'qc-agent', name: 'QC Inspector', icon: '✅',
    description: 'Automatische Qualitätsprüfung: Lizenz-Check, Scam-Sprache, Hook-Stärke, Luxury-Ästhetik, Brand-Konsistenz, 9:16-Format. Blockiert Upload bei kritischen Fehlern.',
    input: 'Video-URL, Script, Assets, Plattformen', output: 'QC Score, Pass/Fail, Blocker-Liste, Verbesserungsvorschläge',
    status: 'idle', errorCount: 0, color: '#22c55e', position: { x: 270, y: 480 },
  },
  {
    id: 'agent-10', slug: 'calendar-agent', name: 'Content Calendar', icon: '📅',
    description: 'Plant Veröffentlichungszeitpunkt basierend auf Plattform, Zielgruppe, bisheriger Performance und optimalen Posting-Zeiten für DE/AT/CH.',
    input: 'QC-Freigabe, Plattformen, Nische', output: 'Zeitplan, Erwartete Reichweite, Plattform-Anpassungen',
    status: 'idle', errorCount: 0, color: '#14b8a6', position: { x: 490, y: 480 },
  },
  {
    id: 'agent-11', slug: 'upload-agent', name: 'Upload Bot', icon: '🚀',
    description: 'Lädt Videos nur nach QC-Freigabe automatisch hoch. Nutzt plattformspezifische Metadaten. Bestätigt Live-URLs und meldet Fehler.',
    input: 'Video, QC-Freigabe, SEO-Daten, Zeitplan', output: 'Upload-Status, Live-URLs (YT/IG/TikTok)',
    status: 'idle', errorCount: 0, color: '#a855f7', position: { x: 710, y: 480 },
  },
  {
    id: 'agent-12', slug: 'analytics-agent', name: 'Analytics Brain', icon: '📊',
    description: 'Analysiert Performance nach Upload: Views, Watch Time, Retention, CTR, Follower-Wachstum. Erkennt Winning Patterns und gibt Empfehlungen.',
    input: 'Upload-URLs, Plattform-Daten', output: 'Performance Report, Winning Patterns, Alerts, Empfehlungen',
    status: 'idle', errorCount: 0, color: '#0ea5e9', position: { x: 50, y: 680 },
  },
  {
    id: 'agent-13', slug: 'engagement-agent', name: 'Engagement Analyzer', icon: '💬',
    description: 'Analysiert Kommentare und Community-Reaktionen. Erkennt Content-Wünsche, Fragen, Serien-Chancen und neue Trend-Signale aus der Community.',
    input: 'Upload-URLs + Analytics', output: 'Community Insights, Content-Ideen, FAQ, Serien-Chancen',
    status: 'idle', errorCount: 0, color: '#f43f5e', position: { x: 270, y: 680 },
  },
  {
    id: 'agent-14', slug: 'learning-agent', name: 'Learning Agent', icon: '🎓',
    description: 'Schreibt alle Erkenntnisse in die Knowledge Base zurück: beste Hooks, Hashtags, Asset-Keywords, InVideo-Prompts, Musik-Stile. Verbessert jeden folgenden Job automatisch.',
    input: 'Analytics + Engagement + QC-Ergebnisse', output: 'Aktualisierte Knowledge Base, neue Hook-Bibliothek, optimierte Prompts',
    status: 'idle', errorCount: 0, color: '#84cc16', position: { x: 490, y: 680 },
  },
]

// Leer — echte Videos kommen aus dem Job-System, nicht aus Demo-Daten
export const DEMO_VIDEOS: unknown[] = []

// Stub für StatusBar (realer Wert kommt von /api/dashboard)
export const DEMO_KPI = {
  videosToday: 0, successfulUploads: 0, failedUploads: 0,
  avgWatchtime: 0, bestPlatform: '—', activeAgents: 0, totalViews: 0,
}
