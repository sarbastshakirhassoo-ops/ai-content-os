#!/bin/bash
# Prüft den Produktionspfad des LLM-Providers gegen scripts/mock-gemini.mjs.
# Kein echter API-Key nötig.
#
# Achtung: Next 16 erlaubt nur einen Dev-Server je Verzeichnis. Das Skript
# beendet deshalb einen laufenden `next dev`, bevor es startet.
set -uo pipefail
cd "$(dirname "$0")/.."

MOCK_PORT=4610
APP_PORT=3010
PASS=0; FAIL=0
ok()  { echo "  ✓ $1"; PASS=$((PASS+1)); }
bad() { echo "  ✗ $1"; echo "      $2"; FAIL=$((FAIL+1)); }

# Jede Antwort muss zuerst beweisen, dass überhaupt etwas ankam. Eine leere
# Antwort ist ein kaputter Testaufbau, nie ein bestandener Test.
nonempty() {
  if [ -z "${1//[|0]/}" ] || [ ${#1} -lt 5 ]; then
    bad "$2 — leere Antwort, Server nicht erreichbar"; return 1
  fi
  return 0
}

start_app() {
  kill "${APP_PID:-}" 2>/dev/null; wait "${APP_PID:-}" 2>/dev/null
  env GEMINI_API_BASE="http://localhost:$MOCK_PORT" \
      GEMINI_API_KEY="$1" \
      GEMINI_MODEL="gemini-2.5-flash" \
      BRAIN_LLM_PROVIDER="gemini" \
      npx next dev -p $APP_PORT > "$2" 2>&1 &
  APP_PID=$!
  for _ in $(seq 1 40); do
    curl -sf -o /dev/null "http://localhost:$APP_PORT/api/health" && return 0
    sleep 1
  done
  echo "  ✗ App auf Port $APP_PORT nicht erreichbar. Log:"; sed 's/^/      /' "$2" | tail -12
  FAIL=$((FAIL+1)); return 1
}

cleanup() { kill "${MOCK_PID:-}" "${APP_PID:-}" 2>/dev/null; wait 2>/dev/null; }
trap cleanup EXIT

echo "Laufenden next dev beenden…"
pkill -f "next dev" 2>/dev/null; sleep 2

node scripts/mock-gemini.mjs > /tmp/mock-gemini.log 2>&1 & MOCK_PID=$!
sleep 1
curl -sf -o /dev/null "http://localhost:$MOCK_PORT/models" -H "x-goog-api-key: test-key-not-a-real-secret" \
  || { echo "  ✗ Fixture-Server nicht erreichbar"; exit 1; }

start_app "test-key-not-a-real-secret" /tmp/app-test.log || exit 1

echo "Test 1 — Health meldet CONNECTED gegen erreichbare API"
H=$(curl -s "http://localhost:$APP_PORT/api/health")
if nonempty "$H" "Health"; then
  echo "$H" | grep -q '"id":"llm.gemini"[^}]*"status":"CONNECTED"' \
    && ok "gemini = CONNECTED" || bad "gemini nicht CONNECTED" "$(echo "$H" | head -c 300)"
fi

echo "Test 2 — Echte Antwort läuft durch die ganze Kette"
R=$(curl -s -X POST "http://localhost:$APP_PORT/api/llm/complete" -H 'content-type: application/json' -d '{"prompt":"Hallo Brain"}')
if nonempty "$R" "Completion"; then
  [[ "$R" == *'FIXTURE-ANTWORT auf: Hallo Brain'* ]] && ok "Antworttext korrekt durchgereicht" || bad "Antwort falsch" "$R"
  [[ "$R" == *'"providerId":"gemini"'* ]] && ok "providerId gesetzt" || bad "providerId fehlt" "$R"
  [[ "$R" == *'"outputTokens":7'* ]] && ok "Token-Usage geparst" || bad "Usage fehlt" "$R"
fi

echo "Test 3 — Rate-Limit wird als RATE_LIMITED gemappt"
R=$(curl -s -w '|%{http_code}' -X POST "http://localhost:$APP_PORT/api/llm/complete" -H 'content-type: application/json' -d '{"prompt":"TRIGGER_RATE_LIMIT","providerId":"gemini"}')
if nonempty "$R" "Rate-Limit"; then
  [[ "$R" == *'"kind":"RATE_LIMITED"'* && "$R" == *'|429' ]] && ok "429 + RATE_LIMITED" || bad "falsch gemappt" "$R"
fi

echo "Test 4 — Key wird niemals ausgegeben (falscher Key erzwingt Echo)"
BADKEY="AIzaSyFALSCHERKEYZUMTESTEN1234567890"
if start_app "$BADKEY" /tmp/app-test2.log; then
  R=$(curl -s -X POST "http://localhost:$APP_PORT/api/llm/complete" -H 'content-type: application/json' -d '{"prompt":"x","providerId":"gemini"}')
  if nonempty "$R" "Redaction"; then
    [[ "$R" == *"$BADKEY"* ]] && bad "API-Key steht in der Fehlermeldung" "$R" || ok "Key redigiert"
    [[ "$R" == *'"kind":"NOT_CONFIGURED"'* ]] && ok "401 -> NOT_CONFIGURED" || bad "401 falsch gemappt" "$R"
  fi
fi

echo "Test 5 — Key stand nie im Query-String"
grep -q 'FIXTURE-FEHLER' /tmp/mock-gemini.log && bad "Key im Query-String" "$(cat /tmp/mock-gemini.log)" || ok "Key nur im Header"

echo "Test 6 — Fallback auf den zweiten Provider, wenn der primäre scheitert"
# Der Server läuft noch mit dem falschen Gemini-Key aus Test 4.
if curl -sf -o /dev/null --max-time 3 "${OLLAMA_BASE_URL:-http://localhost:11434}/api/tags"; then
  R=$(curl -s --max-time 200 -X POST "http://localhost:$APP_PORT/api/llm/complete" -H 'content-type: application/json' -d '{"prompt":"Antworte nur mit dem Wort OK."}')
  if nonempty "$R" "Fallback"; then
    [[ "$R" == *'"providerId":"ollama"'* ]] \
      && ok "defekter Gemini-Key -> automatisch auf Ollama ausgewichen" \
      || bad "kein Fallback auf Ollama" "$(echo "$R" | head -c 200)"
  fi
else
  echo "  – übersprungen: Ollama läuft nicht (kein Fallback prüfbar)"
fi

echo
echo "$PASS bestanden, $FAIL fehlgeschlagen"
[ "$FAIL" -eq 0 ]
