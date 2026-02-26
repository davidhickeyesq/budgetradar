'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const STEPS = [
  { key: 'import', label: 'Import Data', number: '1', href: '/import' },
  { key: 'review', label: 'Review Channels', number: '2', href: '/' },
  { key: 'plan', label: 'Generate Plan', number: '3', href: '/plan' },
  { key: 'export', label: 'Export & Act', number: '4', href: '/plan' },
]

function resolveCurrentStep(pathname: string): number {
  if (pathname === '/import') return 0
  if (pathname === '/') return 1
  if (pathname === '/plan') return 2
  return 1
}

export function StepIndicator() {
  const pathname = usePathname()
  const currentStep = resolveCurrentStep(pathname)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-1 py-2 overflow-x-auto text-xs">
        {STEPS.map((step, i) => {
          const isActive = i === currentStep
          const isPast = i < currentStep
          return (
            <div key={step.key} className="flex items-center gap-1 shrink-0">
              {i > 0 && (
                <span className={`mx-1 ${isPast ? 'text-indigo-300' : 'text-white/30'}`}>→</span>
              )}
              <Link
                href={step.href}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-all hover:bg-white/15 ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : isPast
                      ? 'text-indigo-200'
                      : 'text-white/40'
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  isActive
                    ? 'bg-white text-indigo-700'
                    : isPast
                      ? 'bg-indigo-300/40 text-indigo-200'
                      : 'bg-white/15 text-white/40'
                }`}>
                  {isPast ? '✓' : step.number}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
