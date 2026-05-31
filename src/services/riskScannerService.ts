// Corporate Risk Scanner — surfaces toxic-financing, reverse-split, and
// imminent-earnings hazards before a position is opened. Purely advisory.
//
// Vectors scanned (Finnhub free-tier endpoints):
//   A) Share dilution / toxic financing  — /company-news (last 60d)
//   B) Reverse split / share consolidation — /stock/split (-30d / +7d) + news
//   C) Earnings proximity & post-earnings sentiment — /calendar/earnings
//
// The service is fault-tolerant: each vector failure degrades gracefully so a
// missing API key or a blocked CORS request never blocks the form.

export type RiskSeverity = 'low' | 'medium' | 'high' | 'toxic'

export type RiskFlagKind =
  | 'dilution'
  | 'reverse-split-recent'
  | 'reverse-split-upcoming'
  | 'earnings-imminent'
  | 'earnings-recent'

export interface RiskFlag {
  kind: RiskFlagKind
  title: string
  detail: string
  scoreDelta: number
  daysAgo?: number       // for already-occurred events (positive)
  daysUntil?: number     // for scheduled events (positive)
  url?: string           // source link when available
}

export interface RiskScanResult {
  symbol: string
  score: number          // 1..10
  severity: RiskSeverity
  flags: RiskFlag[]
  summary: string
  scannedAt: number
  partial: boolean       // true when one or more vectors failed
  errors: string[]
}

interface FinnhubNewsArticle {
  category: string
  datetime: number       // unix seconds
  headline: string
  id: number
  image: string
  related: string
  source: string
  summary: string
  url: string
}

interface FinnhubSplit {
  symbol: string
  date: string           // YYYY-MM-DD
  fromFactor: number
  toFactor: number
}

interface FinnhubEarningsRow {
  date: string           // YYYY-MM-DD
  epsActual: number | null
  epsEstimate: number | null
  hour: string
  quarter: number
  revenueActual: number | null
  revenueEstimate: number | null
  symbol: string
  year: number
}

const DAY_MS = 86_400_000
const NEWS_LOOKBACK_DAYS = 60
const REVERSE_SPLIT_LOOKBACK_DAYS = 30
const REVERSE_SPLIT_LOOKAHEAD_DAYS = 7
const EARNINGS_IMMINENT_DAYS = 3
const EARNINGS_RECENT_DAYS = 14

// --- Keyword regexes -------------------------------------------------------

const DILUTION_PATTERN =
  /\b(?:share\s+offering|public\s+offering|secondary\s+offering|registered\s+direct|private\s+placement|prospectus|s-?3|f-?3|atm\s+(?:offering|facility|program)|at[-\s]the[-\s]market|convertible\s+note|convertible\s+debenture|warrant\s+(?:exercise|inducement)|dilution|equity\s+raise|capital\s+raise|pipe\s+financing)\b/i

const INSTITUTIONAL_PATTERN =
  /\b(?:hedge\s+fund|institutional\s+investor|private\s+placement|pipe\s+financing|convertible\s+(?:note|debenture)|warrant\s+inducement)\b/i

const REVERSE_SPLIT_PATTERN =
  /\b(?:reverse\s+(?:stock\s+)?split|share\s+consolidation|1[-\s]for[-\s]\d{1,3}|reverse\s+split\s+ratio)\b/i

const NASDAQ_COMPLIANCE_PATTERN =
  /\b(?:minimum\s+bid\s+price|listing\s+compliance|deficiency\s+notice|nasdaq\s+listing\s+rule)\b/i

// --- Tiny helpers ----------------------------------------------------------

function getFinnhubApiKey(): string {
  let raw = import.meta.env.VITE_FINNHUB_API_KEY?.trim() || ''
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1)
  }
  return raw
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function daysBetween(a: number, b: number): number {
  return Math.round((b - a) / DAY_MS)
}

function parseSplitRatio(headline: string): string | null {
  const match = headline.match(/1[-\s]for[-\s](\d{1,3})/i)
  if (match) return `1-for-${match[1]}`
  const ratio = headline.match(/\b(\d{1,3})[-:]for[-:](\d{1,3})\b/i)
  if (ratio) return `${ratio[1]}-for-${ratio[2]}`
  return null
}

// --- Network calls ---------------------------------------------------------

async function fetchCompanyNews(
  symbol: string,
  apiKey: string,
  signal: AbortSignal
): Promise<FinnhubNewsArticle[]> {
  const now = new Date()
  const from = new Date(now.getTime() - NEWS_LOOKBACK_DAYS * DAY_MS)
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
    symbol
  )}&from=${ymd(from)}&to=${ymd(now)}&token=${apiKey}`

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`news HTTP ${response.status}`)
  }
  const data = (await response.json()) as FinnhubNewsArticle[]
  if (!Array.isArray(data)) throw new Error('news payload not an array')
  return data
}

async function fetchSplits(
  symbol: string,
  apiKey: string,
  signal: AbortSignal
): Promise<FinnhubSplit[]> {
  const now = new Date()
  const from = new Date(now.getTime() - REVERSE_SPLIT_LOOKBACK_DAYS * DAY_MS)
  const to = new Date(now.getTime() + REVERSE_SPLIT_LOOKAHEAD_DAYS * DAY_MS)
  const url = `https://finnhub.io/api/v1/stock/split?symbol=${encodeURIComponent(
    symbol
  )}&from=${ymd(from)}&to=${ymd(to)}&token=${apiKey}`

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`splits HTTP ${response.status}`)
  const data = (await response.json()) as FinnhubSplit[]
  if (!Array.isArray(data)) throw new Error('splits payload not an array')
  return data
}

async function fetchEarningsCalendar(
  symbol: string,
  apiKey: string,
  signal: AbortSignal
): Promise<FinnhubEarningsRow[]> {
  const now = new Date()
  const from = new Date(now.getTime() - EARNINGS_RECENT_DAYS * DAY_MS)
  // Look ~120 days forward to catch the next reporting date even when a
  // company has just reported (next quarter is ~90d out).
  const to = new Date(now.getTime() + 120 * DAY_MS)
  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${ymd(
    from
  )}&to=${ymd(to)}&symbol=${encodeURIComponent(symbol)}&token=${apiKey}`

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`earnings HTTP ${response.status}`)
  const data = (await response.json()) as { earningsCalendar?: FinnhubEarningsRow[] }
  return data?.earningsCalendar ?? []
}

// --- Vector A: Dilution / toxic financing ---------------------------------

function evaluateDilution(news: FinnhubNewsArticle[], now: number): RiskFlag | null {
  const matches = news
    .filter((n) => DILUTION_PATTERN.test(n.headline) || DILUTION_PATTERN.test(n.summary))
    .sort((a, b) => b.datetime - a.datetime)

  if (matches.length === 0) return null

  const top = matches[0]
  const announcedAt = top.datetime * 1000
  const daysAgo = Math.max(0, daysBetween(announcedAt, now))

  // The recency premium: anything announced within the last 14 days is treated
  // as "active" — sell pressure typically lingers for at least one trading
  // cycle after a registered offering hits the tape.
  if (daysAgo > NEWS_LOOKBACK_DAYS) return null

  const isInstitutional =
    INSTITUTIONAL_PATTERN.test(top.headline) ||
    INSTITUTIONAL_PATTERN.test(top.summary)

  const flavor = isInstitutional
    ? 'Institutional deal (likely PIPE / convertible / hedge-fund debt conversion)'
    : 'Public offering / ATM facility'

  // Score weighting: aggressive within 14d, half-weight beyond that.
  const scoreDelta = daysAgo <= 14 ? 4 : 2

  return {
    kind: 'dilution',
    title:
      daysAgo <= 14
        ? 'Active Dilution / Toxic Financing'
        : 'Recent Dilution Filing',
    detail: `${flavor} · "${top.headline}" (${top.source}, ${daysAgo}d ago).`,
    scoreDelta,
    daysAgo,
    url: top.url,
  }
}

// --- Vector B: Reverse split risk -----------------------------------------

function evaluateReverseSplit(
  splits: FinnhubSplit[],
  news: FinnhubNewsArticle[],
  now: number
): RiskFlag | null {
  // Only reverse splits matter here (toFactor < fromFactor → ratio < 1).
  const reverseSplits = splits.filter((s) => s.toFactor < s.fromFactor)

  if (reverseSplits.length > 0) {
    const split = reverseSplits[0]
    const splitTs = new Date(split.date + 'T00:00:00Z').getTime()
    const ratio = `1-for-${Math.round(split.fromFactor / split.toFactor)}`

    if (splitTs >= now) {
      const daysUntil = Math.max(0, daysBetween(now, splitTs))
      return {
        kind: 'reverse-split-upcoming',
        title: 'Imminent Reverse Split',
        detail: `Scheduled ${ratio} reverse split on ${split.date} (in ${daysUntil}d). Historically followed by sharp post-split selling.`,
        scoreDelta: 5,
        daysUntil,
      }
    }

    const daysAgo = daysBetween(splitTs, now)
    if (daysAgo <= REVERSE_SPLIT_LOOKBACK_DAYS) {
      return {
        kind: 'reverse-split-recent',
        title: 'Recent Reverse Split',
        detail: `${ratio} reverse split executed ${split.date} (${daysAgo}d ago). Extreme volatility window — listing-compliance plays usually unwind.`,
        scoreDelta: 5,
        daysAgo,
      }
    }
  }

  // Headline-derived signal — covers cases the splits endpoint hasn't
  // populated yet (very common for sub-$1 NASDAQ tickets).
  const newsHit = news
    .filter((n) => REVERSE_SPLIT_PATTERN.test(n.headline))
    .sort((a, b) => b.datetime - a.datetime)[0]

  if (newsHit) {
    const announcedAt = newsHit.datetime * 1000
    const daysAgo = Math.max(0, daysBetween(announcedAt, now))
    if (daysAgo <= REVERSE_SPLIT_LOOKBACK_DAYS) {
      const ratio = parseSplitRatio(newsHit.headline) ?? 'ratio undisclosed'
      const compliance = NASDAQ_COMPLIANCE_PATTERN.test(newsHit.headline + ' ' + newsHit.summary)
        ? ' Triggered by NASDAQ listing-compliance pressure.'
        : ''
      return {
        kind: 'reverse-split-upcoming',
        title: 'Reverse Split Announced',
        detail: `Announced ${daysAgo}d ago: ${ratio}.${compliance} "${newsHit.headline}"`,
        scoreDelta: 5,
        daysAgo,
        url: newsHit.url,
      }
    }
  }

  return null
}

// --- Vector C: Earnings ----------------------------------------------------

function evaluateEarnings(rows: FinnhubEarningsRow[], now: number): RiskFlag | null {
  if (rows.length === 0) return null

  const todayMidnight = new Date(now)
  todayMidnight.setHours(0, 0, 0, 0)
  const todayTs = todayMidnight.getTime()

  // Soonest upcoming
  const upcoming = rows
    .map((r) => ({ row: r, ts: new Date(r.date + 'T00:00:00').getTime() }))
    .filter((x) => x.ts >= todayTs)
    .sort((a, b) => a.ts - b.ts)[0]

  if (upcoming) {
    const daysUntil = Math.max(0, daysBetween(todayTs, upcoming.ts))
    if (daysUntil <= EARNINGS_IMMINENT_DAYS) {
      const hour = upcoming.row.hour
      const session =
        hour === 'bmo'
          ? 'before market open'
          : hour === 'amc'
          ? 'after market close'
          : 'TBD'
      return {
        kind: 'earnings-imminent',
        title: 'Imminent Earnings',
        detail: `Reports ${upcoming.row.date} (${session}, in ${daysUntil}d). Holding through earnings carries binary gap risk.`,
        scoreDelta: 3,
        daysUntil,
      }
    }
  }

  // Recently reported — informational, not aggressive
  const past = rows
    .map((r) => ({ row: r, ts: new Date(r.date + 'T00:00:00').getTime() }))
    .filter((x) => x.ts < todayTs && todayTs - x.ts <= EARNINGS_RECENT_DAYS * DAY_MS)
    .sort((a, b) => b.ts - a.ts)[0]

  if (past) {
    const daysAgo = daysBetween(past.ts, todayTs)
    const { epsActual, epsEstimate } = past.row
    let surprise = 'EPS data not reported'
    let scoreDelta = 0
    if (
      epsActual != null &&
      epsEstimate != null &&
      Number.isFinite(epsActual) &&
      Number.isFinite(epsEstimate)
    ) {
      const delta = epsActual - epsEstimate
      if (delta > 0) {
        surprise = `Beat: EPS ${epsActual.toFixed(2)} vs est ${epsEstimate.toFixed(2)}`
      } else if (delta < 0) {
        surprise = `Miss: EPS ${epsActual.toFixed(2)} vs est ${epsEstimate.toFixed(2)}`
        scoreDelta = 1
      } else {
        surprise = `In-line: EPS ${epsActual.toFixed(2)}`
      }
    }

    return {
      kind: 'earnings-recent',
      title: 'Recent Earnings',
      detail: `Reported ${daysAgo}d ago (${past.row.date}). ${surprise}.`,
      scoreDelta,
      daysAgo,
    }
  }

  return null
}

// --- Public API ------------------------------------------------------------

export async function scanCorporateRisk(
  rawSymbol: string,
  signal: AbortSignal
): Promise<RiskScanResult> {
  const symbol = rawSymbol.trim().toUpperCase()
  const now = Date.now()
  const errors: string[] = []

  if (!symbol) {
    return {
      symbol,
      score: 1,
      severity: 'low',
      flags: [],
      summary: 'Enter a symbol to run the risk scan.',
      scannedAt: now,
      partial: false,
      errors: [],
    }
  }

  const apiKey = getFinnhubApiKey()
  if (!apiKey) {
    return {
      symbol,
      score: 1,
      severity: 'low',
      flags: [],
      summary:
        'Risk scanner offline — set VITE_FINNHUB_API_KEY to enable corporate-action and earnings checks.',
      scannedAt: now,
      partial: true,
      errors: ['no-api-key'],
    }
  }

  const [newsResult, splitsResult, earningsResult] = await Promise.allSettled([
    fetchCompanyNews(symbol, apiKey, signal),
    fetchSplits(symbol, apiKey, signal),
    fetchEarningsCalendar(symbol, apiKey, signal),
  ])

  const news =
    newsResult.status === 'fulfilled'
      ? newsResult.value
      : (errors.push(`news: ${(newsResult.reason as Error).message}`), [])
  const splits =
    splitsResult.status === 'fulfilled'
      ? splitsResult.value
      : (errors.push(`splits: ${(splitsResult.reason as Error).message}`), [])
  const earnings =
    earningsResult.status === 'fulfilled'
      ? earningsResult.value
      : (errors.push(`earnings: ${(earningsResult.reason as Error).message}`), [])

  const flags: RiskFlag[] = []
  const dilution = evaluateDilution(news, now)
  if (dilution) flags.push(dilution)
  const reverseSplit = evaluateReverseSplit(splits, news, now)
  if (reverseSplit) flags.push(reverseSplit)
  const earningsFlag = evaluateEarnings(earnings, now)
  if (earningsFlag) flags.push(earningsFlag)

  const score = Math.min(10, 1 + flags.reduce((sum, f) => sum + f.scoreDelta, 0))
  const severity: RiskSeverity =
    score >= 7 ? 'toxic' : score >= 4 ? 'high' : score >= 3 ? 'medium' : 'low'

  const summary = buildSummary(symbol, flags, severity, errors.length > 0)

  return {
    symbol,
    score,
    severity,
    flags,
    summary,
    scannedAt: now,
    partial: errors.length > 0,
    errors,
  }
}

function buildSummary(
  symbol: string,
  flags: RiskFlag[],
  severity: RiskSeverity,
  partial: boolean
): string {
  if (flags.length === 0) {
    return partial
      ? `${symbol}: scan partial — no risk signals found in the data we could read.`
      : `${symbol}: clean. No active dilution, no recent or imminent reverse split, and no earnings inside the next 3 trading days.`
  }

  const headline = flags
    .filter((f) => f.kind !== 'earnings-recent' || f.scoreDelta > 0)
    .slice(0, 2)
    .map((f) => f.title)
    .join(' + ')

  if (severity === 'toxic') {
    return `⚠️ TOXIC CAPITAL STRUCTURE — ${symbol} flagged for ${headline}. Heavy sell pressure expected. This is a dangerous vehicle for swing exposure.`
  }
  if (severity === 'high') {
    return `${symbol} carries elevated catalyst risk: ${headline}. Tighten stops or sit it out.`
  }
  return `${symbol} has ${flags.length} active flag${flags.length === 1 ? '' : 's'}: ${headline}. Manageable, but plan around it.`
}
