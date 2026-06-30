'use client'

import { useState, useRef } from 'react'

interface UploadResult {
  platform: string
  status: 'success' | 'error'
  url?: string
  videoId?: string
  error?: string
  uploadedAt: string
}

export default function UploadPage() {
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags]               = useState('#SideHustle #OnlineGeldVerdienen #KITools')
  const [videoFile, setVideoFile]     = useState<File | null>(null)
  const [loading, setLoading]         = useState(false)
  const [results, setResults]         = useState<UploadResult[] | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const fileRef                       = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!title || !description) {
      setError('Titel und Beschreibung sind Pflichtfelder')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('tags', tags)
    if (videoFile) formData.append('video', videoFile)

    try {
      const res  = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Upload')
      setResults(data?.results || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    }

    setLoading(false)
  }

  const fillFromScript = () => {
    setTitle('Diese 3 KI-Tools erledigen dein Studium in 20 Minuten')
    setDescription(`ChatGPT, Perplexity und Notion AI sind die 3 KI-Tools die ich täglich nutze um mein Studium in einem Bruchteil der Zeit zu erledigen.\n\n🔥 In diesem Video zeige ich dir genau wie ich diese Tools einsetze und wie du sofort starten kannst.\n\n👉 Folge mir für mehr KI-Tools und Side Hustle Tipps!\n\n#KITools #AITools2025 #ChatGPT #Produktivität #Studium #SideHustle #OnlineGeldVerdienen`)
    setTags('#KITools #AITools2025 #ChatGPT #Produktivität #Studium #SideHustle #OnlineGeldVerdienen #KI #TechTipps')
  }

  return (
    <div className="space-y-5 max-w-[800px]">
      <div>
        <h1 className="text-xl font-bold text-white">YouTube Upload</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Video direkt auf deinen Kanal hochladen — verbunden mit hustlezone
        </p>
      </div>

      <div className="bg-[#16161f] border border-[#1e1e2e] rounded-xl p-5 space-y-4">

        {/* Autofill */}
        <button
          onClick={fillFromScript}
          className="w-full py-2 border border-indigo-500/40 text-indigo-400 text-sm rounded-lg hover:bg-indigo-500/10 transition-colors"
        >
          ✍️ Aus Script Agent übernehmen
        </button>

        {/* Titel */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Video-Titel *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z.B. Diese 3 KI-Tools erledigen dein Studium in 20 Minuten"
            className="w-full bg-[#111118] border border-[#1e1e2e] focus:border-indigo-500/50 text-white text-sm rounded-lg px-3 py-2 outline-none"
          />
          <div className="text-xs text-slate-600 mt-1">{title.length}/100 Zeichen</div>
        </div>

        {/* Beschreibung */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Beschreibung *</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            placeholder="Beschreibung des Videos mit Hashtags..."
            className="w-full bg-[#111118] border border-[#1e1e2e] focus:border-indigo-500/50 text-white text-sm rounded-lg px-3 py-2 outline-none resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Tags (kommagetrennt)</label>
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            className="w-full bg-[#111118] border border-[#1e1e2e] focus:border-indigo-500/50 text-white text-sm rounded-lg px-3 py-2 outline-none"
          />
        </div>

        {/* Video Upload */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Video-Datei (optional)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-[#1e1e2e] hover:border-indigo-500/40 rounded-xl p-6 text-center cursor-pointer transition-colors"
          >
            {videoFile ? (
              <div>
                <p className="text-sm text-white font-medium">📹 {videoFile.name}</p>
                <p className="text-xs text-slate-500 mt-1">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-400">Klicke hier um eine Video-Datei auszuwählen</p>
                <p className="text-xs text-slate-600 mt-1">MP4, MOV — max 256MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={e => setVideoFile(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-slate-600 mt-1.5">
            Ohne Video-Datei wird nur ein Verbindungstest durchgeführt.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={loading || !title || !description}
          className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? 'Wird hochgeladen…' : '▶ Auf YouTube hochladen'}
        </button>
      </div>

      {/* Ergebnis */}
      {results && (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div
              key={i}
              className={`border rounded-xl p-4 ${
                r.status === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{r.status === 'success' ? '✅' : '❌'}</span>
                <span className="text-sm font-bold text-white capitalize">{r.platform}</span>
                <span className={`text-xs font-medium ${r.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {r.status === 'success' ? 'Erfolgreich hochgeladen' : 'Fehler'}
                </span>
              </div>
              {r.status === 'success' && r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                >
                  {r.url}
                </a>
              )}
              {r.status === 'error' && (
                <p className="text-xs text-red-400">{r.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
