/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone-Output für Docker/Railway/Render (nur wenn DOCKER_BUILD=true)
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
}
module.exports = nextConfig
