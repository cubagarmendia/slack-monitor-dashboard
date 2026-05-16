import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "🐙 Slack Monitor",
  description: "Slack Client Monitor Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-900 text-slate-100 min-h-screen pb-20 md:pb-0">
        <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              🐙 <span>Slack Monitor</span>
            </h1>
          </div>
        </header>

        {/* Desktop sidebar */}
        <div className="max-w-5xl mx-auto md:flex md:gap-6 md:px-6 md:py-6">
          <aside className="hidden md:block w-48 shrink-0">
            <nav className="space-y-1 sticky top-20">
              <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                📊 Dashboard
              </a>
              <a href="/dismissed" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                ✅ Dismissed
              </a>
              <a href="/config" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                ⚙️ Config
              </a>
            </nav>
          </aside>

          <main className="flex-1 min-w-0 px-4 py-4 md:px-0 md:py-0">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />
      </body>
    </html>
  );
}
