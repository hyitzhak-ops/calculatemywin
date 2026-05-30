import { useEffect, useState } from 'react'
import type { DailyJournalNote } from '../types'

const JOURNAL_KEY = 'calculatemywin_journal_notes'

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function persist<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`Failed to persist ${key}:`, err)
  }
}

export function useJournal() {
  const [notes, setNotes] = useState<Record<string, DailyJournalNote>>({})

  useEffect(() => {
    const raw = loadJSON<Record<string, DailyJournalNote> | DailyJournalNote[]>(
      JOURNAL_KEY,
      {}
    )
    if (Array.isArray(raw)) {
      const map: Record<string, DailyJournalNote> = {}
      for (const n of raw) {
        if (n && n.dateStr) map[n.dateStr] = n
      }
      setNotes(map)
    } else if (raw && typeof raw === 'object') {
      setNotes(raw)
    }
  }, [])

  const setNote = (dateStr: string, note: string) => {
    setNotes((prev) => {
      const next = { ...prev }
      const trimmed = note.trim()
      if (trimmed.length === 0) {
        delete next[dateStr]
      } else {
        next[dateStr] = {
          dateStr,
          note: trimmed,
          updatedAt: Date.now(),
        }
      }
      persist(JOURNAL_KEY, next)
      return next
    })
  }

  const removeNote = (dateStr: string) => {
    setNotes((prev) => {
      if (!(dateStr in prev)) return prev
      const next = { ...prev }
      delete next[dateStr]
      persist(JOURNAL_KEY, next)
      return next
    })
  }

  return {
    journalNotes: notes,
    setJournalNote: setNote,
    removeJournalNote: removeNote,
  }
}

export type UseJournalReturn = ReturnType<typeof useJournal>
