import { DashboardProvider } from './context/DashboardContext'
import { Dashboard } from './components/Dashboard'

export default function App() {
  return (
    <DashboardProvider>
      <Dashboard />
    </DashboardProvider>
  )
}
