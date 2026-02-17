import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marginal Efficiency Radar",
  description: "Marketing FP&A tool to identify diminishing returns in ad spend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
          <header
            className="sticky top-0 z-10"
            style={{
              background: "linear-gradient(135deg, var(--header-from), var(--header-to))",
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <h1 className="text-xl font-bold text-white tracking-tight">
                📡 Marginal Efficiency Radar
              </h1>
              <nav className="flex gap-1">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/import">Import Data</NavLink>
              </nav>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-4 py-1.5 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/15 transition-all duration-200"
    >
      {children}
    </a>
  );
}
