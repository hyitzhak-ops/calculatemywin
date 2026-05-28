export function parsePositiveNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const num = parseFloat(trimmed)
  if (!Number.isFinite(num) || num <= 0) return null

  return num
}

export function calcPercentGain(buy: number, sell: number): number | null {
  if (!Number.isFinite(buy) || !Number.isFinite(sell) || buy <= 0) {
    return null
  }

  return ((sell - buy) / buy) * 100
}

export interface PositionResult {
  investment: number
  profitUSD: number
  profitPercent: number
}

export function calcPosition(
  shares: number,
  buy: number,
  sell: number
): PositionResult | null {
  if (
    !Number.isFinite(shares) ||
    !Number.isFinite(buy) ||
    !Number.isFinite(sell) ||
    shares <= 0 ||
    buy <= 0
  ) {
    return null
  }

  const investment = shares * buy
  const profitUSD = shares * (sell - buy)
  const profitPercent = ((sell - buy) / buy) * 100

  return { investment, profitUSD, profitPercent }
}
