import { useState } from 'react'
import { BarChart3, ShieldCheck, BookOpen, Calculator } from 'lucide-react'
import { TickerGrid } from './TickerGrid'
import { RiskManagerTab } from './RiskManagerTab'
import { JournalReportsTab } from './JournalReportsTab'
import { PercentCalculator } from './PercentCalculator'
import { BackupControls } from './BackupControls'
import { ProviderStatusBadge } from './ProviderStatusBadge'
import { ProviderDebugPanel } from './ProviderDebugPanel'
import { useDashboard } from '../context/DashboardContext'
import { formatUSD } from '../utils/format'

type ActiveTab = 'dashboard' | 'risk-manager' | 'journal' | 'calculator'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const { dailyProfit, goal } = useDashboard()
  const goalReached = dailyProfit >= goal.min

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-zinc-100 truncate">
                  Calculate My Win
                </h1>
                <p className="text-[10px] sm:text-xs text-zinc-500 truncate">
                  Day trading dashboard · client-side
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <ProviderStatusBadge />
              <div className="hidden md:flex items-center gap-3 text-xs text-zinc-500">
                <span>Today:</span>
                <span
                  className={`font-mono tabular-nums font-semibold ${
                    goalReached
                      ? 'text-emerald-300'
                      : dailyProfit < 0
                      ? 'text-red-400'
                      : 'text-zinc-300'
                  }`}
                >
                  {formatUSD(dailyProfit)}
                </span>
              </div>
              <BackupControls />
            </div>
          </div>

          {/* Mobile daily profit banner */}
          <div className="md:hidden mt-3 flex items-center justify-between px-3 py-2 rounded-md bg-zinc-800/40 border border-zinc-800">
            <span className="text-xs text-zinc-500">Today's P/L:</span>
            <span
              className={`text-sm font-mono tabular-nums font-semibold ${
                goalReached
                  ? 'text-emerald-300'
                  : dailyProfit < 0
                  ? 'text-red-400'
                  : 'text-zinc-300'
              }`}
            >
              {formatUSD(dailyProfit)}
            </span>
          </div>

          {/* Tab Switcher */}
          <div className="mt-3 sm:mt-4 flex items-center gap-1 border-b border-zinc-800/0 -mb-4 overflow-x-auto no-scrollbar">
            <TabButton
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Live Dashboard"
            />
            <TabButton
              active={activeTab === 'risk-manager'}
              onClick={() => setActiveTab('risk-manager')}
              icon={<ShieldCheck className="w-4 h-4" />}
              label="Daily Goal & Risk Manager"
              badge={goalReached ? '🎯' : undefined}
            />
            <TabButton
              active={activeTab === 'journal'}
              onClick={() => setActiveTab('journal')}
              icon={<BookOpen className="w-4 h-4" />}
              label="Journal & Reports"
            />
            <TabButton
              active={activeTab === 'calculator'}
              onClick={() => setActiveTab('calculator')}
              icon={<Calculator className="w-4 h-4" />}
              label="Calculator"
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {activeTab === 'dashboard' && <TickerGrid />}
        {activeTab === 'risk-manager' && <RiskManagerTab />}
        {activeTab === 'journal' && <JournalReportsTab />}
        {activeTab === 'calculator' && <PercentCalculator />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <p className="text-center text-[10px] sm:text-xs text-zinc-500 leading-relaxed">
            Not financial advice. Optional{' '}
            <code className="px-1 sm:px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px] sm:text-xs">
              VITE_MASSIVE_API_KEY
            </code>{' '}
            or{' '}
            <code className="px-1 sm:px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px] sm:text-xs">
              VITE_FINNHUB_API_KEY
            </code>{' '}
            for enhanced data; Yahoo Finance and demo fallback used otherwise.
          </p>
        </div>
      </footer>

      {/* Provider Debug Panel */}
      <ProviderDebugPanel />
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: string
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
        active
          ? 'border-emerald-400 text-emerald-300'
          : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(' ')[0]}</span>
      {badge && (
        <span className="ml-1 text-xs bg-emerald-400 text-zinc-950 rounded-full px-1.5 py-0.5 font-bold">
          {badge}
        </span>
      )}
    </button>
  )
}
