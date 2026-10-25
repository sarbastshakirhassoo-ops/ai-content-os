// ─────────────────────────────────────────────────────────────────────────────
// Primärquellen für Wirtschaftsdaten: EZB, Eurostat, Weltbank.
//
// Alle drei sind Datenbanken, keine Suchmaschinen. Sie können deshalb nur
// Fragen bedienen, für die eine Kennzahl hinterlegt ist. Passt die Frage
// nicht, liefert der Adapter eine leere Liste — er rät nicht und er
// erfindet nichts. Die Abdeckung ist bewusst klein und in
// docs/BRAIN-V1-PLAN.md als Einschränkung vermerkt.
// ─────────────────────────────────────────────────────────────────────────────

import { fetchJson, isoDate } from '../http.ts'
import type { ResearchDocument, SourceDefinition, SourceQuery } from '../types.ts'

const now = () => new Date().toISOString()

function matches(q: string, words: string[]): boolean {
  const s = q.toLowerCase()
  return words.some((w) => s.includes(w))
}

// ── EZB ──────────────────────────────────────────────────────────────────────

const ECB_BASE = 'https://data-api.ecb.europa.eu/service/data'

interface SdmxDimension { id: string; values: { id: string; name: string }[] }
interface SdmxResponse {
  dataSets?: { series?: Record<string, { observations?: Record<string, (number | null)[]> }> }[]
  structure?: { dimensions?: { series?: SdmxDimension[]; observation?: SdmxDimension[] } }
}

const RATE_WORDS = ['leitzins', 'zins', 'interest rate', 'policy rate', 'ezb', 'ecb', 'einlagensatz', 'deposit facility', 'refinanzierung']

export const ecb: SourceDefinition = {
  id: 'ecb',
  name: 'Europäische Zentralbank (Data Portal)',
  tier: 'PRIMARY',
  baseUrl: 'https://data-api.ecb.europa.eu',
  domains: ['economics'],
  serves: ['REALTIME_SENSITIVE', 'CURRENT', 'SLOW_CHANGING', 'EVERGREEN'],
  requiresKey: false,
  description: 'Die drei EZB-Leitzinsen mit Stichtag. Offizielle Primärquelle, kein Key nötig.',
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    if (!matches(q.query + ' ' + q.originalQuestion, RATE_WORDS)) return []

    const url = `${ECB_BASE}/FM/D.U2.EUR.4F.KR.DFR+MRR_FR+MLFR.LEV?lastNObservations=1&format=jsondata`
    const j = await fetchJson<SdmxResponse>(url, { signal: q.signal })

    const dims = j.structure?.dimensions?.series ?? []
    const idIdx = dims.findIndex((d) => d.id === 'PROVIDER_FM_ID')
    const obsDate = j.structure?.dimensions?.observation?.[0]?.values?.[0]?.id ?? null
    const series = j.dataSets?.[0]?.series ?? {}
    if (idIdx < 0 || Object.keys(series).length === 0) return []

    const docs: ResearchDocument[] = []
    for (const [key, val] of Object.entries(series)) {
      const i = Number(key.split(':')[idIdx])
      const meta = dims[idIdx]?.values?.[i]
      const value = val.observations?.['0']?.[0]
      if (!meta || value === undefined || value === null) continue
      docs.push({
        title: `${meta.name} — ${value} %`,
        sourceId: 'ecb',
        sourceName: 'Europäische Zentralbank',
        sourceTier: 'PRIMARY',
        url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html',
        publishedAt: isoDate(obsDate),
        retrievedAt: now(),
        excerpt: `Offizieller EZB-Zinssatz "${meta.name}" (Kennung ${meta.id}) beträgt ${value} Prozent, Stand ${obsDate ?? 'unbekannt'}.`,
        query: q.query,
        fullTextFetched: false,
      })
    }
    return docs.slice(0, q.limit)
  },
}

// ── Eurostat ─────────────────────────────────────────────────────────────────

const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'

/** Bewusst kleine, kuratierte Auswahl. Erweiterbar, aber nie geraten. */
const EUROSTAT_INDICATORS: { words: string[]; dataset: string; params: string; label: string }[] = [
  {
    words: ['inflation', 'hicp', 'verbraucherpreis', 'consumer price'],
    dataset: 'prc_hicp_manr',
    params: 'geo=EA&coicop=CP00&unit=RCH_A&lastTimePeriod=1',
    label: 'HICP-Inflationsrate Euroraum, Veränderung zum Vorjahr',
  },
  {
    words: ['arbeitslos', 'unemployment'],
    dataset: 'une_rt_m',
    params: 'geo=EA20&unit=PC_ACT&s_adj=SA&age=TOTAL&sex=T&lastTimePeriod=1',
    label: 'Arbeitslosenquote Euroraum',
  },
]

interface JsonStat {
  label?: string
  updated?: string
  value?: Record<string, number>
  dimension?: { time?: { category?: { index?: Record<string, number>; label?: Record<string, string> } } }
}

export const eurostat: SourceDefinition = {
  id: 'eurostat',
  name: 'Eurostat',
  tier: 'PRIMARY',
  baseUrl: 'https://ec.europa.eu/eurostat',
  domains: ['economics'],
  serves: ['CURRENT', 'SLOW_CHANGING', 'EVERGREEN'],
  requiresKey: false,
  description: 'Statistikamt der EU. Abgedeckt sind derzeit Inflation und Arbeitslosenquote im Euroraum.',
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const text = `${q.query} ${q.originalQuestion}`
    const hit = EUROSTAT_INDICATORS.find((i) => matches(text, i.words))
    if (!hit) return []

    const j = await fetchJson<JsonStat>(
      `${EUROSTAT_BASE}/${hit.dataset}?format=JSON&${hit.params}`,
      { signal: q.signal },
    )
    const values = Object.values(j.value ?? {})
    if (values.length === 0) return []
    const period = Object.keys(j.dimension?.time?.category?.index ?? {})[0] ?? null

    return [{
      title: `${hit.label} — ${values[0]}`,
      sourceId: 'eurostat',
      sourceName: 'Eurostat',
      sourceTier: 'PRIMARY',
      url: `https://ec.europa.eu/eurostat/databrowser/view/${hit.dataset}/default/table`,
      publishedAt: isoDate(j.updated),
      retrievedAt: now(),
      excerpt: `${hit.label}: ${values[0]} für den Zeitraum ${period ?? 'unbekannt'}. Datensatz ${hit.dataset}, offizielle Statistik der Europäischen Union.`,
      query: q.query,
      fullTextFetched: false,
    }]
  },
}

// ── Weltbank ─────────────────────────────────────────────────────────────────

const WB_BASE = 'https://api.worldbank.org/v2'

const WB_INDICATORS: { words: string[]; code: string; label: string }[] = [
  { words: ['bip', 'gdp', 'bruttoinlandsprodukt', 'wirtschaftsleistung'], code: 'NY.GDP.MKTP.CD', label: 'Bruttoinlandsprodukt, laufende US-Dollar' },
  { words: ['wachstum', 'growth'], code: 'NY.GDP.MKTP.KD.ZG', label: 'BIP-Wachstum in Prozent' },
  { words: ['bevölkerung', 'population', 'einwohner'], code: 'SP.POP.TOTL', label: 'Bevölkerung, gesamt' },
]

const WB_COUNTRIES: { words: string[]; code: string; name: string }[] = [
  { words: ['deutschland', 'germany', 'deutsche'], code: 'DE', name: 'Deutschland' },
  { words: ['usa', 'vereinigte staaten', 'united states', 'amerika'], code: 'US', name: 'USA' },
  { words: ['china'], code: 'CN', name: 'China' },
  { words: ['frankreich', 'france'], code: 'FR', name: 'Frankreich' },
  { words: ['euroraum', 'eurozone', 'euro area'], code: 'XC', name: 'Euroraum' },
]

type WbResponse = [{ lastupdated?: string } | null, { date?: string; value?: number | null; country?: { value?: string }; indicator?: { value?: string } }[] | null]

export const worldBank: SourceDefinition = {
  id: 'worldbank',
  name: 'Weltbank',
  tier: 'PRIMARY',
  baseUrl: 'https://api.worldbank.org',
  domains: ['economics'],
  serves: ['SLOW_CHANGING', 'EVERGREEN'],
  requiresKey: false,
  description: 'Weltbank-Indikatoren. Abgedeckt sind BIP, BIP-Wachstum und Bevölkerung für ausgewählte Länder.',
  status: () => 'AVAILABLE',

  async fetch(q: SourceQuery): Promise<ResearchDocument[]> {
    const text = `${q.query} ${q.originalQuestion}`
    const ind = WB_INDICATORS.find((i) => matches(text, i.words))
    const country = WB_COUNTRIES.find((c) => matches(text, c.words))
    if (!ind || !country) return []

    const j = await fetchJson<WbResponse>(
      `${WB_BASE}/country/${country.code}/indicator/${ind.code}?format=json&per_page=1&mrnev=1`,
      { signal: q.signal },
    )
    const row = j[1]?.[0]
    if (!row || row.value === null || row.value === undefined) return []

    return [{
      title: `${ind.label} — ${country.name} (${row.date})`,
      sourceId: 'worldbank',
      sourceName: 'Weltbank',
      sourceTier: 'PRIMARY',
      url: `https://data.worldbank.org/indicator/${ind.code}?locations=${country.code}`,
      publishedAt: isoDate(j[0]?.lastupdated),
      retrievedAt: now(),
      excerpt: `${ind.label} für ${country.name} im Jahr ${row.date}: ${row.value}. Quelle: Weltbank-Indikator ${ind.code}.`,
      query: q.query,
      fullTextFetched: false,
    }]
  },
}
