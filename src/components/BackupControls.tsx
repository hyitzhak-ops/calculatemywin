import { useRef, useState } from 'react'
import { Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  applyBackup,
  exportBackupToFile,
  readBackupFile,
  validateBackup,
} from '../utils/backup'

type Status =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

interface BackupControlsProps {
  variant?: 'header' | 'panel'
}

export function BackupControls({ variant = 'header' }: BackupControlsProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const flash = (s: Status) => {
    setStatus(s)
    if (s.kind !== 'idle') {
      window.setTimeout(() => setStatus({ kind: 'idle' }), 4500)
    }
  }

  const handleExport = () => {
    try {
      exportBackupToFile()
      flash({ kind: 'success', message: 'Backup downloaded.' })
    } catch (err) {
      flash({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Export failed.',
      })
    }
  }

  const handleImportClick = () => {
    fileRef.current?.click()
  }

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const raw = await readBackupFile(file)
      const validation = validateBackup(raw)
      if (!validation.ok || !validation.payload) {
        window.alert('Invalid backup file format.')
        flash({
          kind: 'error',
          message: validation.reason ?? 'Invalid backup file format.',
        })
        return
      }

      const proceed = window.confirm(
        'Restoring will overwrite all current trades, journal notes, and settings on this device. Continue?'
      )
      if (!proceed) return

      const result = applyBackup(validation.payload)
      const writtenLabel = result.written.length
        ? result.written.join(', ')
        : 'no fields'
      flash({
        kind: 'success',
        message: `Restored ${result.written.length} section${
          result.written.length === 1 ? '' : 's'
        } (${writtenLabel}).`,
      })
    } catch (err) {
      window.alert('Invalid backup file format.')
      flash({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Import failed.',
      })
    }
  }

  const isPanel = variant === 'panel'

  const btnBase =
    'inline-flex items-center gap-1.5 text-xs font-medium rounded-md border transition px-3 py-1.5'
  const btnNeutral =
    'border-zinc-700 bg-slate-800 hover:bg-slate-700 text-zinc-200'
  const btnPrimary =
    'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'

  return (
    <div
      className={`flex items-center gap-2 ${
        isPanel ? 'flex-wrap' : 'flex-shrink-0'
      }`}
    >
      <button
        onClick={handleExport}
        title="Download a JSON backup of every trade, note, and setting"
        className={`${btnBase} ${btnPrimary}`}
      >
        <Download className="w-3.5 h-3.5" />
        Export Backup
      </button>
      <button
        onClick={handleImportClick}
        title="Restore from a previously downloaded JSON backup"
        className={`${btnBase} ${btnNeutral}`}
      >
        <Upload className="w-3.5 h-3.5" />
        Import Backup
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChosen}
      />
      {status.kind !== 'idle' && (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded border ${
            status.kind === 'success'
              ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
              : 'text-red-300 border-red-500/40 bg-red-500/10'
          }`}
        >
          {status.kind === 'success' ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <AlertTriangle className="w-3 h-3" />
          )}
          {status.message}
        </span>
      )}
    </div>
  )
}
