import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import StatusBar from '@/components/layout/StatusBar'

export const metadata: Metadata = {
  title: 'Universal Brain',
  description: 'Privates AI Intelligence System — LLM, Internet-Recherche und Memory',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="bg-background text-slate-200">
        <Sidebar />
        <StatusBar />
        <main className="md:ml-56 pt-10 min-h-screen">
          <div className="p-6">{children}</div>
        </main>
      </body>
    </html>
  )
}
