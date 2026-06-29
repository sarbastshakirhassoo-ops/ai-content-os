import { BaseAgent, AgentInput, AgentOutput } from './base'
import puppeteer, { Browser, Page } from 'puppeteer'
import path from 'path'
import fs from 'fs'

// ── InVideo AI Browser Automation Agent ──────────────────────────────────────
// Steuert InVideo AI automatisch via Browser-Automatisierung:
// 1. Einloggen mit INVIDEO_EMAIL + INVIDEO_PASSWORD
// 2. Prompt eingeben (aus Script Agent)
// 3. Auf Video-Generierung warten
// 4. Fertiges MP4 herunterladen
// 5. Pfad zurückgeben für QC Agent

const INVIDEO_URL = 'https://ai.invideo.io'
const DOWNLOAD_DIR = path.join(process.cwd(), 'public', 'videos')

// Stellt sicher dass Download-Ordner existiert
function ensureDownloadDir() {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
  }
}

// Baut den InVideo Prompt für den @69perception Stil
function buildInVideoPrompt(input: AgentInput): string {
  const script = (input.script as string) || ''
  const topic = (input.topic as string) || 'lifestyle motivation'
  const hook = (input.hook as string) || ''
  const niche = (input.niche as string) || 'Fashion, Lifestyle, Travel'

  return `Create a cinematic short-form video (30 seconds, 9:16 vertical format) in the style of aesthetic Instagram Reels.

Topic: ${topic}
Niche: ${niche}
Hook: ${hook}

Style: Dark, moody, cinematic. Smooth transitions. Warm color grading. Fast cuts synced to beat. Text overlays with motivational quotes. No talking heads. Pure montage style like @69perception on Instagram.

Script content:
${script}

Use cinematic stock footage or AI-generated clips showing: urban environments, luxury lifestyle, fashion details, travel moments, golden hour shots. Add trending background music. Include captions/subtitles. Export as 9:16 vertical video for Instagram Reels and TikTok.`
}

// Wartet auf ein Element mit Timeout
async function waitForSelector(page: Page, selector: string, timeout = 30000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout })
    return true
  } catch {
    return false
  }
}

// Hauptfunktion: InVideo Browser-Automatisierung
async function generateVideoWithInVideo(input: AgentInput): Promise<{ videoPath: string; videoUrl: string; prompt: string }> {
  const email = process.env.INVIDEO_EMAIL
  const password = process.env.INVIDEO_PASSWORD

  if (!email || !password) {
    throw new Error('INVIDEO_EMAIL und INVIDEO_PASSWORD müssen in .env gesetzt sein')
  }

  ensureDownloadDir()

  let browser: Browser | null = null

  try {
    // Browser starten
    browser = await puppeteer.launch({
      headless: false, // false = sichtbar für Debugging, true = unsichtbar für Production
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 },
    })

    const page = await browser.newPage()

    // Download-Verzeichnis setzen
    const client = await page.createCDPSession()
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: DOWNLOAD_DIR,
    })

    // ── Schritt 1: Login ──────────────────────────────────────────────────────
    console.log('[VideoAgent] Öffne InVideo AI...')
    await page.goto(`${INVIDEO_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 })

    // Email eingeben
    const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i]'
    await waitForSelector(page, emailSelector, 15000)
    await page.type(emailSelector, email, { delay: 50 })

    // Weiter-Button oder Passwort direkt
    const continueBtn = await page.$('button[type="submit"], button:has-text("Continue"), button:has-text("Next")')
    if (continueBtn) await continueBtn.click()

    await new Promise(r => setTimeout(r, 1500))

    // Passwort eingeben
    const passwordSelector = 'input[type="password"]'
    const hasPassword = await waitForSelector(page, passwordSelector, 10000)
    if (hasPassword) {
      await page.type(passwordSelector, password, { delay: 50 })
      await page.keyboard.press('Enter')
    }

    // Warten bis eingeloggt (Dashboard lädt)
    console.log('[VideoAgent] Warte auf Login...')
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
    await new Promise(r => setTimeout(r, 3000))

    // ── Schritt 2: Zum AI Video Creator navigieren ────────────────────────────
    console.log('[VideoAgent] Navigiere zum Video Creator...')
    await page.goto(`${INVIDEO_URL}/workspace`, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))

    // ── Schritt 3: Prompt eingeben ────────────────────────────────────────────
    const prompt = buildInVideoPrompt(input)
    console.log('[VideoAgent] Gebe Prompt ein...')

    // Textbox suchen
    const promptSelector = 'textarea, input[placeholder*="script" i], input[placeholder*="video" i], input[placeholder*="plan" i], [contenteditable="true"]'
    const hasPromptBox = await waitForSelector(page, promptSelector, 15000)

    if (!hasPromptBox) {
      throw new Error('Prompt-Eingabefeld nicht gefunden — InVideo UI hat sich möglicherweise geändert')
    }

    await page.click(promptSelector)
    await page.keyboard.type(prompt, { delay: 10 })

    // Generate Button klicken
    await new Promise(r => setTimeout(r, 1000))
    const generateBtn = await page.$('button[type="submit"], button:has-text("Generate"), button:has-text("Create")')
    if (generateBtn) {
      await generateBtn.click()
    } else {
      await page.keyboard.press('Enter')
    }

    // ── Schritt 4: Auf Video warten (kann 2-5 Minuten dauern) ────────────────
    console.log('[VideoAgent] Video wird generiert — warte bis zu 5 Minuten...')
    await new Promise(r => setTimeout(r, 10000)) // Erste 10 Sekunden warten

    // Warte auf Export/Download Button
    const exportSelector = 'button:has-text("Export"), button:has-text("Download"), button:has-text("Fertig"), [aria-label*="export" i], [aria-label*="download" i]'
    const videoReady = await waitForSelector(page, exportSelector, 300000) // 5 Minuten max

    if (!videoReady) {
      throw new Error('Video-Generierung hat zu lange gedauert oder ist fehlgeschlagen')
    }

    // ── Schritt 5: Video herunterladen ────────────────────────────────────────
    console.log('[VideoAgent] Video fertig — lade herunter...')
    await page.click(exportSelector)
    await new Promise(r => setTimeout(r, 3000))

    // MP4 Download-Option wählen falls vorhanden
    const mp4Btn = await page.$('button:has-text("MP4"), [data-format="mp4"], button:has-text("1080p")')
    if (mp4Btn) await mp4Btn.click()

    await new Promise(r => setTimeout(r, 2000))
    const downloadBtn = await page.$('button:has-text("Download"), a[download]')
    if (downloadBtn) await downloadBtn.click()

    // Warten bis Download abgeschlossen
    await new Promise(r => setTimeout(r, 10000))

    // Neueste MP4 Datei im Download-Ordner finden
    const files = fs.readdirSync(DOWNLOAD_DIR)
      .filter(f => f.endsWith('.mp4'))
      .map(f => ({ name: f, time: fs.statSync(path.join(DOWNLOAD_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time)

    if (files.length === 0) {
      throw new Error('Kein MP4 Download gefunden')
    }

    const videoFileName = files[0].name
    const videoPath = path.join(DOWNLOAD_DIR, videoFileName)
    const videoUrl = `/videos/${videoFileName}`

    console.log(`[VideoAgent] Video heruntergeladen: ${videoPath}`)
    return { videoPath, videoUrl, prompt }

  } finally {
    if (browser) await browser.close()
  }
}

// ── Mock Fallback ─────────────────────────────────────────────────────────────
function getMockVideoOutput(input: AgentInput) {
  const prompt = buildInVideoPrompt(input)
  return {
    videoUrl: '/videos/demo_video.mp4',
    videoPath: 'public/videos/demo_video.mp4',
    prompt,
    style: 'Cinematic Dark Montage (@69perception style)',
    resolution: '1080x1920 (9:16)',
    duration: '30s',
    platform: 'Instagram Reels / TikTok / YouTube Shorts',
    generatedBy: 'InVideo AI (Demo Mode)',
    note: 'Setze INVIDEO_EMAIL und INVIDEO_PASSWORD in .env für echte Video-Generierung',
  }
}

// ── Agent Klasse ──────────────────────────────────────────────────────────────
export class VideoAgent extends BaseAgent {
  slug = 'video-agent'
  name = 'Video Composer'

  validateInput(_input: AgentInput): boolean {
    return true
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const start = Date.now()

    // Demo Mode oder fehlende Credentials → Mock
    if (process.env.DEMO_MODE === 'true' || !process.env.INVIDEO_EMAIL || !process.env.INVIDEO_PASSWORD) {
      console.warn('[VideoAgent] Demo Mode — nutze Mock-Daten')
      await this.simulate(3000)
      const mock = getMockVideoOutput(input)
      return this.generateOutput(mock, start)
    }

    try {
      console.log('[VideoAgent] Starte InVideo AI Browser-Automatisierung...')
      const result = await generateVideoWithInVideo(input)

      const output = this.generateOutput({
        videoUrl: result.videoUrl,
        videoPath: result.videoPath,
        prompt: result.prompt,
        style: 'Cinematic Dark Montage (@69perception style)',
        resolution: '1080x1920 (9:16)',
        generatedBy: 'InVideo AI',
        platform: 'Instagram Reels / TikTok / YouTube Shorts',
      }, start)

      this.logResult(output)
      return output

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('[VideoAgent] Fehler:', msg)

      // Fallback auf Mock
      const mock = getMockVideoOutput(input)
      return this.generateOutput({
        ...mock,
        error: msg,
        note: 'Fehler bei InVideo Automatisierung — Mock-Daten werden verwendet',
      }, start)
    }
  }
}
