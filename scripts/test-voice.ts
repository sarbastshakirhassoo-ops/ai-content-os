// Deterministischer Test der Sprachschicht, soweit sie ohne Browser prüfbar ist.
//
// Getestet wird die Textaufbereitung für die Vorlesefunktion und das Verhalten
// ausserhalb des Browsers. Mikrofon und Stimme selbst lassen sich hier nicht
// prüfen, das bleibt ein manueller Test und steht so in der Dokumentation.

import { speak, speakableText, startDictation, voiceSupport } from '../src/lib/voice.ts'

let pass = 0, fail = 0
const ok = (m: string) => { pass++; console.log(`  ✓ ${m}`) }
const bad = (m: string, d = '') => { fail++; console.log(`  ✗ ${m}`); if (d) console.log(`      ${d}`) }

console.log('Test 1 — Text wird fürs Vorlesen aufbereitet')
{
  const answer = `**Fakten:**

* Der Leitzins liegt bei **2,5 Prozent** [1, 3].
* Die Einlagefazilität beträgt 2,25 Prozent [1].

Quellen:
[1] EZB, 2026-10-25, https://www.ecb.europa.eu/stats/index.html
[3] ZDFheute, https://news.google.com/rss/articles/ABC123`

  const t = speakableText(answer)
  !t.includes('**') ? ok('Sternchen entfernt') : bad('Markup blieb stehen', t.slice(0, 80))
  !t.includes('[1') ? ok('Belegnummern entfernt') : bad('Belegnummern blieben', t.slice(0, 80))
  !t.includes('http') ? ok('URLs entfernt') : bad('URL blieb stehen', t.slice(0, 120))
  !/Quellen:/i.test(t) ? ok('Quellenliste wird nicht vorgelesen') : bad('Quellenliste blieb')
  t.includes('2,5 Prozent') ? ok('die eigentliche Aussage bleibt erhalten') : bad('Inhalt verloren', t)
  !/\s{2,}/.test(t) ? ok('keine doppelten Leerzeichen') : bad('Leerraum nicht normalisiert')
}

console.log('Test 2 — leere und kaputte Eingaben')
{
  speakableText('') === '' ? ok('leerer Text bleibt leer') : bad('leerer Text verändert')
  speakableText('Quellen:\n[1] x') === '' ? ok('reine Quellenliste ergibt nichts Vorlesbares') : bad('Rest blieb übrig')
  const onlyMarkup = speakableText('***___###')
  onlyMarkup === '' ? ok('reines Markup ergibt leeren Text') : bad(`erhalten: "${onlyMarkup}"`)
}

console.log('Test 3 — Verhalten ohne Browser')
{
  const s = voiceSupport()
  s.stt === false && s.tts === false
    ? ok('ohne window wird keine Sprachfähigkeit behauptet')
    : bad(`stt=${s.stt} tts=${s.tts}`)
  s.note.length > 0 ? ok('und es gibt eine Begründung') : bad('keine Begründung')

  speak('Hallo') === false ? ok('speak meldet ehrlich false statt zu tun als ob') : bad('speak behauptet Erfolg')
  startDictation({ onFinal: () => {} }) === null
    ? ok('startDictation gibt null statt eines toten Mikrofons') : bad('startDictation gab ein Objekt zurück')
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`)
process.exit(fail === 0 ? 0 : 1)
