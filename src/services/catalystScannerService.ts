// Catalyst, FDA Pipeline, & Sentiment Intelligence Scanner
//
// Advanced multi-bucket intelligence engine for Biotech overreaction plays,
// corporate M&A/partnership catalysts, and AI momentum detection.
//
// Scans 60 days of news headlines and classifies events into three strategic buckets:
//   Bucket 1: Biotech & FDA Pipeline Intelligence (clinical trial failures + secondary pipeline strength)
//   Bucket 2: Corporate M&A, Deals & Partnerships (strategic value creation events)
//   Bucket 3: AI Momentum Tracker (AI pivot/integration announcements)
//
// Risk Score Impact Logic:
//   - Strategic deal or strong AI momentum → DECREASE risk (safer play)
//   - Biotech crash with robust secondary pipeline → MEDIUM-RISK with ASYMMETRIC UPSIDE badge
//   - Multiple positive catalysts → Compound risk reduction

// ─── Exported types ──────────────────────────────────────────────────────────

export type CatalystBucket = 'biotech' | 'corporate' | 'ai-momentum'

export type CatalystSignal =
  | 'biotech-bounce-setup'       // Major crash on single asset failure, but secondary pipeline active
  | 'strategic-catalyst'         // M&A, merger, partnership, licensing, major contract
  | 'ai-hype-momentum'           // AI pivot/integration announcement
  | 'biotech-pipeline-positive'  // Phase success, FDA approval on other assets
  | 'biotech-pipeline-negative'  // Trial failure, CRL, discontinuation

export interface CatalystEvent {
  bucket: CatalystBucket
  signal: CatalystSignal
  headline: string
  source: string
  url?: string
  datetime: number            // unix seconds
  daysAgo: number
  sentiment: 'positive' | 'negative' | 'neutral'
  detail: string              // Auto-generated explanation
}

export interface BiotechOverreactionSignal {
  detected: boolean
  crashKeywords: string[]
  pipelineStrengthKeywords: string[]
  reasoning: string
}

export interface CatalystIntelligence {
  buckets: {
    biotech: CatalystEvent[]
    corporate: CatalystEvent[]
    aiMomentum: CatalystEvent[]
  }
  biotechOverreactionSetup: BiotechOverreactionSignal | null
  riskScoreAdjustment: number  // -3 to +3, negative = reduces risk, positive = increases risk
  adjustmentReason: string
  scannedAt: number
  errors: string[]
}

// ─── Finnhub types ───────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const NEWS_LOOKBACK_DAYS = 60
const DAY_MS = 86_400_000

// ─── Keyword pattern libraries ────────────────────────────────────────────────

// Biotech & FDA Pipeline
const BIOTECH_NEGATIVE_KEYWORDS = [
  'phase 1 failure',
  'phase 2 failure',
  'phase 3 failure',
  'clinical trial failure',
  'failed to meet',
  'primary endpoint',
  'did not meet',
  'crl',
  'complete response letter',
  'fda rejection',
  'rejected by fda',
  'trial halted',
  'trial discontinued',
  'discontinued',
  'safety concerns',
  'adverse events',
  'futility analysis',
  'data safety monitoring board',
]

const BIOTECH_POSITIVE_KEYWORDS = [
  'phase 1',
  'phase 2',
  'phase 3',
  'fda approval',
  'approved by fda',
  'granted approval',
  'met primary endpoint',
  'primary endpoint met',
  'positive top-line',
  'positive data',
  'efficacy',
  'safety profile',
  'breakthrough therapy',
  'fast track',
  'orphan drug',
  'successful trial',
  'promising results',
  'clinical success',
  'nda accepted',
  'bla accepted',
]

// Corporate M&A, Deals & Partnerships
const CORPORATE_DEAL_KEYWORDS = [
  'acquisition',
  'acquires',
  'to acquire',
  'merger',
  'strategic partnership',
  'partnership',
  'joint venture',
  'licensing agreement',
  'license agreement',
  'collaboration',
  'strategic collaboration',
  'million contract',
  'billion contract',
  'multi-million',
  'multi-billion',
  'deal',
  'agreement',
  'supply agreement',
  'distribution agreement',
  'strategic alliance',
]

// AI Momentum
const AI_MOMENTUM_KEYWORDS = [
  'artificial intelligence',
  'ai integration',
  'ai strategy',
  'generative ai',
  'machine learning',
  'llm',
  'large language model',
  'ai platform',
  'ai-powered',
  'ai deployment',
  'ai announcement',
  'chatgpt',
  'openai',
  'anthropic',
  'nvidia partnership',
  'ai transformation',
  'ai product',
]

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

function normalizeText(s: string): string {
  return s.toLowerCase()
}

function containsAny(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text)
  return keywords.some((kw) => normalized.includes(kw))
}

function extractMatchedKeywords(text: string, keywords: string[]): string[] {
  const normalized = normalizeText(text)
  return keywords.filter((kw) => normalized.includes(kw))
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

// ─── Classification engine ───────────────────────────────────────────────────

function classifyArticle(
  article: FinnhubNewsArticle,
  now: number
): CatalystEvent | null {
  const fullText = `${article.headline} ${article.summary}`
  const daysAgo = Math.max(0, daysBetween(article.datetime * 1000, now))

  // Bucket 1: Biotech & FDA Pipeline
  if (containsAny(fullText, BIOTECH_NEGATIVE_KEYWORDS)) {
    return {
      bucket: 'biotech',
      signal: 'biotech-pipeline-negative',
      headline: article.headline,
      source: article.source,
      url: article.url,
      datetime: article.datetime,
      daysAgo,
      sentiment: 'negative',
      detail: `Clinical trial failure or FDA rejection detected: ${extractMatchedKeywords(fullText, BIOTECH_NEGATIVE_KEYWORDS).slice(0, 3).join(', ')}`,
    }
  }

  if (containsAny(fullText, BIOTECH_POSITIVE_KEYWORDS)) {
    return {
      bucket: 'biotech',
      signal: 'biotech-pipeline-positive',
      headline: article.headline,
      source: article.source,
      url: article.url,
      datetime: article.datetime,
      daysAgo,
      sentiment: 'positive',
      detail: `Positive pipeline progress detected: ${extractMatchedKeywords(fullText, BIOTECH_POSITIVE_KEYWORDS).slice(0, 3).join(', ')}`,
    }
  }

  // Bucket 2: Corporate M&A, Deals & Partnerships
  if (containsAny(fullText, CORPORATE_DEAL_KEYWORDS)) {
    return {
      bucket: 'corporate',
      signal: 'strategic-catalyst',
      headline: article.headline,
      source: article.source,
      url: article.url,
      datetime: article.datetime,
      daysAgo,
      sentiment: 'positive',
      detail: `Strategic corporate catalyst detected: ${extractMatchedKeywords(fullText, CORPORATE_DEAL_KEYWORDS).slice(0, 3).join(', ')}`,
    }
  }

  // Bucket 3: AI Momentum
  if (containsAny(fullText, AI_MOMENTUM_KEYWORDS)) {
    return {
      bucket: 'ai-momentum',
      signal: 'ai-hype-momentum',
      headline: article.headline,
      source: article.source,
      url: article.url,
      datetime: article.datetime,
      daysAgo,
      sentiment: 'positive',
      detail: `AI momentum/pivot detected: ${extractMatchedKeywords(fullText, AI_MOMENTUM_KEYWORDS).slice(0, 3).join(', ')}`,
    }
  }

  return null
}

// ─── Biotech Overreaction Detection Logic ────────────────────────────────────

function detectBiotechOverreactionSetup(
  biotechEvents: CatalystEvent[]
): BiotechOverreactionSignal {
  const negativeEvents = biotechEvents.filter((e) => e.sentiment === 'negative')
  const positiveEvents = biotechEvents.filter((e) => e.sentiment === 'positive')

  // Overreaction setup: at least one major negative event (trial failure / CRL)
  // AND at least one positive event (approval / success on secondary asset)
  const hasMajorCrash = negativeEvents.length > 0
  const hasSecondaryPipelineStrength = positiveEvents.length > 0

  if (hasMajorCrash && hasSecondaryPipelineStrength) {
    const crashKeywords = negativeEvents.flatMap((e) =>
      extractMatchedKeywords(
        `${e.headline} ${e.detail}`,
        BIOTECH_NEGATIVE_KEYWORDS
      )
    )
    const pipelineStrengthKeywords = positiveEvents.flatMap((e) =>
      extractMatchedKeywords(
        `${e.headline} ${e.detail}`,
        BIOTECH_POSITIVE_KEYWORDS
      )
    )

    return {
      detected: true,
      crashKeywords: [...new Set(crashKeywords)].slice(0, 5),
      pipelineStrengthKeywords: [...new Set(pipelineStrengthKeywords)].slice(0, 5),
      reasoning:
        `🔵 **Biotech Bounce Setup Detected:** Major crash on single asset failure (${negativeEvents.length} negative event${negativeEvents.length !== 1 ? 's' : ''}), ` +
        `but company retains active secondary pipeline / approved products (${positiveEvents.length} positive signal${positiveEvents.length !== 1 ? 's' : ''}). ` +
        `This presents a potential asymmetrical reward play — the market may have overreacted to a single data point while ignoring the broader pipeline.`,
    }
  }

  return {
    detected: false,
    crashKeywords: [],
    pipelineStrengthKeywords: [],
    reasoning: '',
  }
}

// ─── Risk Score Adjustment Logic ─────────────────────────────────────────────

function calculateRiskAdjustment(
  corporateEvents: CatalystEvent[],
  aiMomentumEvents: CatalystEvent[],
  biotechOverreaction: BiotechOverreactionSignal
): { adjustment: number; reason: string } {
  let adjustment = 0
  const reasons: string[] = []

  // Strategic deals / partnerships → decrease risk (make it greener/safer)
  if (corporateEvents.length > 0) {
    const reduction = Math.min(corporateEvents.length, 2) // Cap at -2 for multiple deals
    adjustment -= reduction
    reasons.push(
      `Strategic corporate catalyst${corporateEvents.length > 1 ? 's' : ''} detected (${corporateEvents.length}) → risk reduced by ${reduction}`
    )
  }

  // AI momentum → decrease risk (retail volume expected, positive sentiment)
  if (aiMomentumEvents.length > 0) {
    adjustment -= 1
    reasons.push(
      `AI momentum/pivot detected (${aiMomentumEvents.length} event${aiMomentumEvents.length > 1 ? 's' : ''}) → risk reduced by 1`
    )
  }

  // Biotech overreaction setup → neutral or slight decrease (asymmetric upside, but still speculative)
  if (biotechOverreaction.detected) {
    // Don't adjust score — instead flag as "medium-risk with asymmetric upside" in UI
    reasons.push(
      `Biotech overreaction setup detected → flagged as MEDIUM-RISK with ASYMMETRIC UPSIDE (no score adjustment)`
    )
  }

  // Clamp to [-3, +3]
  adjustment = Math.max(-3, Math.min(3, adjustment))

  return {
    adjustment,
    reason: reasons.length > 0 ? reasons.join(' · ') : 'No catalyst-based risk adjustments applied',
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function scanCatalystIntelligence(
  rawSymbol: string,
  signal: AbortSignal
): Promise<CatalystIntelligence> {
  const symbol = rawSymbol.trim().toUpperCase()
  const now = Date.now()
  const errors: string[] = []

  if (!symbol) {
    return emptyResult(now, 'Enter a symbol to scan for catalyst intelligence.')
  }

  const apiKey = getFinnhubApiKey()
  if (!apiKey) {
    return emptyResult(
      now,
      'Catalyst scanner offline — set VITE_FINNHUB_API_KEY to enable.',
      ['no-api-key']
    )
  }

  let news: FinnhubNewsArticle[] = []
  try {
    news = await fetchCompanyNews(symbol, apiKey, signal)
  } catch (err) {
    if (signal.aborted) throw err
    errors.push(`news fetch: ${(err as Error).message}`)
    return emptyResult(now, 'Catalyst scan failed — news fetch error.', errors)
  }

  // Classify all articles into buckets
  const events: CatalystEvent[] = []
  for (const article of news) {
    const classified = classifyArticle(article, now)
    if (classified) events.push(classified)
  }

  // Group by bucket
  const buckets = {
    biotech: events.filter((e) => e.bucket === 'biotech'),
    corporate: events.filter((e) => e.bucket === 'corporate'),
    aiMomentum: events.filter((e) => e.bucket === 'ai-momentum'),
  }

  // Detect biotech overreaction setup
  const biotechOverreactionSetup = detectBiotechOverreactionSetup(buckets.biotech)

  // Calculate risk adjustment
  const { adjustment, reason } = calculateRiskAdjustment(
    buckets.corporate,
    buckets.aiMomentum,
    biotechOverreactionSetup
  )

  return {
    buckets,
    biotechOverreactionSetup,
    riskScoreAdjustment: adjustment,
    adjustmentReason: reason,
    scannedAt: now,
    errors,
  }
}

function emptyResult(
  scannedAt: number,
  reason: string,
  errors: string[] = []
): CatalystIntelligence {
  return {
    buckets: {
      biotech: [],
      corporate: [],
      aiMomentum: [],
    },
    biotechOverreactionSetup: null,
    riskScoreAdjustment: 0,
    adjustmentReason: reason,
    scannedAt,
    errors,
  }
}
