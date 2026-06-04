/**
 * Massive.com (Polygon.io) Provider
 *
 * High-accuracy pre-market and intraday data via Massive.com's REST API.
 * API docs: https://polygon.io/docs/stocks/getting-started
 * Dashboard: https://massive.com/dashboard/keys
 */

import type {
  Provider,
  ProviderCapabilities,
  QuoteResponse,
  ChartResponse,
  PreMarketResponse,
} from './types'
import type { StockQuote, ChartPoint } from '../../types'

const MASSIVE_BASE_URL = 'https://api.polygon.io'
const FETCH_TIMEOUT_MS = 5000

async function fetchWithTimeout(
  url: string,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    })
  } finally {
    clearTimeout(timer)
  }
}

export class MassiveProvider implements Provider {
  name: 'massive' = 'massive'
  private apiKey: string

  capabilities: ProviderCapabilities = {
    supportsRealTimeQuotes: true,
    supportsPreMarket: true,
    supportsIntradayChart: true,
    supportsDailyChart: true,
    maxRequestsPerMinute: 100, // Adjust based on your Massive.com tier
  }

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetchQuote(symbol: string): Promise<QuoteResponse | null> {
    try {
      // Try Last Trade endpoint first (requires paid tier)
      const url = `${MASSIVE_BASE_URL}/v2/last/trade/${encodeURIComponent(
        symbol
      )}?apiKey=${this.apiKey}`

      const response = await fetchWithTimeout(url)

      // If not authorized, fall back to using previous day's close as quote
      if (response.status === 403 || response.status === 401) {
        console.info('[Massive] Real-time quotes not available on current plan, using daily data')
        return this.fetchQuoteFromDaily(symbol)
      }

      if (!response.ok) {
        console.warn(`[Massive] Quote HTTP ${response.status}`)
        return null
      }

      const data = await response.json()

      if (data.status === 'NOT_AUTHORIZED') {
        console.info('[Massive] Real-time quotes require plan upgrade, using daily data')
        return this.fetchQuoteFromDaily(symbol)
      }

      if (data.status !== 'OK' || !data.results) {
        console.warn('[Massive] Invalid quote response:', data)
        return null
      }

      const trade = data.results
      const price = trade.p // Last trade price

      // Fetch previous close to calculate change
      const prevCloseData = await this.fetchPreviousClose(symbol)
      const previousClose = prevCloseData?.close ?? price
      const change = price - previousClose
      const changePercent = previousClose ? (change / previousClose) * 100 : 0

      // Fetch daily open/high/low from aggregates endpoint
      const dailyData = await this.fetchDailyAggregates(symbol)

      const quote: StockQuote = {
        symbol,
        price,
        change,
        changePercent,
        high: dailyData?.high ?? price,
        low: dailyData?.low ?? price,
        open: dailyData?.open ?? price,
        previousClose,
        isMock: false,
      }

      // Calculate gap if we have open and previous close
      if (dailyData?.open !== undefined && previousClose) {
        quote.gapDollar = dailyData.open - previousClose
        quote.gapPercent = (quote.gapDollar / previousClose) * 100
      }

      console.info(`[Massive] ✓ Quote fetched for ${symbol} at $${price.toFixed(2)}`)

      return {
        quote,
        timestamp: trade.t ?? Date.now(), // Use trade timestamp or fallback to now
        source: 'massive',
      }
    } catch (err) {
      console.warn('[Massive] Quote fetch failed:', err)
      return null
    }
  }

  async fetchChart(
    symbol: string,
    interval: string,
    from: string,
    to: string
  ): Promise<ChartResponse | null> {
    try {
      // Map interval to Polygon's timespan format
      // interval examples: '1m', '5m', '1h', '1d'
      const [multiplier, timespan] = this.parseInterval(interval)

      const url = `${MASSIVE_BASE_URL}/v2/aggs/ticker/${encodeURIComponent(
        symbol
      )}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${this.apiKey}`

      const response = await fetchWithTimeout(url)
      if (!response.ok) {
        console.warn(`[Massive] Chart HTTP ${response.status}`)
        return null
      }

      const data = await response.json()

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.warn('[Massive] No chart data returned')
        return null
      }

      const chart: ChartPoint[] = data.results.map((bar: any) => {
        const timestamp = bar.t // Unix ms
        const date = new Date(timestamp)
        return {
          time: this.formatTime(date, interval),
          price: bar.c, // Close price
          timestamp,
        }
      })

      console.info(
        `[Massive] ✓ Chart fetched for ${symbol}: ${chart.length} points (${interval})`
      )

      return {
        chart,
        source: 'massive',
      }
    } catch (err) {
      console.warn('[Massive] Chart fetch failed:', err)
      return null
    }
  }

  async fetchPreMarket(
    symbol: string,
    date: string
  ): Promise<PreMarketResponse | null> {
    try {
      // Fetch 1-minute bars for the pre-market session (4:00 AM - 9:30 AM ET)
      // Date format: YYYY-MM-DD
      const url = `${MASSIVE_BASE_URL}/v2/aggs/ticker/${encodeURIComponent(
        symbol
      )}/range/1/minute/${date}/${date}?adjusted=true&sort=asc&apiKey=${this.apiKey}`

      const response = await fetchWithTimeout(url)

      // If not authorized for minute data, return null to fall back to Yahoo
      if (response.status === 403 || response.status === 401) {
        console.info('[Massive] Pre-market minute data not available on current plan')
        return null
      }

      if (!response.ok) {
        console.warn(`[Massive] PreMarket HTTP ${response.status}`)
        return null
      }

      const data = await response.json()

      if (data.status === 'NOT_AUTHORIZED') {
        console.info('[Massive] Pre-market minute data requires plan upgrade')
        return null
      }

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.info('[Massive] No pre-market data available')
        return { source: 'massive' }
      }

      let preMarketHigh: number | undefined
      let preMarketLow: number | undefined

      const PRE_MARKET_START_MIN = 4 * 60 // 04:00 ET
      const REGULAR_OPEN_MIN = 9 * 60 + 30 // 09:30 ET

      for (const bar of data.results) {
        const timestamp = bar.t
        const { totalMinutes } = this.nyClockFor(timestamp)

        // Filter for pre-market hours only
        if (totalMinutes >= PRE_MARKET_START_MIN && totalMinutes < REGULAR_OPEN_MIN) {
          const candleHigh = bar.h ?? bar.c
          const candleLow = bar.l ?? bar.c

          if (preMarketHigh === undefined || candleHigh > preMarketHigh) {
            preMarketHigh = candleHigh
          }
          if (preMarketLow === undefined || candleLow < preMarketLow) {
            preMarketLow = candleLow
          }
        }
      }

      if (preMarketHigh !== undefined && preMarketLow !== undefined) {
        console.info(
          `[Massive] ✓ Pre-market levels for ${symbol}: H $${preMarketHigh.toFixed(2)} L $${preMarketLow.toFixed(2)}`
        )
      }

      return {
        preMarketHigh,
        preMarketLow,
        source: 'massive',
      }
    } catch (err) {
      console.warn('[Massive] PreMarket fetch failed:', err)
      return null
    }
  }

  /**
   * Fallback quote method using free-tier endpoints (daily aggregates).
   * Uses previous day's close and today's open/high/low when available.
   */
  private async fetchQuoteFromDaily(symbol: string): Promise<QuoteResponse | null> {
    try {
      // Fetch previous close
      const prevData = await this.fetchPreviousClose(symbol)
      if (!prevData) return null

      const previousClose = prevData.close

      // Try to get today's open/high/low
      const todayData = await this.fetchDailyAggregates(symbol)

      // Use today's data if available, otherwise use previous close as fallback
      const price = todayData?.close ?? previousClose
      const open = todayData?.open ?? previousClose
      const high = todayData?.high ?? price
      const low = todayData?.low ?? price

      const change = price - previousClose
      const changePercent = previousClose ? (change / previousClose) * 100 : 0

      const quote: StockQuote = {
        symbol,
        price,
        change,
        changePercent,
        high,
        low,
        open,
        previousClose,
        isMock: false,
      }

      // Calculate gap if we have open
      if (open !== previousClose) {
        quote.gapDollar = open - previousClose
        quote.gapPercent = (quote.gapDollar / previousClose) * 100
      }

      console.info(`[Massive] ✓ Quote fetched from daily data for ${symbol} at $${price.toFixed(2)}`)

      return {
        quote,
        timestamp: Date.now(),
        source: 'massive',
      }
    } catch (err) {
      console.warn('[Massive] Daily quote fetch failed:', err)
      return null
    }
  }

  private async fetchPreviousClose(symbol: string): Promise<{ close: number } | null> {
    try {
      const url = `${MASSIVE_BASE_URL}/v2/aggs/ticker/${encodeURIComponent(
        symbol
      )}/prev?adjusted=true&apiKey=${this.apiKey}`

      const response = await fetchWithTimeout(url)
      if (!response.ok) return null

      const data = await response.json()
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return { close: data.results[0].c }
      }
      return null
    } catch {
      return null
    }
  }

  private async fetchDailyAggregates(
    symbol: string
  ): Promise<{ open: number; high: number; low: number; close: number } | null> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const url = `${MASSIVE_BASE_URL}/v1/open-close/${encodeURIComponent(
        symbol
      )}/${today}?adjusted=true&apiKey=${this.apiKey}`

      const response = await fetchWithTimeout(url)

      // If today's data not ready, try previous day
      if (!response.ok) {
        const prevData = await this.fetchPreviousClose(symbol)
        if (prevData) {
          return {
            open: prevData.close,
            high: prevData.close,
            low: prevData.close,
            close: prevData.close,
          }
        }
        return null
      }

      const data = await response.json()
      if (data.status === 'OK') {
        return {
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close || data.open,
        }
      }
      return null
    } catch {
      return null
    }
  }

  private parseInterval(interval: string): [number, string] {
    // Parse intervals like '1m', '5m', '1h', '1d', '1w'
    const match = interval.match(/^(\d+)([mhdw])$/)
    if (!match) return [1, 'minute']

    const multiplier = parseInt(match[1], 10)
    const unit = match[2]

    const timespanMap: Record<string, string> = {
      m: 'minute',
      h: 'hour',
      d: 'day',
      w: 'week',
    }

    return [multiplier, timespanMap[unit] || 'minute']
  }

  private formatTime(date: Date, interval: string): string {
    // Format based on interval granularity
    if (interval.endsWith('m') || interval.endsWith('h')) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    } else if (interval.endsWith('d') || interval.endsWith('w')) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return date.toISOString()
  }

  private nyClockFor(timestamp: number): { totalMinutes: number } {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(new Date(timestamp))
    let hour = 0
    let minute = 0
    for (const p of parts) {
      if (p.type === 'hour') hour = parseInt(p.value, 10)
      else if (p.type === 'minute') minute = parseInt(p.value, 10)
    }
    if (hour === 24) hour = 0
    return { totalMinutes: hour * 60 + minute }
  }
}
