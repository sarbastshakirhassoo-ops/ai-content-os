/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone-Output für Docker/Railway/Render
  // Entferne diese Zeile wenn du nur lokal entwickelst
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,

  // API-Routen mit langen Video-Jobs
  serverExternalPackages: ['fluent-ffmpeg'],
}
module.exports = nextConfig
