import { useState, useEffect } from 'react'
import type { StockSimulation } from '../types'

const STORAGE_KEY = 'calculatemywin_simulations'
const MAX_SIMULATIONS = 50

export function useSimulations() {
  const [simulations, setSimulations] = useState<StockSimulation[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setSimulations(parsed)
        }
      }
    } catch (err) {
      console.warn('Failed to load simulations from localStorage:', err)
    }
  }, [])

  const persist = (newList: StockSimulation[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
    } catch (err) {
      console.warn('Failed to persist simulations:', err)
    }
  }

  const addSimulation = (
    entry: Omit<StockSimulation, 'id' | 'timestamp'>
  ): StockSimulation => {
    const newEntry: StockSimulation = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }

    const updated = [newEntry, ...simulations].slice(0, MAX_SIMULATIONS)
    setSimulations(updated)
    persist(updated)

    return newEntry
  }

  const removeSimulation = (id: string) => {
    const updated = simulations.filter((s) => s.id !== id)
    setSimulations(updated)
    persist(updated)
  }

  const clearAll = () => {
    setSimulations([])
    persist([])
  }

  return {
    simulations,
    addSimulation,
    removeSimulation,
    clearAll,
  }
}
