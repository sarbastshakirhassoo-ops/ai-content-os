#!/bin/bash
# Morgen früh im Terminal ausführen:
# cd ~/Library/Application\ Support/Claude/local-agent-mode-sessions/41d54a93-44c3-412b-ae0f-05f06b6fdfdb/4783434a-d570-4a90-b5d9-4bf1283671be/local_71a0efe7-e905-4fd6-b29a-c4ae73b878e3/outputs/ai-content-os
# bash PUSH_MORNING.sh

set -e
cd "$(dirname "$0")"

echo "🔓 Entferne Git-Locks..."
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock

echo "📦 Git add..."
git add -A

echo "💾 Git commit..."
git commit -m "feat: Nächte-Sprint — 3 Video-Pakete + alle Bugs gefixt

NEUE FEATURES:
- /first-video: Wochenplan mit 3 fertigen Video-Paketen
  - Di: Stille ist Macht
  - Do: Reich aussehen vs. reich sein
  - Sa: 3 Gewohnheiten die trennen
- InVideo AI Prompts, Scripts, SEO, Hashtags, Posting-Zeiten
- Learning Agent: neue Seite + API-Route
- Pipeline-Seite: alle 14 Agents verbunden mit Live-Status

BUG FIXES:
- 10 API-Routen mit try/catch abgesichert
- calendar/trends/seo: optional chaining (keine undefined crashes mehr)
- Workflow Canvas: ZWJ-Emoji crash behoben
- Competitor: GET-Route (kein manueller Input mehr)
- useLatestJob Hook: alle Agent-Seiten lesen aus aktivem Job

NEUE SEITEN: /first-video, /pipeline, /qc, /learning
NEUE APIs: assets, analytics, learning, video-package"

echo "🚀 Git push..."
git push origin main

echo ""
echo "✅ FERTIG! Alles ist live auf GitHub."
echo ""
echo "📱 Öffne im Browser:"
echo "   http://localhost:3000/first-video   ← Erste 3 Videos"
echo "   http://localhost:3000/pipeline      ← Live Pipeline Status"
echo "   http://localhost:3000/workflow      ← Futuristischer Canvas"
echo ""
echo "🎬 Zum ersten Video produzieren:"
echo "   1. http://localhost:3000/first-video öffnen"
echo "   2. InVideo Prompt kopieren"
echo "   3. https://invideo.io/ai öffnen"
echo "   4. Prompt einfügen → Generieren → Export"
