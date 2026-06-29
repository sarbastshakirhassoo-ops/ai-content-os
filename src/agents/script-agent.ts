/**
 * Script Agent v2 — Universell für jede Nische
 * Generiert Video-Skripte basierend auf Competitor-Daten oder freiem Input
 */

import { BaseAgent, AgentInput, AgentOutput } from './base'

export interface ScriptSection {
  label: string
  duration: string
  text: string
  visualNote: string
}

export interface VideoScript {
  topic: string
  niche: string
  platform: string
  duration: string
  hook: string
  sections: ScriptSection[]
  cta: string
  hashtags: string[]
  thumbnailIdea: string
  postingTime: string
  wordCount: number
  competitorSource?: string
}

export interface CompetitorContext {
  source?: string
  niche?: string
  hookPatterns?: string[]
  hashtags?: string[]
  topVideoTitles?: string[]
  avgViews?: number
  platform?: string
}

// ── Nischen-Datenbank ────────────────────────────────────────────────────────

interface NicheConfig {
  keywords: string[]
  problemHooks: string[]
  contentPoints: (topic: string) => string[]
  ctaTemplates: string[]
  thumbnailIdeas: string[]
  hashtags: string[]
  postingTime: string
}

const NICHE_CONFIGS: Record<string, NicheConfig> = {
  'Finance / Side Hustle': {
    keywords: ['geld', 'money', 'verdien', 'hustle', 'reich', 'finanz', 'invest', 'einkommen', 'nebeneinkommen', 'side'],
    problemHooks: [
      'Die meisten Menschen arbeiten 40 Stunden die Woche — und kommen trotzdem nicht weiter.',
      'Du weißt, dass du mehr verdienen könntest. Aber niemand zeigt dir wie.',
      'Ich war pleite. Dann habe ich das hier entdeckt.',
    ],
    contentPoints: (topic) => [
      `Schritt 1 zu "${topic}": Verstehe den Unterschied zwischen aktivem und passivem Einkommen. Hier ist warum das alles ändert.`,
      `Schritt 2: Du brauchst kein Startkapital — nur die richtige Strategie. Das ist meine:`,
      `Schritt 3: Klein starten, dann skalieren. Die meisten machen den Fehler, zu groß zu denken. Das blockiert sie.`,
    ],
    ctaTemplates: [
      'Folge mir — ich zeige dir jeden Tag neue Wege, mehr Geld zu verdienen.',
      'Kommentiere "INFO" wenn du mehr wissen willst.',
      'Speichere dieses Video — du wirst es brauchen.',
    ],
    thumbnailIdeas: [
      'Dein Gesicht + große Zahl (z.B. "1.000€/Monat") — schockierter Ausdruck',
      'Vorher/Nachher Split: leeres vs. volles Konto',
      'Hand hält Geldscheine, Text: "So funktioniert es wirklich"',
    ],
    hashtags: ['#sidehustle', '#geldverdienen', '#nebeneinkommen', '#passiveseinkommen', '#finanztipps', '#onlinegeld', '#reich', '#investieren'],
    postingTime: 'Di/Do 18:00–20:00 Uhr',
  },
  'KI / Tech': {
    keywords: ['ki', 'ai', 'chatgpt', 'künstliche', 'midjourney', 'automation', 'tool', 'tech', 'software', 'digital'],
    problemHooks: [
      'Du arbeitest noch manuell. In 2025 ist das ein Fehler.',
      'Während du das liest, überholen dich andere mit KI.',
      'Diese KI-Tools kennen die wenigsten — dabei sind sie kostenlos.',
    ],
    contentPoints: (topic) => [
      `Tool 1 für "${topic}": Kostenlos zu starten, Ergebnis in unter 5 Minuten. So nutzt du es:`,
      `Tool 2: Das nutzen Profis — du hast wahrscheinlich noch nie davon gehört.`,
      `Tool 3: Mein persönlicher Favorit. Ich spare damit täglich 2 Stunden.`,
    ],
    ctaTemplates: [
      'Folge mir für wöchentliche KI-Tool Updates.',
      'Welches Tool nutzt du? Kommentiere unten.',
      'Teile das — deine Freunde werden es dir danken.',
    ],
    thumbnailIdeas: [
      'Tool-Logo + dein Gesicht + Text: "Das verändert alles"',
      '3 Logos nebeneinander, Text: "Kostenlos & mächtig"',
      'Screen-Recording + dein Gesicht im Eck',
    ],
    hashtags: ['#kitools', '#chatgpt', '#aitools', '#ki', '#techhacks', '#produktivität', '#automation', '#ki2025'],
    postingTime: 'Mo/Mi 17:00–19:00 Uhr',
  },
  'Fitness / Health': {
    keywords: ['fitness', 'workout', 'gym', 'sport', 'training', 'abnehm', 'gesund', 'körper', 'muskel', 'diät'],
    problemHooks: [
      'Du trainierst seit Monaten — aber siehst keine Ergebnisse. Hier ist warum.',
      'Ich habe 6 Monate verschwendet bis ich das verstanden habe.',
      'Die Fitness-Industrie lügt dich an. Die Wahrheit ist viel einfacher.',
    ],
    contentPoints: (topic) => [
      `${topic}: Das Wichtigste ist Konstanz, nicht Intensität. 3x die Woche reicht wenn du es richtig machst.`,
      `Ernährung macht 70% des Ergebnisses aus. Dieser eine Trick ändert alles — kein Kalorien zählen nötig.`,
      `Recovery ist genauso wichtig wie Training. Die meisten ignorieren das komplett. So machst du es richtig.`,
    ],
    ctaTemplates: [
      'Folge mir für tägliche Fitness-Tipps die wirklich funktionieren.',
      'Welches ist dein größtes Fitness-Problem? Kommentiere unten.',
      'Speichere das für dein nächstes Training.',
    ],
    thumbnailIdeas: [
      'Transformation Vorher/Nachher',
      'Training im Gym, Text: "3x pro Woche reicht"',
      'Gesicht + Überraschung + Text: "Das ist der echte Grund"',
    ],
    hashtags: ['#fitness', '#workout', '#training', '#abnehmen', '#fitnessmotivation', '#gym', '#gesundheit', '#sport'],
    postingTime: 'Mo/Di 06:00–08:00 Uhr oder 19:00–21:00 Uhr',
  },
  'Food / Kochen': {
    keywords: ['rezept', 'kochen', 'food', 'essen', 'backen', 'küche', 'meal', 'lunch', 'dinner', 'snack'],
    problemHooks: [
      'Du weißt nicht was du heute kochen sollst? In 5 Minuten gelöst.',
      'Dieses Rezept macht dich zum Star beim nächsten Dinner.',
      'Ich koche das jede Woche — und alle fragen nach dem Rezept.',
    ],
    contentPoints: (topic) => [
      `Für "${topic}" brauchst du nur 3 Hauptzutaten. Der Rest ist optional.`,
      `Der geheime Schritt: Die meisten überspringen das — und das Ergebnis leidet darunter. So geht es richtig.`,
      `Anrichten: Präsentation macht 50% des Geschmackserlebnisses aus. So sieht es aus wie im Restaurant.`,
    ],
    ctaTemplates: [
      'Folge mir für täglich neue Rezepte.',
      'Hast du das nachgekocht? Zeig mir dein Ergebnis in den Kommentaren.',
      'Speichere das Rezept für später.',
    ],
    thumbnailIdeas: [
      'Fertiges Gericht dampfend in Nahaufnahme',
      'Schritt-für-Schritt Collage, Text: "20 Minuten"',
      'Dein Gesicht + Gericht, überraschter Ausdruck',
    ],
    hashtags: ['#rezept', '#kochen', '#foodtok', '#schnellrezept', '#foodhack', '#essen', '#küche', '#cooking'],
    postingTime: 'So 10:00–12:00 Uhr, Werktags 17:00–18:00 Uhr',
  },
  'Motivation / Mindset': {
    keywords: ['motivation', 'mindset', 'erfolg', 'mindfulness', 'produktiv', 'gewohnheit', 'selbst', 'ziel', 'mental'],
    problemHooks: [
      'Du weißt was du tun musst. Aber du tust es nicht. Hier ist warum.',
      'Ich war jahrelang stuck — bis ich diesen einen Satz verstanden habe.',
      'Die erfolgreichsten Menschen machen alle dasselbe Ding. Ich auch.',
    ],
    contentPoints: (topic) => [
      `${topic}: Dein Gehirn sabotiert dich — aber nicht aus bösem Willen. So überlisterst du es.`,
      `Die 2-Minuten-Regel: Wenn eine Aufgabe unter 2 Minuten dauert, mach sie sofort. Das verändert alles.`,
      `Konsistenz schlägt Perfektion. Jeden Tag 1% besser = nach einem Jahr 37x stärker.`,
    ],
    ctaTemplates: [
      'Folge mir für tägliche Mindset-Impulse.',
      'Was ist dein größtes Ziel gerade? Schreib es in die Kommentare.',
      'Teile das mit jemandem der das gerade braucht.',
    ],
    thumbnailIdeas: [
      'Dein Gesicht ernst/nachdenklich + inspirierendes Zitat',
      'Zitat auf schwarzem Hintergrund in weißer Schrift',
      '"So dachte ich früher" vs. "So denke ich jetzt"',
    ],
    hashtags: ['#motivation', '#mindset', '#erfolg', '#selbstentwicklung', '#gewohnheiten', '#produktivität', '#ziele', '#mindfulness'],
    postingTime: 'Mo 06:00–08:00 Uhr',
  },
  'Business / Marketing': {
    keywords: ['business', 'startup', 'marketing', 'brand', 'sales', 'verkauf', 'kunde', 'umsatz', 'wachstum', 'unternehm'],
    problemHooks: [
      'Dein Business wächst nicht? Das ist der echte Grund.',
      'Die meisten Unternehmer machen diesen einen Fehler — und verlieren Geld.',
      'Von 0 auf 10.000€ Monatsumsatz. So war das möglich:',
    ],
    contentPoints: (topic) => [
      `${topic}: Zuerst verstehst du deine Zielgruppe besser als sie sich selbst. So geht das konkret.`,
      `Dann baust du ein Angebot das sich fast von selbst verkauft — nicht wegen Tricks, wegen Relevanz.`,
      `Und dann: Systeme. Nicht du sollst arbeiten — dein Business soll arbeiten.`,
    ],
    ctaTemplates: [
      'Folge mir für tägliche Business-Strategien.',
      'Was ist dein größtes Business-Problem? Kommentiere unten.',
      'Teile das mit einem Unternehmer dem das hilft.',
    ],
    thumbnailIdeas: [
      'Dein Gesicht + Umsatzzahl + überraschter Ausdruck',
      'Whiteboard mit Strategie-Skizze',
      'Split: "Fehler" (rot) vs. "Lösung" (grün)',
    ],
    hashtags: ['#business', '#marketing', '#unternehmer', '#startup', '#wachstum', '#businesstipps', '#erfolg', '#vertrieb'],
    postingTime: 'Di/Mi 07:00–09:00 Uhr oder 18:00–20:00 Uhr',
  },
  'Travel / Lifestyle': {
    keywords: ['reise', 'travel', 'urlaub', 'trip', 'hotel', 'lifestyle', 'leben', 'freiheit', 'nomad', 'remote'],
    problemHooks: [
      'Du willst reisen aber denkst du kannst es dir nicht leisten? Falsch.',
      'Ich lebe jeden Monat an einem anderen Ort — so finanziere ich das.',
      'Dieser Reise-Hack spart dir hunderte Euro sofort.',
    ],
    contentPoints: (topic) => [
      `${topic}: Die besten Preise findest du nicht auf Booking.com. Hier ist mein System.`,
      `Lokale Geheimtipps: Was kein Reiseführer dir sagt — und wie du sie findest.`,
      `Budget-Breakdown: So reise ich einen Monat für unter 1.500€.`,
    ],
    ctaTemplates: [
      'Folge mir für wöchentliche Reise-Hacks.',
      'Wohin willst du als nächstes? Kommentiere unten.',
      'Speichere das für deinen nächsten Trip.',
    ],
    thumbnailIdeas: [
      'Du an beeindruckendem Ort mit breitem Lächeln',
      'Beeindruckende Landschaft + Text: "Für 50€/Tag"',
      'Vorher/Nachher: Büro vs. Strand',
    ],
    hashtags: ['#travel', '#reisen', '#digitalnomad', '#reisehacks', '#urlaub', '#traveltips', '#lifestyle', '#freiheit'],
    postingTime: 'Fr/Sa 20:00–22:00 Uhr',
  },
  'Beauty / Fashion': {
    keywords: ['beauty', 'makeup', 'mode', 'fashion', 'style', 'outfit', 'haut', 'haare', 'pflege', 'kosmetik'],
    problemHooks: [
      'Du kaufst teure Produkte — aber siehst keinen Unterschied? Hier warum.',
      'Dieses Outfit-Hack spart dir 200€ und sieht trotzdem teuer aus.',
      'Ich habe meine Hautpflege auf 3 Produkte reduziert. Das Ergebnis:',
    ],
    contentPoints: (topic) => [
      `${topic}: Das wichtigste Produkt kostet unter 20€. Nicht was du denkst.`,
      `Der Trick den Profis wissen: Vorbereitung macht 80% des Ergebnisses aus.`,
      `So trägst du es richtig auf — die meisten machen hier den entscheidenden Fehler.`,
    ],
    ctaTemplates: [
      'Folge mir für tägliche Beauty & Style Tipps.',
      'Welches Produkt fehlt in meiner Routine? Kommentiere.',
      'Zeig mir deinen Look — tagge mich.',
    ],
    thumbnailIdeas: [
      'Vorher/Nachher Makeup, dramatic lighting',
      'Outfit Flatlay mit Preisangaben',
      'Close-up Haut, Text: "Nur 3 Produkte"',
    ],
    hashtags: ['#beauty', '#makeup', '#fashion', '#style', '#outfit', '#beautytips', '#skincare', '#mode'],
    postingTime: 'Sa/So 10:00–13:00 Uhr',
  },
}

const DEFAULT_CONFIG: NicheConfig = {
  keywords: [],
  problemHooks: [
    'Die meisten Menschen machen diesen Fehler. Du auch?',
    'Ich hätte das früher wissen müssen.',
    'Das verändert alles — wenn du es einmal weißt.',
  ],
  contentPoints: (topic) => [
    `Punkt 1 zu "${topic}": Der häufigste Fehler — und wie du ihn vermeidest.`,
    `Punkt 2: Was Profis wissen und Anfänger nicht.`,
    `Punkt 3: Der entscheidende Schritt den fast alle überspringen.`,
  ],
  ctaTemplates: [
    'Folge mir für mehr Tipps zu diesem Thema.',
    'Speichere das Video für später.',
    'Kommentiere deine Meinung unten.',
  ],
  thumbnailIdeas: [
    'Dein Gesicht + überraschter Ausdruck + provokanter Text',
    'Vorher/Nachher Vergleich',
    'Top 3 auf cleanem Hintergrund',
  ],
  hashtags: ['#tipps', '#lernen', '#wissen', '#viral', '#foryou', '#trending'],
  postingTime: 'Di/Do 18:00–20:00 Uhr',
}

function detectNicheConfig(niche: string): NicheConfig {
  const lower = niche.toLowerCase()
  for (const [key, cfg] of Object.entries(NICHE_CONFIGS)) {
    const parts = key.toLowerCase().split(/[\/\s]+/)
    if (parts.some(p => lower.includes(p) && p.length > 3)) return cfg
    if (cfg.keywords.some(kw => lower.includes(kw))) return cfg
  }
  return DEFAULT_CONFIG
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildScript(
  topic: string,
  niche: string,
  platform: string,
  customHook?: string,
  competitorCtx?: CompetitorContext
): VideoScript {
  const cfg = detectNicheConfig(niche)
  const isShort = /short|tiktok|reel/i.test(platform)

  // Hook: competitor pattern > custom > generated
  let hook = customHook || ''
  if (!hook && competitorCtx?.hookPatterns?.length) {
    hook = pickRandom(competitorCtx.hookPatterns)
  }
  if (!hook) {
    const generated = [
      `${topic} — das wissen die wenigsten`,
      `Warum du mit "${topic}" noch keinen Erfolg hast`,
      `Das verändert alles: ${topic}`,
      `Ich habe "${topic}" getestet — hier die ehrliche Wahrheit`,
      `Niemand redet darüber: ${topic}`,
    ]
    hook = pickRandom(generated)
  }

  const competitorNote = competitorCtx?.source
    ? `Analysiert von ${competitorCtx.source}.`
    : ''

  const sections: ScriptSection[] = isShort
    ? [
        {
          label: '🎣 Hook (0–4 Sek.)',
          duration: '4 Sek.',
          text: hook,
          visualNote: 'KEIN Intro, KEIN "Hey Leute". Direkt der stärkste Satz. Kamera auf Augenhöhe, gutes Licht.',
        },
        {
          label: '😤 Problem / Spannung (4–15 Sek.)',
          duration: '11 Sek.',
          text: pickRandom(cfg.problemHooks),
          visualNote: 'Authentisch, direkt in die Kamera. Kurze Pause nach letztem Satz für Wirkung.',
        },
        {
          label: '💡 Inhalt (15–50 Sek.)',
          duration: '35 Sek.',
          text: cfg.contentPoints(topic).join('\n\n'),
          visualNote: `Ca. 10–12 Sek. pro Punkt. ${competitorNote} Schnelle Cuts, Text-Overlays für Hauptaussagen.`,
        },
        {
          label: '📣 CTA (50–60 Sek.)',
          duration: '10 Sek.',
          text: pickRandom(cfg.ctaTemplates),
          visualNote: 'Lächeln, kurz und direkt. Hand zeigt optional auf Folgen-Button.',
        },
      ]
    : [
        {
          label: '🎣 Hook (0–30 Sek.)',
          duration: '30 Sek.',
          text: hook + '\n\n' + pickRandom(cfg.problemHooks),
          visualNote: 'Sofortiger Einstieg. Kein Intro länger als 5 Sek.',
        },
        {
          label: '💡 Hauptinhalt (1–6 Min.)',
          duration: '5 Min.',
          text: cfg.contentPoints(topic).join('\n\n'),
          visualNote: `B-Roll oder Screen-Recording für jeden Punkt. ${competitorNote}`,
        },
        {
          label: '📣 CTA & Abschluss (letzte 30 Sek.)',
          duration: '30 Sek.',
          text: pickRandom(cfg.ctaTemplates) + '\n\nDanke fürs Zuschauen — bis zum nächsten Video.',
          visualNote: 'Kurz und klar. Link in Beschreibung erwähnen wenn relevant.',
        },
      ]

  const hashtags = [
    ...(competitorCtx?.hashtags?.slice(0, 5) || []),
    ...cfg.hashtags.filter(h => !(competitorCtx?.hashtags || []).includes(h)),
  ].slice(0, 10)

  const fullText = sections.map(s => s.text).join(' ')

  return {
    topic,
    niche: niche || 'Allgemein',
    platform,
    duration: isShort ? '55–60 Sek.' : '5–8 Min.',
    hook,
    sections,
    cta: pickRandom(cfg.ctaTemplates),
    hashtags,
    thumbnailIdea: pickRandom(cfg.thumbnailIdeas),
    postingTime: cfg.postingTime,
    wordCount: fullText.split(/\s+/).length,
    competitorSource: competitorCtx?.source,
  }
}

export class ScriptAgent extends BaseAgent {
  slug = 'script-writer'
  name = 'Script Agent'

  validateInput(input: AgentInput): boolean | string {
    if (!input.topic) return 'Topic ist erforderlich'
    return true
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()
    const topic    = String(input.topic    || 'Content erstellen')
    const niche    = String(input.niche    || 'Allgemein')
    const platform = String(input.platform || 'TikTok / YouTube Shorts')
    const hook     = input.hook ? String(input.hook) : undefined
    const ctx      = input.competitorContext as CompetitorContext | undefined

    const script = buildScript(topic, niche, platform, hook, ctx)

    return {
      success: true,
      data: { script },
      durationMs: Date.now() - start,
    }
  }
}

export { buildScript, detectNicheConfig }
export const AVAILABLE_NICHES = Object.keys(NICHE_CONFIGS)
