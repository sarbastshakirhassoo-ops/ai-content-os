# ─────────────────────────────────────────────────────────────────────────────
# AI Content OS — Dockerfile (Railway / Render / Docker)
# Node 20 + FFmpeg 8+ für lokale Video-Produktion
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-slim AS base

# FFmpeg installieren (für Video Engine)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fontconfig \
    fonts-liberation \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Prisma Client generieren
RUN npx prisma generate || true

# Next.js Build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

WORKDIR /app

# System-User für Sicherheit
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid  1001 nextjs

# Next.js Output kopieren
COPY --from=builder /app/public          ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

# Prisma Schema + Client kopieren
COPY --from=builder /app/prisma          ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Data-Verzeichnis erstellen (wird als Volume gemountet)
RUN mkdir -p /app/data /app/tmp && chown -R nextjs:nodejs /app/data /app/tmp

# Public-Verzeichnis für generierte Videos
RUN mkdir -p /app/public/videos && chown nextjs:nodejs /app/public/videos

USER nextjs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
