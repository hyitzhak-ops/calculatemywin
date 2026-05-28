import type { InputHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  prefix?: string
}

export function Field({ label, prefix, ...inputProps }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">
            {prefix}
          </span>
        )}
        <input
          {...inputProps}
          className={`
            w-full rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm
            text-zinc-100 font-mono tabular-nums
            placeholder:text-zinc-600
            focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50
            ${prefix ? 'pl-7' : ''}
          `}
        />
      </div>
    </div>
  )
}
