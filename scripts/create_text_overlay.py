#!/usr/bin/env python3
"""
Text Overlay Generator für AI Content OS
Erstellt ein transparentes PNG mit zentriertem Motivationstext.
Kein libfreetype nötig — läuft auf jedem Mac.

Usage: python3 create_text_overlay.py "Dein Text hier" 1080 1920 /output/overlay.png
"""

import sys
import os
from PIL import Image, ImageDraw, ImageFont

def wrap_text(text, max_chars=18):
    """Bricht Text in Zeilen auf, max. Zeichen pro Zeile."""
    words = text.split()
    lines = []
    current = []
    for word in words:
        if len(' '.join(current + [word])) <= max_chars:
            current.append(word)
        else:
            if current:
                lines.append(' '.join(current))
            current = [word]
    if current:
        lines.append(' '.join(current))
    return lines

def get_font(size):
    """Lädt System-Font, fallback auf PIL default."""
    candidates = [
        # macOS
        '/System/Library/Fonts/HelveticaNeue.ttc',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial Bold.ttf',
        '/Library/Fonts/Arial.ttf',
        '/System/Library/Fonts/SFNSDisplay.ttf',
        '/System/Library/Fonts/SFNS.ttf',
        # Linux (Railway/Docker)
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    # PIL default (klein aber funktioniert immer)
    return ImageFont.load_default()

def create_overlay(text, width, height, output_path, style='dark_luxury'):
    """Erstellt Text-Overlay PNG."""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── Berechne optimale Font-Größe ──────────────────────────────────────────
    font_size = int(width * 0.072)  # ~78px bei 1080px Breite
    font = get_font(font_size)
    font_small = get_font(int(font_size * 0.55))

    # ── Text umbrechen ────────────────────────────────────────────────────────
    lines = wrap_text(text.upper(), max_chars=14)

    # ── Vertikale Position: unteres Drittel (wie 982unlocked / Luxury Reels) ─
    line_height = int(font_size * 1.35)
    total_text_height = len(lines) * line_height
    y_start = int(height * 0.55) - total_text_height // 2

    cx = width // 2

    for i, line in enumerate(lines):
        y = y_start + i * line_height

        # Breiten-Abschätzung (PIL default gibt keine bbox bei load_default)
        try:
            bbox = draw.textbbox((0, 0), line, font=font)
            tw = bbox[2] - bbox[0]
        except Exception:
            tw = len(line) * font_size // 2

        x = cx - tw // 2

        # ── Schatten (mehrfach versetzt für Tiefe) ────────────────────────────
        for dx, dy, alpha in [(3, 3, 160), (5, 5, 100), (2, 2, 120)]:
            draw.text((x + dx, y + dy), line, font=font, fill=(0, 0, 0, alpha))

        # ── Haupttext: Weiß ──────────────────────────────────────────────────
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255))

    # ── Dünne goldene Unterlinie (luxury touch) ───────────────────────────────
    line_y = y_start + total_text_height + int(font_size * 0.4)
    line_w = int(width * 0.18)
    draw.rectangle(
        [cx - line_w // 2, line_y, cx + line_w // 2, line_y + 2],
        fill=(212, 175, 55, 200)  # Gold
    )

    img.save(output_path, 'PNG')
    print(f'[TextOverlay] Erstellt: {output_path} ({width}x{height}, {len(lines)} Zeilen)')

if __name__ == '__main__':
    if len(sys.argv) < 5:
        print('Usage: python3 create_text_overlay.py "Text" width height output.png')
        sys.exit(1)

    text   = sys.argv[1]
    width  = int(sys.argv[2])
    height = int(sys.argv[3])
    output = sys.argv[4]

    create_overlay(text, width, height, output)
