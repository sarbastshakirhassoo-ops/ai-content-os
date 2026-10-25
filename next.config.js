/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 hängt sonst bei jedem `next dev` einen eigenen Block an CLAUDE.md an.
  // Die Datei ist bewusst kuratiert und soll sich nicht selbst verändern.
  agentRules: false,

  // Das Dev-Overlay unten links überdeckt die Sidebar-Statusanzeige.
  devIndicators: false,
}
module.exports = nextConfig
