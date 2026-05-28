const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

export function formatUSD(n: number): string {
  return usdFormatter.format(n)
}

export function formatPrice(n: number): string {
  if (n < 1) {
    return priceFormatter.format(n)
  }
  return usdFormatter.format(n)
}

export function formatPercent(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function profitColorClass(n: number): string {
  if (n > 0) return 'text-green-400'
  if (n < 0) return 'text-red-400'
  return 'text-zinc-400'
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60_000) {
    return 'just now'
  } else if (diff < 3600_000) {
    const minutes = Math.floor(diff / 60_000)
    return `${minutes}m ago`
  } else if (diff < 86400_000) {
    const hours = Math.floor(diff / 3600_000)
    return `${hours}h ago`
  } else {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }
}
