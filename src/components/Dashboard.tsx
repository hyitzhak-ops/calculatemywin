import { useState } from 'react'
import { BarChart3, ShieldCheck, BookOpen } from 'lucide-react'
import { TickerGrid } from './TickerGrid'
import { PercentCalculator } from './PercentCalculator'
import { PositionCalculator } from './PositionCalculator'
import { SimulationLog } from './SimulationLog'
import { RiskManagerTab } from './RiskManagerTab'
import { JournalReportsTab } from './JournalReportsTab'
import { BackupControls } from './BackupControls'
import { useDashboard } from '../context/DashboardContext'
import { formatUSD } from '../utils/format'

type ActiveTab = 'dashboard' | 'risk-manager' | 'journal'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const { dailyProfit, goal } = useDashboard()
  const goalReached = dailyProfit >= goal.min

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-100">
                  Calculate My Win
                </h1>
                <p className="text-xs text-zinc-500">
                  Day trading dashboard · client-side
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500">
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

          {/* Tab Switcher */}
          <div className="mt-4 flex items-center gap-1 border-b border-zinc-800/0 -mb-4">
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
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            <TickerGrid />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PercentCalculator />
              <PositionCalculator />
            </div>

            <SimulationLog />
          </>
        )}
        {activeTab === 'risk-manager' && <RiskManagerTab />}
        {activeTab === 'journal' && <JournalReportsTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-center text-xs text-zinc-500">
            Not financial advice. Optional{' '}
            <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
              VITE_FINNHUB_API_KEY
            </code>{' '}
            improves live data; Yahoo Finance and demo fallback used otherwise.
          </p>
        </div>
      </footer>
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
      className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
        active
          ? 'border-emerald-400 text-emerald-300'
          : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className="ml-1 text-xs bg-emerald-400 text-zinc-950 rounded-full px-1.5 py-0.5 font-bold">
          {badge}
        </span>
      )}
    </button>
  )
}
