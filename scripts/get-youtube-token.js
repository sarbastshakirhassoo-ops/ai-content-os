#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YouTube OAuth Refresh Token Generator
// Einmalig ausführen um YOUTUBE_REFRESH_TOKEN für .env zu bekommen
//
// Voraussetzungen:
//   1. Google Cloud Console → Neues Projekt erstellen
//   2. YouTube Data API v3 aktivieren
//   3. OAuth 2.0 Client ID erstellen (Typ: Web Application)
//      Redirect URI hinzufügen: http://localhost:8080/callback
//   4. YOUTUBE_CLIENT_ID und YOUTUBE_CLIENT_SECRET in .env eintragen
//   5. Dann: node scripts/get-youtube-token.js
// ─────────────────────────────────────────────────────────────────────────────

const http    = require('http')
const https   = require('https')
const url     = require('url')
const fs      = require('fs')
const path    = require('path')
const { execSync } = require('child_process')

// Lese .env Dateien ohne dotenv-Abhängigkeit
function loadEnv() {
  const env = {}
  const files = ['.env.local', '.env']
  for (const file of files) {
    const filePath = path.resolve(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      content.split('\n').forEach(line => {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"#\n]*)"?\s*$/)
        if (m && !env[m[1]]) env[m[1]] = m[2].trim()
      })
    }
  }
  return env
}

const envVars = loadEnv()
const CLIENT_ID     = process.env.YOUTUBE_CLIENT_ID     || envVars.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || envVars.YOUTUBE_CLIENT_SECRET
const REDIRECT_URI  = 'http://localhost:8080/callback'
const PORT          = 8080

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ YOUTUBE_CLIENT_ID und YOUTUBE_CLIENT_SECRET fehlen in .env.local\n')
  console.error('  1. Google Cloud Console: https://console.cloud.google.com')
  console.error('  2. APIs & Dienste → Anmeldedaten → OAuth 2.0 Client-ID erstellen')
  console.error('  3. Typ: Webanwendung, Redirect URI: http://localhost:8080/callback')
  console.error('  4. In .env.local eintragen:')
  console.error('     YOUTUBE_CLIENT_ID=deine-client-id')
  console.error('     YOUTUBE_CLIENT_SECRET=dein-client-secret\n')
  process.exit(1)
}

// OAuth Scopes für YouTube Upload + Analytics
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
].join(' ')

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&access_type=offline` +
  `&prompt=consent`

console.log('\n🔑 YouTube OAuth Token Generator\n')
console.log('Öffne diesen Link in deinem Browser:\n')
console.log(authUrl)
console.log('\n')

// Versuche den Browser automatisch zu öffnen
try {
  const cmd = process.platform === 'darwin' ? 'open'
            : process.platform === 'win32'  ? 'start'
            : 'xdg-open'
  execSync(`${cmd} "${authUrl}"`)
  console.log('✅ Browser wurde geöffnet.')
} catch {
  console.log('⚠️  Browser konnte nicht automatisch geöffnet werden. Kopiere den Link manuell.')
}

console.log('\nWarte auf OAuth Callback auf http://localhost:8080/callback ...\n')

// Lokaler HTTP-Server um Authorization Code zu empfangen
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true)
  if (!parsedUrl.pathname || parsedUrl.pathname !== '/callback') {
    res.end('Warte auf Callback...')
    return
  }

  const code  = parsedUrl.query.code
  const error = parsedUrl.query.error

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<h1>❌ Fehler: ${error}</h1><p>Versuche es erneut.</p>`)
    server.close()
    return
  }

  if (!code) {
    res.writeHead(400)
    res.end('Kein Authorization Code erhalten')
    return
  }

  console.log('✅ Authorization Code erhalten. Tausche gegen Refresh Token...')

  // Authorization Code → Tokens tauschen
  const tokenData = new URLSearchParams({
    code:          code,
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri:  REDIRECT_URI,
    grant_type:    'authorization_code',
  }).toString()

  const tokenRes = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path:     '/token',
      method:   'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenData),
      },
    }, (res) => {
      let body = ''
      res.on('data', d => body += d)
      res.on('end', () => resolve(JSON.parse(body)))
    })
    req.on('error', reject)
    req.write(tokenData)
    req.end()
  })

  if (tokenRes.error) {
    console.error('\n❌ Token-Fehler:', tokenRes.error_description || tokenRes.error)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<h1>❌ Token Fehler</h1><p>${tokenRes.error_description}</p>`)
    server.close()
    return
  }

  const refreshToken = tokenRes.refresh_token

  console.log('\n' + '═'.repeat(60))
  console.log('✅ REFRESH TOKEN ERHALTEN!')
  console.log('═'.repeat(60))
  console.log('\nFüge diese Zeile in deine .env.local ein:\n')
  console.log(`YOUTUBE_REFRESH_TOKEN=${refreshToken}`)
  console.log('\n' + '═'.repeat(60) + '\n')
  console.log('⚠️  WICHTIG: Diesen Token NIEMALS in Git committen!')
  console.log('   .env.local ist bereits in .gitignore.\n')

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(`
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: monospace; padding: 2rem; background: #0d0d14; color: #fff;">
      <h1 style="color: #10b981">✅ Refresh Token erhalten!</h1>
      <p>Füge dies in deine <code>.env.local</code> ein:</p>
      <pre style="background:#1e1e2e; padding:1rem; border-radius:8px; user-select:all">
YOUTUBE_REFRESH_TOKEN=${refreshToken}
      </pre>
      <p style="color:#f59e0b">⚠️ Niemals in Git committen!</p>
      <p>Du kannst dieses Fenster schließen.</p>
    </body>
    </html>
  `)

  server.close()
})

server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} ist bereits belegt. Beende zuerst andere Prozesse auf Port ${PORT}.\n`)
  } else {
    console.error('Server Fehler:', err)
  }
  process.exit(1)
})
