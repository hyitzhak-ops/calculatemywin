import { useEffect, useState } from 'react'
import { DashboardProvider } from './context/DashboardContext'
import { Dashboard } from './components/Dashboard'
import { BACKUP_REFRESH_EVENT } from './utils/backup'

export default function App() {
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const onRestore = () => setReloadKey((k) => k + 1)
    window.addEventListener(BACKUP_REFRESH_EVENT, onRestore)
    return () => window.removeEventListener(BACKUP_REFRESH_EVENT, onRestore)
  }, [])

  return (
    <DashboardProvider key={reloadKey}>
      <Dashboard />
    </DashboardProvider>
  )
}
