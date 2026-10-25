#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Architektur-Grenzen prüfen. Läuft in `npm run check`.
//
// 1. Kein Modul ausserhalb src/brain/providers/ darf einen konkreten
//    LLM-Anbieter importieren. Brain-Code kennt nur das Interface.
// 2. Kein Import zwischen src/ und legacy/ in beide Richtungen.
// 3. Kein hartkodierter API-Key im Quellcode.
// 4. Kein `simulate(` und kein `Math.random()` im aktiven Brain-Code.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'

const files = globSync('src/**/*.{ts,tsx}')
const violations = []

const CONCRETE_PROVIDERS = ['./gemini', './ollama', 'providers/gemini', 'providers/ollama']
const KEY_PATTERNS = [
  { re: /AIza[0-9A-Za-z_-]{20,}/, what: 'Google-API-Key' },
  { re: /sk-[A-Za-z0-9_-]{20,}/, what: 'OpenAI-artiger Key' },
  { re: /['"]ya29\.[A-Za-z0-9_-]{10,}/, what: 'OAuth-Token' },
]

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const inProviderDir = file.startsWith('src/brain/providers/')

  src.split('\n').forEach((line, i) => {
    const at = `${file}:${i + 1}`
    const isImport = /^\s*(import|export)\b.*\bfrom\s+['"]/.test(line)

    if (isImport && !inProviderDir && CONCRETE_PROVIDERS.some((p) => line.includes(`'${p}'`) || line.includes(`"${p}"`))) {
      violations.push(`${at}  konkreter LLM-Provider ausserhalb von src/brain/providers/`)
    }
    if (isImport && /['"](@\/)?\.{0,2}\/?legacy\//.test(line)) {
      violations.push(`${at}  Import aus legacy/`)
    }
    for (const { re, what } of KEY_PATTERNS) {
      if (re.test(line)) violations.push(`${at}  hartkodierter ${what}`)
    }
    if (/\bthis\.simulate\s*\(/.test(line)) {
      violations.push(`${at}  simulate() — in V1 nicht erlaubt`)
    }
    if (/\bMath\.random\s*\(/.test(line)) {
      violations.push(`${at}  Math.random() — darf kein Ergebnis erzeugen, das echt aussieht`)
    }
  })
}

// Gegenprobe: findet das Skript überhaupt Dateien?
if (files.length === 0) {
  console.error('CHECK KAPUTT — keine Dateien unter src/ gefunden')
  process.exit(2)
}

if (violations.length > 0) {
  console.error(`✗ ${violations.length} Grenzverletzung(en) in ${files.length} Dateien:\n`)
  violations.forEach((v) => console.error('  ' + v))
  process.exit(1)
}
console.log(`✓ Architektur-Grenzen eingehalten (${files.length} Dateien geprüft)`)
