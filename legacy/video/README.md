# Legacy: AI Content OS (Video-Pipeline)

Dieses Verzeichnis enthält das vollständige, vormals aktive Video-System.
Es wurde am 2026-09-10 aus dem aktiven System entfernt, **nicht gelöscht**.

## Warum

Das Projekt wurde auf ein Universal Intelligence Brain umgebaut.
Video ist damit keine Kern-Domäne mehr. Perspektivisch kann die Pipeline als
*Tool* des Brains zurückkehren:

    BRAIN → VIDEO TOOL

nicht mehr:

    VIDEO SYSTEM = BRAIN

## Status

Dieses Verzeichnis ist **nicht lauffähig** und wird **nicht gebaut**:

- `tsconfig.json` schliesst `legacy` von Typecheck und Build aus
- Die Pfad-Alias `@/*` zeigt weiterhin auf `src/*`, nicht hierher.
  Interne Imports wie `@/agents/base` oder `@/lib/job-store` zeigen deshalb
  ins Leere und müssen bei einer Reaktivierung umgeschrieben werden.
- Root-Ordner `data/`, `prisma/`, `scripts/`, `public/videos/` existieren
  im aktiven Projekt nicht mehr. Code, der `process.cwd() + '/data'` liest,
  läuft nicht ohne Anpassung.

## Inhalt

| Pfad | Was |
|---|---|
| `agents/` | 14 Pipeline-Agents plus `base.ts` |
| `lib/video-engine/` | FFmpeg-, Shotstack- und Manifest-Generator |
| `lib/job-store.ts` | Job-Persistenz mit Step-Logging |
| `lib/niche-config.ts`, `lib/demo-data.ts`, `lib/prisma.ts` | Nischen-Konfiguration, Demo-Daten, Prisma-Client |
| `app/` | 19 Seiten und 20 API-Routen |
| `components/dashboard/` | Video-KPI-Widgets |
| `hooks/useLatestJob.ts` | Polling-Hook |
| `types/index.ts` | Alte Typen inkl. `VideoProject` |
| `scripts/` | Scheduler, YouTube-Token-Helfer, Text-Overlay |
| `scripts-python/` | `video_creator.py` |
| `data-root/`, `data-src/` | Jobs, Videos, Video-Pakete, Knowledge Base |
| `prisma-schema/` | Prisma-Schema und SQLite-Datei |
| `public-videos/` | Gerenderte Videos und Concat-Listen |
| `deploy/` | Dockerfile, PUSH_MORNING.sh |

## Entfernt statt archiviert

Fünf Agents bestanden ausschliesslich aus `this.simulate()` plus
`Math.random()` und lieferten Fantasiedaten. Sie wurden per `git rm` entfernt
und sind über die Git-Historie wiederherstellbar:

    optimization-agent.ts  prompt-agent.ts  subtitle-agent.ts
    topic-agent.ts         voiceover-agent.ts

Wiederherstellen mit:

    git log --diff-filter=D --name-only -- 'src/agents/*'
    git checkout <commit>^ -- src/agents/topic-agent.ts

## Bekannte Altlasten

Falls dieses System je reaktiviert wird, sind das die offenen Punkte:

- `trend-agent.ts` enthält zwölf `Math.random()`-Aufrufe in Scoring und
  Prognosen. Die Zahlen sehen echt aus, sind es aber nicht.
- `competitor-agent.ts` fällt bei API-Fehlern still auf `getMock*Profile()`
  zurück und gibt erfundene Profile als echte Daten aus.
- `job-store.ts` behauptet im Kommentar atomares Schreiben, nutzt aber
  ein einfaches `writeFileSync`.
- `job-store.ts` behält nur die letzten 100 Jobs.
- `getYTToken()` existiert doppelt, in `trend-agent.ts` und `competitor-agent.ts`.

## Was ins Brain übernommen wurde

Aus `trend-agent.ts` werden in Roadmap-Schritt 4 genau sechs Funktionen
geerntet und in die Research-Schicht überführt:

    parseRSS  fetchGoogleNews  fetchHackerNews
    fetchReddit  fetchProductHunt  clusterSources

Aus `job-store.ts` wird in Schritt 3 das Step-Logging-Muster übernommen.
Alles Übrige bleibt hier liegen.
