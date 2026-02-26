import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { StepIndicator } from "@/components/StepIndicator";

export const metadata: Metadata = {
  title: "BudgetRadar",
  description: "Find where your ad budget hits diminishing returns and reallocate to what works",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
          <header
            className="sticky top-0 z-10"
            style={{
              background: "linear-gradient(135deg, var(--header-from), var(--header-to))",
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <h1 className="text-xl font-bold text-white tracking-tight">
                📡 BudgetRadar
              </h1>
              <NavBar />
            </div>
          </header>
          <div
            className="border-b border-white/10"
            style={{
              background: "linear-gradient(135deg, var(--header-from), var(--header-to))",
            }}
          >
            <StepIndicator />
          </div>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
