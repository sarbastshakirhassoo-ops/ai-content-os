// ─────────────────────────────────────────────────────────────────────────────
// AI Content Factory — Nische: Luxury Lifestyle + Nostalgie + Motivation
// Zentrale Konfiguration für alle Agents
// ─────────────────────────────────────────────────────────────────────────────

export const NICHE = 'Luxury Lifestyle + Nostalgie + Motivation + Erfolg + Cinematic'

export const BRAND_HANDLE = process.env.BRAND_HANDLE || 'YOUR_HANDLE'
// REFERENCE_CREATOR nur intern im Trend Scout verwendet
export const PLATFORMS = ['instagram', 'tiktok', 'youtube'] as const

// ── Kern-Werte der Marke ──────────────────────────────────────────────────────

export const BRAND_VALUES = [
  'Luxus',
  'Disziplin',
  'Erfolg',
  'Freiheit',
  'Motivation',
  'Nostalgie',
  'Business-Mindset',
  'High-End Lifestyle',
  'Cinematic Storytelling',
  'Millionaire Aesthetic',
] as const

// ── Verbotene Inhalte / Anti-Scam ────────────────────────────────────────────

export const FORBIDDEN_PHRASES = [
  'schnell reich',
  'in 7 tagen',
  'in 30 tagen millionär',
  'garantiert',
  'ohne arbeit',
  'passives einkommen ohne aufwand',
  'geheimtrick',
  'niemand zeigt dir das',
  'gratis geld',
  'free money',
  'get rich quick',
  'make money fast',
  '100% guaranteed',
  'risk free',
  'no work required',
  'overnight success',
] as const

// ── Visuelle Richtung ─────────────────────────────────────────────────────────

export const VISUAL_THEMES = [
  'Supersportwagen (Lamborghini, Ferrari, Porsche)',
  'Luxusautos bei Nacht mit Neonreflexionen',
  'Privatjet Interior & Exterior',
  'Yacht auf blauem Meer bei Sonnenuntergang',
  'Luxusvilla Pool bei Golden Hour',
  'Penthouse-Rooftop mit Skyline (Dubai, NYC, Miami)',
  'Dubai-Skyline bei Nacht',
  'Monaco Rennstrecke & Hafen',
  'Miami South Beach Neonlichter',
  'New York City Skyline bei Regen',
  'Tokio Straßen mit Neonlichtern',
  'Regen auf Autoscheibe mit Lichtreflexen',
  'First-Class Kabine Flugzeug',
  'Luxusuhren (Rolex, Patek, AP)',
  'Designer-Kleidung (Versace, Gucci, Balenciaga)',
  'Champagner-Glas bei Sonnenuntergang',
  'Schwarzer Sportwagen auf leerer Straße',
  'Golden Hour über Stadtsilhouette',
  'Slow-Motion Regen auf Glas',
  'Nostalgie-Ästhetik: Super-8, Film Grain, VHS Glitch',
] as const

// ── Asset Keywords für Suchanfragen ──────────────────────────────────────────

export const ASSET_KEYWORDS = {
  luxury_cars: ['luxury car night', 'sports car rain', 'lamborghini cinematic', 'ferrari golden hour', 'luxury automobile'],
  travel: ['private jet interior', 'yacht luxury', 'first class flight', 'luxury villa pool', 'penthouse rooftop view'],
  cities: ['dubai skyline night', 'new york city night', 'miami neon lights', 'monaco luxury', 'tokyo neon street'],
  lifestyle: ['luxury lifestyle aesthetic', 'millionaire lifestyle', 'success motivation', 'billionaire aesthetic', 'luxury fashion'],
  cinematic: ['cinematic dark moody', 'golden hour slow motion', 'rain on glass cinematic', 'luxury b-roll', 'dark aesthetic'],
  nostalgia: ['film grain vintage', 'super 8 film', 'nostalgic light leak', 'retro cinematic', 'analog aesthetic'],
} as const

// ── Hook-Bibliothek ───────────────────────────────────────────────────────────

export const HOOK_TEMPLATES = [
  'Das haben sie dir nie gesagt über {topic}...',
  'Wenn du das siehst, ändert sich alles.',
  'Die Version von dir, die du sein könntest.',
  '{number} Dinge, die reiche Menschen täglich tun.',
  'Das ist der Unterschied zwischen arm und reich.',
  'In {number} Jahren wirst du dir wünschen, das früher gewusst zu haben.',
  'Die meisten träumen davon. Wenige tun es.',
  'Das echte Leben des {topic}.',
  'Niemand zeigt dir die wahre Seite von {topic}.',
  'Dieser Moment änderte alles.',
  '{number} Sekunden, die dein Leben verändern können.',
  'Das ist kein Zufall. Das ist Disziplin.',
] as const

// ── Script-Struktur ───────────────────────────────────────────────────────────

export const SCRIPT_STRUCTURE = {
  hook: { durationSec: 2, description: 'Sofort-Hook: Bild + Text/Sound triggert in ersten 2 Sek.' },
  scene1: { durationSec: 5, description: 'Cinematic Visual — Luxus-Asset, kein Text, Atmosphäre aufbauen' },
  scene2: { durationSec: 8, description: 'Emotionaler Gedanke — kurzer Statement über Erfolg/Disziplin/Lifestyle' },
  scene3: { durationSec: 10, description: 'Luxury-Lifestyle-Bild mit Musik-Drop — höchste emotionale Wirkung' },
  scene4: { durationSec: 8, description: 'Motivierender Abschluss — "The version of you that..."' },
  cta: { durationSec: 3, description: 'CTA: Follow für mehr + Swipe-Up / Link in Bio' },
} as const

// ── Musik-Stile ───────────────────────────────────────────────────────────────

export const MUSIC_STYLES = [
  'Orchestral Cinematic — episch, aufbauend',
  'Emotional Piano — nostalgisch, melancholisch',
  'Hip-Hop Instrumental — dunkle Beats, luxuriös',
  'Trap Beat — langsam, schwer, cinematic',
  'Nostalgic Lo-Fi — warm, vintage, ruhig',
  'Epic Orchestra + Bass — maximale Wirkung',
  'Dark Ambient — filmisch, minimalistisch',
] as const

// ── InVideo Prompt Templates ──────────────────────────────────────────────────

export const INVIDEO_PROMPT_BASE = `Create a 30-45 second cinematic luxury lifestyle video in 9:16 vertical format.

Style: Dark luxury aesthetic, Cinematic, dark luxury quality — smooth cuts, film grain, moody.
Look: Deep shadows, golden highlights, film grain, smooth slow-motion.
Cuts: Fast but smooth — beat-synced cuts, speed ramping on key moments.
Text: Minimal overlays — powerful single-line statements, high-end typography.
Mood: Aspirational, motivational, nostalgic — makes viewer feel something.
Music: {music_style}
Hook: {hook}
Topic: {topic}

Visual sequence:
1. {scene_1} — cinematic establishing shot
2. {scene_2} — emotional connection moment
3. {scene_3} — luxury lifestyle peak visual
4. {scene_4} — aspirational closing image
5. CTA overlay: "Follow for more" — minimal, elegant

Format: MP4, 9:16, 1080x1920, 30fps
Effects: Film grain overlay, subtle vignette, color grade (Teal & Orange or Dark & Moody)
Subtitles: Dynamic captions, bold sans-serif, white with dark outline`

// ── SEO Keywords ──────────────────────────────────────────────────────────────

export const SEO_KEYWORDS = [
  'luxury lifestyle', 'motivation 2024', 'success mindset', 'millionaire lifestyle',
  'billionaire aesthetic', 'cinematic edit', 'luxury cars', 'private jet lifestyle',
  'wealth mindset', 'discipline', 'hustle motivation', 'luxury travel',
  'nostalgia aesthetic', 'dark luxury', 'empire mindset', 'rich lifestyle',
  'success motivation', 'luxury living', 'billionaire morning routine', 'grind motivation',
] as const

export const HASHTAG_SETS = {
  universal: ['#luxury', '#motivation', '#success', '#lifestyle', '#mindset', '#discipline', '#wealthy'],
  instagram: ['#luxurylifestyle', '#cinematic', '#reels', '#motivation2024', '#millionairemindset', '#aesthetic'],
  tiktok: ['#fyp', '#viral', '#luxurylife', '#motivational', '#successmindset', '#cinematicedit', '#richlife'],
  youtube: ['#luxurylifestyle', '#motivation', '#shorts', '#success', '#cinematic', '#millionaire'],
} as const

// ── Posting-Zeiten (optimiert für Engagement) ────────────────────────────────

export const BEST_POSTING_TIMES = {
  instagram: [
    { day: 'Monday',    time: '07:00', timezone: 'Europe/Berlin' },
    { day: 'Wednesday', time: '12:00', timezone: 'Europe/Berlin' },
    { day: 'Friday',    time: '19:00', timezone: 'Europe/Berlin' },
    { day: 'Sunday',    time: '20:00', timezone: 'Europe/Berlin' },
  ],
  tiktok: [
    { day: 'Tuesday',   time: '09:00', timezone: 'Europe/Berlin' },
    { day: 'Thursday',  time: '19:00', timezone: 'Europe/Berlin' },
    { day: 'Saturday',  time: '11:00', timezone: 'Europe/Berlin' },
  ],
  youtube: [
    { day: 'Wednesday', time: '15:00', timezone: 'Europe/Berlin' },
    { day: 'Saturday',  time: '13:00', timezone: 'Europe/Berlin' },
  ],
} as const
