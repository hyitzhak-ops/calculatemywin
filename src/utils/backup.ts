import { toLocalDateStr } from './format'

export const STORAGE_KEYS = {
  activeTrades: 'calculatemywin_active_trades',
  completedTrades: 'calculatemywin_completed_trades',
  dailyGoal: 'calculatemywin_daily_goal',
  dailyJournalNotes: 'calculatemywin_journal_notes',
  simulations: 'calculatemywin_simulations',
} as const

export type BackupKey = keyof typeof STORAGE_KEYS

export const BACKUP_VERSION = 1
export const BACKUP_REFRESH_EVENT = 'calculatemywin:backup-restored'

export interface BackupPayload {
  version: number
  exportedAt: string
  app: string
  data: Record<BackupKey, unknown>
}

function readKey(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function buildBackupPayload(): BackupPayload {
  const data = {} as Record<BackupKey, unknown>
  for (const [field, lsKey] of Object.entries(STORAGE_KEYS) as [
    BackupKey,
    string
  ][]) {
    data[field] = readKey(lsKey)
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'calculate-my-win',
    data,
  }
}

export function exportBackupToFile(): void {
  const payload = buildBackupPayload()
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trading_dashboard_backup_${toLocalDateStr(new Date())}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

interface ValidationResult {
  ok: boolean
  reason?: string
  payload?: BackupPayload
}

export function validateBackup(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, reason: 'Not a JSON object.' }
  }
  const candidate = raw as Partial<BackupPayload> & {
    data?: Partial<Record<BackupKey, unknown>>
  }
  const data =
    candidate.data && typeof candidate.data === 'object'
      ? candidate.data
      : (raw as Partial<Record<BackupKey, unknown>>)

  const hasTrades =
    Array.isArray(data.activeTrades) || Array.isArray(data.completedTrades)
  const hasNotes =
    data.dailyJournalNotes !== undefined && data.dailyJournalNotes !== null

  if (!hasTrades && !hasNotes) {
    return {
      ok: false,
      reason:
        'Missing required keys (expected activeTrades, completedTrades, or dailyJournalNotes).',
    }
  }

  return {
    ok: true,
    payload: {
      version:
        typeof candidate.version === 'number'
          ? candidate.version
          : BACKUP_VERSION,
      exportedAt:
        typeof candidate.exportedAt === 'string'
          ? candidate.exportedAt
          : new Date().toISOString(),
      app: typeof candidate.app === 'string' ? candidate.app : 'unknown',
      data: data as Record<BackupKey, unknown>,
    },
  }
}

export interface ApplyResult {
  written: BackupKey[]
  skipped: BackupKey[]
}

function isPlainArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isValidGoal(v: unknown): boolean {
  if (!isPlainObject(v)) return false
  const g = v as { min?: unknown; max?: unknown }
  return typeof g.min === 'number' && typeof g.max === 'number'
}

const SHAPE_VALIDATORS: Record<BackupKey, (v: unknown) => boolean> = {
  activeTrades: isPlainArray,
  completedTrades: isPlainArray,
  dailyGoal: isValidGoal,
  dailyJournalNotes: (v) => isPlainObject(v) || isPlainArray(v),
  simulations: isPlainArray,
}

export function applyBackup(payload: BackupPayload): ApplyResult {
  const written: BackupKey[] = []
  const skipped: BackupKey[] = []

  for (const [field, lsKey] of Object.entries(STORAGE_KEYS) as [
    BackupKey,
    string
  ][]) {
    const value = payload.data[field]
    if (value === undefined || value === null) {
      skipped.push(field)
      continue
    }
    const ok = SHAPE_VALIDATORS[field](value)
    if (!ok) {
      skipped.push(field)
      continue
    }
    try {
      localStorage.setItem(lsKey, JSON.stringify(value))
      written.push(field)
    } catch (err) {
      console.warn(`Failed to write ${lsKey}:`, err)
      skipped.push(field)
    }
  }

  if (written.length > 0) {
    window.dispatchEvent(
      new CustomEvent(BACKUP_REFRESH_EVENT, { detail: { written } })
    )
  }

  return { written, skipped }
}

export async function readBackupFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'))
    reader.onload = () => {
      try {
        const text =
          typeof reader.result === 'string'
            ? reader.result
            : new TextDecoder().decode(reader.result as ArrayBuffer)
        resolve(JSON.parse(text))
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsText(file)
  })
}
