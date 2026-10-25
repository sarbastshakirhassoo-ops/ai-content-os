#!/usr/bin/env python3
"""
AI Content OS — Video Creator Agent
Erstellt faceless Short-Form Videos (9:16) aus Skripten
Stock-Footage: Pexels | Stimme: Google TTS | Overlays: PIL
"""

import sys
import json
import os
import requests
import tempfile
import textwrap
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from gtts import gTTS
try:
    # moviepy 2.x
    from moviepy import VideoFileClip, AudioFileClip, ImageClip, CompositeVideoClip, concatenate_videoclips, ColorClip
except ImportError:
    # moviepy 1.x fallback
    from moviepy.editor import VideoFileClip, AudioFileClip, ImageClip, CompositeVideoClip, concatenate_videoclips, ColorClip

# ── Konstanten ─────────────────────────────────────────────────────────────────
WIDTH, HEIGHT = 1080, 1920   # 9:16 Hochformat für Shorts / TikTok
FPS           = 30
MAX_SECTIONS  = 5            # Maximale Video-Abschnitte

# Farb-Palette (dunkel, cinematisch)
BG_DARK   = (8, 8, 20)
ACCENT    = (99, 102, 241)   # Indigo
WHITE     = (255, 255, 255)
BLACK     = (0, 0, 0)


# ── Pexels Stock-Video ─────────────────────────────────────────────────────────
def fetch_pexels_video(query: str, api_key: str, index: int = 0) -> Optional[str]:
    headers = {'Authorization': api_key}
    params  = {'query': query, 'per_page': 8, 'orientation': 'portrait', 'size': 'medium'}

    try:
        res = requests.get('https://api.pexels.com/videos/search', headers=headers, params=params, timeout=15)
        if not res.ok:
            return None
        videos = res.json().get('videos', [])
        if not videos:
            return None

        video     = videos[index % len(videos)]
        # Beste Qualität die nicht zu groß ist
        files     = sorted(video['video_files'], key=lambda x: x.get('width', 0))
        video_url = next((f['link'] for f in files if f.get('width', 0) >= 720), files[-1]['link'])

        tmp = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
        r   = requests.get(video_url, stream=True, timeout=60)
        for chunk in r.iter_content(chunk_size=16384):
            tmp.write(chunk)
        tmp.close()
        return tmp.name

    except Exception as e:
        print(f'[Pexels] Fehler: {e}', file=sys.stderr)
        return None


# ── Text-Overlay mit PIL ───────────────────────────────────────────────────────
def make_text_overlay(text: str, duration: float) -> ImageClip:
    img  = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Font laden
    font_size = 68
    font      = _load_font(font_size)
    small_font = _load_font(36)

    # Text umbrechen
    wrapped = textwrap.fill(text, width=22)
    lines   = wrapped.split('\n')

    line_h      = font_size + 20
    total_h     = len(lines) * line_h
    start_y     = HEIGHT // 2 - total_h // 2

    # Hintergrund-Gradient (halbtransparent)
    pad  = 40
    box  = [50, start_y - pad, WIDTH - 50, start_y + total_h + pad]
    _draw_rounded_rect(draw, box, radius=24, fill=(0, 0, 0, 200))

    # Akzent-Linie links
    draw.rectangle([50, box[1] + 10, 58, box[3] - 10], fill=(*ACCENT, 255))

    # Jede Zeile rendern
    for i, line in enumerate(lines):
        bbox       = draw.textbbox((0, 0), line, font=font)
        text_w     = bbox[2] - bbox[0]
        x          = (WIDTH - text_w) // 2
        y          = start_y + i * line_h

        # Schatten
        draw.text((x + 3, y + 3), line, font=font, fill=(0, 0, 0, 200))
        # Haupttext (weiß)
        draw.text((x, y), line, font=font, fill=(*WHITE, 255))

    arr = np.array(img)
    return ImageClip(arr, is_mask=False).with_duration(duration)


def make_hook_overlay(hook: str, duration: float) -> ImageClip:
    """Spezielle Overlay für den Hook — größer, auffälliger"""
    img  = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    font_size = 80
    font      = _load_font(font_size)

    wrapped = textwrap.fill(hook, width=18)
    lines   = wrapped.split('\n')

    line_h  = font_size + 24
    total_h = len(lines) * line_h
    start_y = HEIGHT // 2 - total_h // 2 - 60

    # Dunkler Hintergrund
    pad = 50
    box = [30, start_y - pad, WIDTH - 30, start_y + total_h + pad]
    _draw_rounded_rect(draw, box, radius=30, fill=(0, 0, 0, 210))

    # Farbiger Top-Streifen
    draw.rectangle([30, box[1], WIDTH - 30, box[1] + 8], fill=(*ACCENT, 255))

    for i, line in enumerate(lines):
        bbox   = draw.textbbox((0, 0), line, font=font)
        text_w = bbox[2] - bbox[0]
        x      = (WIDTH - text_w) // 2
        y      = start_y + i * line_h

        draw.text((x + 4, y + 4), line, font=font, fill=(0, 0, 0, 200))
        draw.text((x, y), line, font=font, fill=(*WHITE, 255))

    # "WATCH TILL END" unten
    small = _load_font(38)
    cta   = '👆 Bleib dran!'
    cb    = draw.textbbox((0, 0), cta, font=small)
    cx    = (WIDTH - (cb[2] - cb[0])) // 2
    draw.text((cx, HEIGHT - 200), cta, font=small, fill=(*ACCENT, 230))

    arr = np.array(img)
    return ImageClip(arr, is_mask=False).with_duration(duration)


def make_cta_overlay(cta: str, duration: float) -> ImageClip:
    img  = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = _load_font(56)

    wrapped = textwrap.fill(cta, width=20)
    lines   = wrapped.split('\n')
    line_h  = 76
    total_h = len(lines) * line_h
    start_y = HEIGHT // 2 - total_h // 2

    box = [40, start_y - 50, WIDTH - 40, start_y + total_h + 50]
    _draw_rounded_rect(draw, box, radius=24, fill=(*ACCENT, 220))

    for i, line in enumerate(lines):
        bbox   = draw.textbbox((0, 0), line, font=font)
        text_w = bbox[2] - bbox[0]
        x      = (WIDTH - text_w) // 2
        y      = start_y + i * line_h
        draw.text((x + 2, y + 2), line, font=font, fill=(0, 0, 0, 150))
        draw.text((x, y), line, font=font, fill=(*WHITE, 255))

    arr = np.array(img)
    return ImageClip(arr, is_mask=False).with_duration(duration)


# ── Hilfsfunktionen ────────────────────────────────────────────────────────────
def _load_font(size: int) -> ImageFont.FreeTypeFont:
    paths = [
        '/System/Library/Fonts/HelveticaNeue.ttc',
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/Arial.ttf',
        '/Library/Fonts/Arial Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _draw_rounded_rect(draw, box, radius, fill):
    x0, y0, x1, y1 = box
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.ellipse([x0, y0, x0 + radius * 2, y0 + radius * 2], fill=fill)
    draw.ellipse([x1 - radius * 2, y0, x1, y0 + radius * 2], fill=fill)
    draw.ellipse([x0, y1 - radius * 2, x0 + radius * 2, y1], fill=fill)
    draw.ellipse([x1 - radius * 2, y1 - radius * 2, x1, y1], fill=fill)


def tts_audio(text: str, lang: str = 'de') -> str:
    tts = gTTS(text=text, lang=lang, slow=False)
    tmp = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
    tts.save(tmp.name)
    tmp.close()
    return tmp.name


def load_bg(video_path: Optional[str], duration: float):
    if not video_path:
        return ColorClip((WIDTH, HEIGHT), color=BG_DARK, duration=duration)
    try:
        clip = VideoFileClip(video_path, audio=False)
        # Crop to 9:16
        clip_ratio = clip.w / clip.h
        if clip_ratio > WIDTH / HEIGHT:
            new_w = int(clip.h * WIDTH / HEIGHT)
            x1 = (clip.w - new_w) // 2
            clip  = clip.cropped(x1=x1, x2=x1 + new_w)
        else:
            new_h = int(clip.w * HEIGHT / WIDTH)
            y1 = (clip.h - new_h) // 2
            clip  = clip.cropped(y1=y1, y2=y1 + new_h)
        clip = clip.resized((WIDTH, HEIGHT))

        if clip.duration < duration:
            repeats = int(duration / clip.duration) + 1
            clip    = concatenate_videoclips([clip] * repeats)
        return clip.subclipped(0, duration)
    except Exception as e:
        print(f'[BG] Fehler: {e}', file=sys.stderr)
        return ColorClip((WIDTH, HEIGHT), color=BG_DARK, duration=duration)


# ── Haupt-Pipeline ─────────────────────────────────────────────────────────────
SEARCH_KEYWORDS = [
    'entrepreneur success money',
    'laptop business hustle',
    'ai technology future',
    'money cash wealth',
    'productivity work focus',
    'online business startup',
    'financial freedom lifestyle',
]


def create_video(script: dict, pexels_api_key: str, output_path: str) -> str:
    hook     = script.get('hook', 'Das verändert alles')
    sections = script.get('sections', [])
    cta      = script.get('cta', 'Folge mir für mehr Tipps!')

    all_parts = [
        {'text': hook, 'type': 'hook'},
        *[{'text': s['text'], 'type': 'section'} for s in sections[:MAX_SECTIONS - 1]],
        {'text': cta, 'type': 'cta'},
    ]

    clips      = []
    tmp_files  = []

    for i, part in enumerate(all_parts):
        text = part['text']
        kind = part['type']
        print(f'[{i+1}/{len(all_parts)}] Erstelle Abschnitt: {text[:40]}…', file=sys.stderr)

        # TTS
        audio_path = tts_audio(text)
        tmp_files.append(audio_path)
        audio_clip = AudioFileClip(audio_path)
        duration   = audio_clip.duration + 0.8

        # Stock-Video
        keyword    = SEARCH_KEYWORDS[i % len(SEARCH_KEYWORDS)]
        video_path = fetch_pexels_video(keyword, pexels_api_key, i) if pexels_api_key else None
        if video_path:
            tmp_files.append(video_path)

        bg = load_bg(video_path, duration)

        # Text-Overlay je nach Typ
        if kind == 'hook':
            overlay = make_hook_overlay(text, duration)
        elif kind == 'cta':
            overlay = make_cta_overlay(text, duration)
        else:
            overlay = make_text_overlay(text, duration)

        composite = CompositeVideoClip([bg, overlay], size=(WIDTH, HEIGHT))
        composite = composite.with_audio(audio_clip)
        clips.append(composite)

    print('[Video] Finales Video wird zusammengesetzt…', file=sys.stderr)
    final = concatenate_videoclips(clips, method='compose')
    final.write_videofile(
        output_path, fps=FPS, codec='libx264', audio_codec='aac',
        threads=4, preset='fast', logger=None
    )

    # Aufräumen
    for f in tmp_files:
        try:
            os.unlink(f)
        except Exception:
            pass

    print(json.dumps({'success': True, 'path': output_path, 'duration': final.duration}))
    return output_path


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Kein Input'}))
        sys.exit(1)

    data       = json.loads(sys.argv[1])
    api_key    = os.environ.get('PEXELS_API_KEY', '')
    out_path   = data.get('output_path', '/tmp/ai_video.mp4')

    create_video(data['script'], api_key, out_path)
