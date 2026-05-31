// Corporate Risk Scanner v2 — 1-Year DNA Profiling + Earnings Health Analysis
//
// Vectors scanned (Finnhub free-tier endpoints):
//   A) Share dilution / toxic financing  — /company-news (365d), clustered into distinct events
//      Serial diluter detection: ≥3 distinct financing/split events in 1yr → +3 pts
//   B) Reverse split — /stock/split (−365d / +7d) + news headline fallback
//   C) Earnings health — /calendar/earnings (−30d / +120d)
//      Imminent ≤3d → +3 pts | Upcoming 4-30d → +1 pt | Recent miss → +1 pt
//
// Scoring (base 1, hard cap 10):
//   Most recent dilution ≤14d:          +4
//   Most recent dilution 15-365d:        +2
//   Serial diluter bonus (≥3 events):    +3
//   Reverse split upcoming ≤7d:          +5
//   Reverse split recent ≤30d:           +5
//   Earnings imminent ≤3d:               +3
//   Earnings upcoming 4-30d:             +1
//   Earnings recent miss ≤30d:           +1
//
// NOTE: Finnhub free-tier may limit /company-news to ~100 articles per request
// regardless of the date range. Expanding the window still returns what's
// available — paid tiers benefit from the full year automatically.

// ─── Exported types ──────────────────────────────────────────────────────────

export type RiskSeverity = 'low' | 'medium' | 'high' | 'toxic'

export type RiskFlagKind =
  | 'dilution'
  | 'serial-diluter'
  | 'reverse-split-recent'
  | 'reverse-split-upcoming'
  | 'earnings-imminent'
  | 'earnings-upcoming'
  | 'earnings-recent'

export interface RiskFlag {
  kind: RiskFlagKind
  title: string
  detail: string
  scoreDelta: number
  daysAgo?: number
  daysUntil?: number
  url?: string
}

export type DnaEventKind =
  | 'offering'
  | 'atm'
  | 'convertible'
  | 'private-placement'
  | 'reverse-split'

export interface CorporateTimelineEvent {
  date: string       // YYYY-MM-DD
  kind: DnaEventKind
  label: string      // e.g. "ATM Offering", "1-for-20 Reverse Split"
  detail: string     // truncated headline or descriptor
  url?: string
  daysAgo: number
}

export type EarningsHealth = 'strong' | 'caution' | 'neutral'

export interface EarningsHealthData {
  health: EarningsHealth
  reason: string
  // Upcoming earnings
  nextDate?: string
  nextDaysUntil?: number
  nextSession?: string    // 'bmo' | 'amc' | ''
  // Last reported earnings
  lastDate?: string
  lastDaysAgo?: number
  epsSurprise?: 'beat' | 'miss' | 'inline'
  epsActual?: number
  epsEstimate?: number
  revenueActual?: number
  revenueEstimate?: number
}

export interface RiskScanResult {
  symbol: string
  score: number          // 1..10
  severity: RiskSeverity
  flags: RiskFlag[]
  summary: string
  scannedAt: number
  partial: boolean
  errors: string[]
  // v2 additions
  corporateDna: CorporateTimelineEvent[]  // all events in past 1yr, newest-first
  serialDiluter: boolean
  dilutionCount: number                   // distinct financing + split events in 1yr
  earningsHealth: EarningsHealthData | null
}

// ─── Internal Finnhub shapes ─────────────────────────────────────────────────

interface FinnhubNewsArticle {
  category: string
  datetime: number    // unix seconds
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
  date: string        // YYYY-MM-DD
  fromFactor: number
  toFactor: number
}

interface FinnhubEarningsRow {
  date: string        // YYYY-MM-DD
  epsActual: number | null
  epsEstimate: number | null
  hour: string
  quarter: number
  revenueActual: number | null
  revenueEstimate: number | null
  symbol: string
  year: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000
const NEWS_LOOKBACK_DAYS = 365
const SPLIT_LOOKBACK_DAYS = 365
const SPLIT_LOOKAHEAD_DAYS = 7
const EARNINGS_RECENT_DAYS = 30
const EARNINGS_UPCOMING_DAYS = 30
const EARNINGS_IMMINENT_DAYS = 3
const DILUTION_CLUSTER_WINDOW_DAYS = 14
const SERIAL_DILUTER_THRESHOLD = 3   // ≥3 distinct events = serial diluter

// ─── Regex patterns ──────────────────────────────────────────────────────────

const DILUTION_PATTERN =
  /\b(?:share\s+offering|public\s+offering|secondary\s+offering|registered\s+direct|private\s+placement|prospectus|s-?3|f-?3|atm\s+(?:offering|facility|program)|at[-\s]the[-\s]market|convertible\s+(?:note|debenture|bond)|warrant\s+(?:exercise|inducement)|dilution|equity\s+raise|capital\s+raise|pipe\s+financing|rights\s+offering)\b/i

const ATM_PATTERN =
  /\batm\b|\bat[-\s]the[-\s]market/i

const CONVERTIBLE_PATTERN =
  /\bconvertible\s+(?:note|debenture|bond)\b/i

const PRIVATE_PLACEMENT_PATTERN =
  /\b(?:private\s+placement|pipe\s+financing)\b/i

const REVERSE_SPLIT_PATTERN =
  /\b(?:reverse\s+(?:stock\s+)?split|share\s+consolidation|1[-\s]for[-\s]\d{1,3}|reverse\s+split\s+ratio)\b/i

const NASDAQ_COMPLIANCE_PATTERN =
  /\b(?:minimum\s+bid\s+price|listing\s+compliance|deficiency\s+notice|nasdaq\s+listing\s+rule)\b/i

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const m = headline.match(/1[-\s]for[-\s](\d{1,3})/i)
  if (m) return `1-for-${m[1]}`
  const r = headline.match(/\b(\d{1,3})[-:]for[-:](\d{1,3})\b/i)
  if (r) return `${r[1]}-for-${r[2]}`
  return null
}

function truncate(s: string, max = 90): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

/** Classify a dilution-matching article into a specific DNA event kind. */
function detectDnaEventType(article: FinnhubNewsArticle): {
  kind: DnaEventKind
  label: string
} {
  const text = article.headline + ' ' + article.summary
  if (ATM_PATTERN.test(text)) return { kind: 'atm', label: 'ATM Offering' }
  if (CONVERTIBLE_PATTERN.test(text)) return { kind: 'convertible', label: 'Convertible Note' }
  if (PRIVATE_PLACEMENT_PATTERN.test(text)) return { kind: 'private-placement', label: 'Private Placement' }
  return { kind: 'offering', label: 'Public Offering' }
}

/**
 * Groups articles into clusters where consecutive articles (sorted ascending
 * by date) are within `windowMs` of each other. Returns one cluster per
 * distinct event — multiple articles covering the same offering end up in
 * the same bucket.
 */
function clusterArticles(
  articles: FinnhubNewsArticle[],
  windowMs: number
): FinnhubNewsArticle[][] {
  if (articles.length === 0) return []
  const sorted = [...articles].sort((a, b) => a.datetime - b.datetime)
  const clusters: FinnhubNewsArticle[][] = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    const prev = clusters[clusters.length - 1]
    const lastTs = prev[prev.length - 1].datetime * 1000
    const currTs = sorted[i].datetime * 1000
    if (currTs - lastTs <= windowMs) {
      prev.push(sorted[i])
    } else {
      clusters.push([sorted[i]])
    }
  }
  return clusters
}

// ─── Network calls ───────────────────────────────────────────────────────────

async function fetchCompanyNews(
  symbol: string,
  apiKey: string,
  signal: AbortSignal
): Promise<FinnhubNewsArticle[]> {
  const now = new Date()
  const from = new Date(now.getTime() - NEWS_LOOKBACK_DAYS * DAY_MS)
  const url =
    `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}` +
    `&from=${ymd(from)}&to=${ymd(now)}&token=${apiKey}`
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`news HTTP ${response.status}`)
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
  const from = new Date(now.getTime() - SPLIT_LOOKBACK_DAYS * DAY_MS)
  const to = new Date(now.getTime() + SPLIT_LOOKAHEAD_DAYS * DAY_MS)
  const url =
    `https://finnhub.io/api/v1/stock/split?symbol=${encodeURIComponent(symbol)}` +
    `&from=${ymd(from)}&to=${ymd(to)}&token=${apiKey}`
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
  const to = new Date(now.getTime() + 120 * DAY_MS)
  const url =
    `https://finnhub.io/api/v1/calendar/earnings?from=${ymd(from)}` +
    `&to=${ymd(to)}&symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`earnings HTTP ${response.status}`)
  const data = (await response.json()) as { earningsCalendar?: FinnhubEarningsRow[] }
  return data?.earningsCalendar ?? []
}

// ─── DNA builder ─────────────────────────────────────────────────────────────

/**
 * Builds the 1-year Corporate DNA Profile — an ordered list of distinct
 * corporate actions (offerings, ATM, convertible notes, reverse splits),
 * newest first. Only PAST events are included; upcoming ones are covered
 * by the flags section.
 */
function buildCorporateDna(
  dilutionArticles: FinnhubNewsArticle[],
  allNews: FinnhubNewsArticle[],
  splits: FinnhubSplit[],
  now: number
): CorporateTimelineEvent[] {
  const events: CorporateTimelineEvent[] = []

  // 1. Dilution events from clustered news
  const clusters = clusterArticles(
    dilutionArticles,
    DILUTION_CLUSTER_WINDOW_DAYS * DAY_MS
  )
  for (const cluster of clusters) {
    // Use the latest article in the cluster as the canonical representative
    const anchor = cluster[cluster.length - 1]
    const ts = anchor.datetime * 1000
    if (ts >= now) continue // skip future-dated articles
    const daysAgo = Math.max(0, daysBetween(ts, now))
    const { kind, label } = detectDnaEventType(anchor)
    events.push({
      date: new Date(ts).toISOString().slice(0, 10),
      kind,
      label,
      detail: truncate(anchor.headline),
      url: anchor.url,
      daysAgo,
    })
  }

  // 2. Reverse splits from the splits API (past events only)
  const pastReverseSplits = splits.filter((s) => {
    const splitTs = new Date(s.date + 'T00:00:00Z').getTime()
    return s.toFactor < s.fromFactor && splitTs < now
  })
  for (const split of pastReverseSplits) {
    const ts = new Date(split.date + 'T00:00:00Z').getTime()
    const daysAgo = Math.max(0, daysBetween(ts, now))
    const ratio = `1-for-${Math.round(split.fromFactor / split.toFactor)}`
    events.push({
      date: split.date,
      kind: 'reverse-split',
      label: `${ratio} Reverse Split`,
      detail: `Share consolidation ${ratio}, executed ${split.date}.`,
      daysAgo,
    })
  }

  // 3. Reverse splits from news headlines that aren't already covered by the splits API
  const splitNewsHits = allNews.filter((n) => REVERSE_SPLIT_PATTERN.test(n.headline))
  for (const article of splitNewsHits) {
    const ts = article.datetime * 1000
    if (ts >= now) continue
    // Skip if the splits API already has an entry within 30 days
    const alreadyCovered = pastReverseSplits.some(
      (s) => Math.abs(new Date(s.date + 'T00:00:00Z').getTime() - ts) <= 30 * DAY_MS
    )
    if (alreadyCovered) continue
    const daysAgo = Math.max(0, daysBetween(ts, now))
    const ratio = parseSplitRatio(article.headline) ?? 'ratio undisclosed'
    events.push({
      date: new Date(ts).toISOString().slice(0, 10),
      kind: 'reverse-split',
      label: `Reverse Split ${ratio}`,
      detail: truncate(article.headline),
      url: article.url,
      daysAgo,
    })
  }

  // Sort newest first and deduplicate exact same date+kind
  const seen = new Set<string>()
  return events
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
    .filter((e) => {
      const key = `${e.date}:${e.kind}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

// ─── Vector A: Dilution / toxic financing ────────────────────────────────────

function evaluateDilution(
  dilutionArticles: FinnhubNewsArticle[],
  now: number
): RiskFlag | null {
  if (dilutionArticles.length === 0) return null

  const sorted = [...dilutionArticles].sort((a, b) => b.datetime - a.datetime)
  const top = sorted[0]
  const announcedAt = top.datetime * 1000
  const daysAgo = Math.max(0, daysBetween(announcedAt, now))

  if (daysAgo > NEWS_LOOKBACK_DAYS) return null

  const isInstitutional = PRIVATE_PLACEMENT_PATTERN.test(top.headline + ' ' + top.summary) ||
    CONVERTIBLE_PATTERN.test(top.headline + ' ' + top.summary)

  const flavor = isInstitutional
    ? 'Institutional deal (likely PIPE / convertible / hedge-fund debt conversion)'
    : 'Public offering / ATM facility'

  const scoreDelta = daysAgo <= 14 ? 4 : 2

  return {
    kind: 'dilution',
    title: daysAgo <= 14 ? 'Active Dilution / Toxic Financing' : 'Recent Dilution Filing',
    detail: `${flavor} · "${truncate(top.headline, 80)}" (${top.source}, ${daysAgo}d ago).`,
    scoreDelta,
    daysAgo,
    url: top.url,
  }
}

function buildSerialDiluterFlag(
  dilutionCount: number
): RiskFlag | null {
  if (dilutionCount < SERIAL_DILUTER_THRESHOLD) return null
  return {
    kind: 'serial-diluter',
    title: 'Serial Diluter — High-Risk Corporate Profile',
    detail: `${dilutionCount} distinct financing/split events detected in the past 12 months. Management has a documented history of diluting shareholders repeatedly.`,
    scoreDelta: 3,
  }
}

// ─── Vector B: Reverse split risk ────────────────────────────────────────────

function evaluateReverseSplit(
  splits: FinnhubSplit[],
  news: FinnhubNewsArticle[],
  now: number
): RiskFlag | null {
  const reverseSplits = splits
    .filter((s) => s.toFactor < s.fromFactor)
    .sort((a, b) => (a.date > b.date ? -1 : 1)) // newest first

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
    if (daysAgo <= 30) {
      return {
        kind: 'reverse-split-recent',
        title: 'Recent Reverse Split',
        detail: `${ratio} reverse split executed ${split.date} (${daysAgo}d ago). Extreme volatility window — listing-compliance plays usually unwind.`,
        scoreDelta: 5,
        daysAgo,
      }
    }
    // Historical (31-365d) — reflected in DNA profile + dilution count only
  }

  // Headline fallback for upcoming splits not yet in splits API
  const newsHit = news
    .filter((n) => REVERSE_SPLIT_PATTERN.test(n.headline))
    .sort((a, b) => b.datetime - a.datetime)[0]

  if (newsHit) {
    const announcedAt = newsHit.datetime * 1000
    const daysAgo = Math.max(0, daysBetween(announcedAt, now))
    if (daysAgo <= 30) {
      const ratio = parseSplitRatio(newsHit.headline) ?? 'ratio undisclosed'
      const compliance = NASDAQ_COMPLIANCE_PATTERN.test(newsHit.headline + ' ' + newsHit.summary)
        ? ' Triggered by NASDAQ listing-compliance pressure.'
        : ''
      return {
        kind: 'reverse-split-upcoming',
        title: 'Reverse Split Announced',
        detail: `Announced ${daysAgo}d ago: ${ratio}.${compliance} "${truncate(newsHit.headline, 80)}"`,
        scoreDelta: 5,
        daysAgo,
        url: newsHit.url,
      }
    }
  }

  return null
}

// ─── Vector C: Earnings ──────────────────────────────────────────────────────

interface EarningsVectorResult {
  flags: RiskFlag[]
  health: EarningsHealthData | null
}

function evaluateEarnings(
  rows: FinnhubEarningsRow[],
  hasDilutionHistory: boolean,
  now: number
): EarningsVectorResult {
  if (rows.length === 0) return { flags: [], health: null }

  const todayMidnight = new Date(now)
  todayMidnight.setHours(0, 0, 0, 0)
  const todayTs = todayMidnight.getTime()

  const upcomingItems = rows
    .map((r) => ({ row: r, ts: new Date(r.date + 'T00:00:00').getTime() }))
    .filter((x) => x.ts >= todayTs)
    .sort((a, b) => a.ts - b.ts)

  const upcoming = upcomingItems[0]

  const past = rows
    .map((r) => ({ row: r, ts: new Date(r.date + 'T00:00:00').getTime() }))
    .filter((x) => x.ts < todayTs && todayTs - x.ts <= EARNINGS_RECENT_DAYS * DAY_MS)
    .sort((a, b) => b.ts - a.ts)[0]

  const flags: RiskFlag[] = []

  // Upcoming earnings flags
  if (upcoming) {
    const daysUntil = Math.max(0, daysBetween(todayTs, upcoming.ts))
    const session =
      upcoming.row.hour === 'bmo'
        ? 'before market open'
        : upcoming.row.hour === 'amc'
        ? 'after market close'
        : 'TBD'

    if (daysUntil <= EARNINGS_IMMINENT_DAYS) {
      flags.push({
        kind: 'earnings-imminent',
        title: 'Imminent Earnings',
        detail: `Reports ${upcoming.row.date} (${session}, in ${daysUntil}d). Holding through earnings carries binary gap risk.`,
        scoreDelta: 3,
        daysUntil,
      })
    } else if (daysUntil <= EARNINGS_UPCOMING_DAYS) {
      flags.push({
        kind: 'earnings-upcoming',
        title: 'Earnings in 30-Day Window',
        detail: `Next report scheduled ${upcoming.row.date} (${session}, in ${daysUntil}d). Binary event risk — consider position sizing accordingly.`,
        scoreDelta: 1,
        daysUntil,
      })
    }
  }

  // Recent earnings flag
  if (past) {
    const daysAgo = daysBetween(past.ts, todayTs)
    const { epsActual, epsEstimate } = past.row
    let surprise = 'EPS data not reported'
    let scoreDelta = 0

    if (
      epsActual != null && epsEstimate != null &&
      Number.isFinite(epsActual) && Number.isFinite(epsEstimate)
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

    flags.push({
      kind: 'earnings-recent',
      title: 'Recent Earnings',
      detail: `Reported ${daysAgo}d ago (${past.row.date}). ${surprise}.`,
      scoreDelta,
      daysAgo,
    })

    // Build health data
    const health = buildEarningsHealth(
      upcoming,
      past,
      hasDilutionHistory,
      todayTs
    )
    return { flags, health }
  }

  // No recent earnings but possibly upcoming
  if (upcoming) {
    const daysUntil = Math.max(0, daysBetween(todayTs, upcoming.ts))
    const hasImpending = daysUntil <= EARNINGS_UPCOMING_DAYS
    const health: EarningsHealthData = {
      health: hasImpending ? 'caution' : 'neutral',
      reason: hasImpending ? `Earnings report in ${daysUntil}d` : 'No recent earnings data',
      nextDate: upcoming.row.date,
      nextDaysUntil: daysUntil,
      nextSession: upcoming.row.hour,
    }
    return { flags, health }
  }

  return { flags, health: null }
}

function buildEarningsHealth(
  upcoming: { row: FinnhubEarningsRow; ts: number } | undefined,
  past: { row: FinnhubEarningsRow; ts: number },
  hasDilutionHistory: boolean,
  todayTs: number
): EarningsHealthData {
  const daysAgo = daysBetween(past.ts, todayTs)
  const { epsActual, epsEstimate, revenueActual, revenueEstimate } = past.row

  let epsSurprise: 'beat' | 'miss' | 'inline' | undefined
  if (epsActual != null && epsEstimate != null && Number.isFinite(epsActual) && Number.isFinite(epsEstimate)) {
    const d = epsActual - epsEstimate
    epsSurprise = d > 0 ? 'beat' : d < 0 ? 'miss' : 'inline'
  }

  const nextDaysUntil = upcoming
    ? Math.max(0, daysBetween(todayTs, upcoming.ts))
    : undefined
  const hasImpending = nextDaysUntil != null && nextDaysUntil <= EARNINGS_UPCOMING_DAYS

  let health: EarningsHealth = 'neutral'
  let reason = 'No significant earnings signal'

  if (epsSurprise === 'beat' && !hasDilutionHistory && !hasImpending) {
    health = 'strong'
    reason = 'Beat earnings with clean 1-year capital structure'
  } else if (epsSurprise === 'miss') {
    health = 'caution'
    reason = hasImpending
      ? `Earnings miss ${daysAgo}d ago + next report in ${nextDaysUntil}d`
      : `Earnings miss ${daysAgo}d ago — negative momentum risk`
  } else if (hasImpending) {
    health = 'caution'
    reason = hasDilutionHistory
      ? `Next report in ${nextDaysUntil}d + dilution history amplifies binary risk`
      : `Next report in ${nextDaysUntil}d — binary event window active`
  } else if (epsSurprise === 'beat' && hasDilutionHistory) {
    reason = 'Beat earnings, but dilution history limits conviction'
  }

  return {
    health,
    reason,
    nextDate: upcoming?.row.date,
    nextDaysUntil,
    nextSession: upcoming?.row.hour,
    lastDate: past.row.date,
    lastDaysAgo: daysAgo,
    epsSurprise,
    epsActual: epsActual ?? undefined,
    epsEstimate: epsEstimate ?? undefined,
    revenueActual: revenueActual ?? undefined,
    revenueEstimate: revenueEstimate ?? undefined,
  }
}

// ─── Summary builder ─────────────────────────────────────────────────────────

function buildSummary(
  symbol: string,
  flags: RiskFlag[],
  severity: RiskSeverity,
  serialDiluter: boolean,
  partial: boolean
): string {
  const activeFlags = flags.filter(
    (f) => f.kind !== 'earnings-recent' || f.scoreDelta > 0
  )

  if (activeFlags.length === 0 && !serialDiluter) {
    return partial
      ? `${symbol}: scan partial — no risk signals found in the data we could read.`
      : `${symbol}: clean 1-year profile. No active dilution, no reverse split, and no imminent earnings inside the 3-day window.`
  }

  const headline = activeFlags
    .slice(0, 2)
    .map((f) => f.title)
    .join(' + ')

  if (severity === 'toxic') {
    return `⚠️ TOXIC CAPITAL STRUCTURE — ${symbol} flagged for ${headline}. Heavy sell pressure expected. This is a dangerous vehicle for swing exposure.`
  }
  if (serialDiluter) {
    return `${symbol} is a serial diluter: management has repeatedly accessed capital markets in the past year. Structural dilution risk is elevated.`
  }
  if (severity === 'high') {
    return `${symbol} carries elevated catalyst risk: ${headline}. Tighten stops or sit it out.`
  }
  return `${symbol} has ${activeFlags.length} active flag${activeFlags.length === 1 ? '' : 's'}: ${headline}. Manageable, but plan around it.`
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function scanCorporateRisk(
  rawSymbol: string,
  signal: AbortSignal
): Promise<RiskScanResult> {
  const symbol = rawSymbol.trim().toUpperCase()
  const now = Date.now()
  const errors: string[] = []

  if (!symbol) {
    return emptyResult(symbol, 'Enter a symbol to run the risk scan.', now)
  }

  const apiKey = getFinnhubApiKey()
  if (!apiKey) {
    return {
      ...emptyResult(
        symbol,
        'Risk scanner offline — set VITE_FINNHUB_API_KEY to enable corporate-action and earnings checks.',
        now
      ),
      partial: true,
      errors: ['no-api-key'],
    }
  }

  const [newsResult, splitsResult, earningsResult] = await Promise.allSettled([
    fetchCompanyNews(symbol, apiKey, signal),
    fetchSplits(symbol, apiKey, signal),
    fetchEarningsCalendar(symbol, apiKey, signal),
  ])

  const news: FinnhubNewsArticle[] =
    newsResult.status === 'fulfilled'
      ? newsResult.value
      : (errors.push(`news: ${(newsResult.reason as Error).message}`), [])

  const splits: FinnhubSplit[] =
    splitsResult.status === 'fulfilled'
      ? splitsResult.value
      : (errors.push(`splits: ${(splitsResult.reason as Error).message}`), [])

  const earnings: FinnhubEarningsRow[] =
    earningsResult.status === 'fulfilled'
      ? earningsResult.value
      : (errors.push(`earnings: ${(earningsResult.reason as Error).message}`), [])

  // Filter dilution-related articles
  const dilutionArticles = news.filter(
    (n) => DILUTION_PATTERN.test(n.headline) || DILUTION_PATTERN.test(n.summary)
  )

  // Build 1-year corporate DNA profile
  const corporateDna = buildCorporateDna(dilutionArticles, news, splits, now)

  // Count distinct financing + split events for serial diluter detection
  const dilutionCount = corporateDna.length
  const serialDiluter = dilutionCount >= SERIAL_DILUTER_THRESHOLD
  const hasDilutionHistory = dilutionCount > 0

  // Evaluate vectors
  const flags: RiskFlag[] = []

  const dilutionFlag = evaluateDilution(dilutionArticles, now)
  if (dilutionFlag) flags.push(dilutionFlag)

  const serialFlag = buildSerialDiluterFlag(dilutionCount)
  if (serialFlag) flags.push(serialFlag)

  const splitFlag = evaluateReverseSplit(splits, news, now)
  if (splitFlag) flags.push(splitFlag)

  const earningsResult2 = evaluateEarnings(earnings, hasDilutionHistory, now)
  flags.push(...earningsResult2.flags)

  const score = Math.min(10, 1 + flags.reduce((sum, f) => sum + f.scoreDelta, 0))
  const severity: RiskSeverity =
    score >= 7 ? 'toxic' : score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low'

  const summary = buildSummary(symbol, flags, severity, serialDiluter, errors.length > 0)

  return {
    symbol,
    score,
    severity,
    flags,
    summary,
    scannedAt: now,
    partial: errors.length > 0,
    errors,
    corporateDna,
    serialDiluter,
    dilutionCount,
    earningsHealth: earningsResult2.health,
  }
}

function emptyResult(
  symbol: string,
  summary: string,
  scannedAt: number
): RiskScanResult {
  return {
    symbol,
    score: 1,
    severity: 'low',
    flags: [],
    summary,
    scannedAt,
    partial: false,
    errors: [],
    corporateDna: [],
    serialDiluter: false,
    dilutionCount: 0,
    earningsHealth: null,
  }
}
