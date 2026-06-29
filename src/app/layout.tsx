import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import StatusBar from '@/components/layout/StatusBar'

export const metadata: Metadata = {
  title: 'AI Content OS',
  description: 'Autonomous short-form video creation pipeline powered by 12 AI agents',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-200">
        <Sidebar />
        <StatusBar />
        <main className="ml-56 pt-10 min-h-screen">
          <div className="p-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
