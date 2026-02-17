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
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <div className="min-h-screen">
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Marginal Efficiency Radar
              </h1>
              <nav className="flex gap-6">
                <a href="/" className="text-gray-600 hover:text-blue-600 font-medium">
                  Dashboard
                </a>
                <a href="/import" className="text-gray-600 hover:text-blue-600 font-medium">
                  Import Data
                </a>
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
