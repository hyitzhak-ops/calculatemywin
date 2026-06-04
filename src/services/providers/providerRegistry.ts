/**
 * Provider Registry & Orchestration
 *
 * Manages multiple data providers with intelligent fallback logic.
 * Priority: Massive.com → Finnhub.io → Yahoo Finance → Mock
 */

import type {
  Provider,
  ProviderName,
  QuoteResponse,
  ChartResponse,
  PreMarketResponse,
} from './types'
import { MassiveProvider } from './massiveProvider'

export interface ProviderStatus {
  name: ProviderName
  enabled: boolean
  lastSuccess: number | null
  lastFailure: number | null
  consecutiveFailures: number
}

class ProviderRegistry {
  private providers: Map<ProviderName, Provider> = new Map()
  private status: Map<ProviderName, ProviderStatus> = new Map()
  private activeProviderName: ProviderName = 'finnhub' // Default fallback

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders(): void {
    // Massive.com (Polygon.io) provider
    const massiveKey = this.getApiKey('VITE_MASSIVE_API_KEY')
    if (massiveKey) {
      const massiveProvider = new MassiveProvider(massiveKey)
      this.providers.set('massive', massiveProvider)
      this.status.set('massive', {
        name: 'massive',
        enabled: true,
        lastSuccess: null,
        lastFailure: null,
        consecutiveFailures: 0,
      })
      this.activeProviderName = 'massive' // Prefer Massive if available
      console.info('[ProviderRegistry] ⚡ Massive.com provider initialized')
    }

    // Finnhub.io is handled by existing stockService.ts logic
    const finnhubKey = this.getApiKey('VITE_FINNHUB_API_KEY')
    if (finnhubKey) {
      this.status.set('finnhub', {
        name: 'finnhub',
        enabled: true,
        lastSuccess: null,
        lastFailure: null,
        consecutiveFailures: 0,
      })
      if (!massiveKey) {
        this.activeProviderName = 'finnhub'
      }
      console.info('[ProviderRegistry] 🟢 Finnhub provider initialized')
    }

    // Yahoo Finance is always available as fallback (no key required)
    this.status.set('yahoo', {
      name: 'yahoo',
      enabled: true,
      lastSuccess: null,
      lastFailure: null,
      consecutiveFailures: 0,
    })
  }

  private getApiKey(envVar: string): string {
    let key = import.meta.env[envVar]?.trim() || ''

    // Strip surrounding quotes if user pasted them
    if ((key.startsWith('"') && key.endsWith('"')) ||
        (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1)
    }

    return key
  }

  getActiveProvider(): ProviderName {
    return this.activeProviderName
  }

  getProviderStatus(): ProviderStatus[] {
    return Array.from(this.status.values())
  }

  async fetchQuoteWithFallback(symbol: string): Promise<QuoteResponse | null> {
    // Try Massive first if available
    if (this.providers.has('massive')) {
      const provider = this.providers.get('massive')!
      try {
        const result = await provider.fetchQuote(symbol)
        if (result) {
          this.recordSuccess('massive')
          return result
        }
      } catch (err) {
        console.warn('[ProviderRegistry] Massive quote failed, falling back:', err)
        this.recordFailure('massive')
      }
    }

    // Fallback to Finnhub (handled by existing stockService.ts)
    return null
  }

  async fetchPreMarketWithFallback(
    symbol: string,
    date: string
  ): Promise<PreMarketResponse | null> {
    // Try Massive first if available
    if (this.providers.has('massive')) {
      const provider = this.providers.get('massive')!
      try {
        const result = await provider.fetchPreMarket(symbol, date)
        if (result && (result.preMarketHigh !== undefined || result.preMarketLow !== undefined)) {
          this.recordSuccess('massive')
          return result
        }
      } catch (err) {
        console.warn('[ProviderRegistry] Massive pre-market failed, falling back:', err)
        this.recordFailure('massive')
      }
    }

    // Fallback to existing Yahoo-based pre-market fetch
    return null
  }

  async fetchChartWithFallback(
    symbol: string,
    interval: string,
    from: string,
    to: string
  ): Promise<ChartResponse | null> {
    // Try Massive first if available
    if (this.providers.has('massive')) {
      const provider = this.providers.get('massive')!
      try {
        const result = await provider.fetchChart(symbol, interval, from, to)
        if (result && result.chart.length > 0) {
          this.recordSuccess('massive')
          return result
        }
      } catch (err) {
        console.warn('[ProviderRegistry] Massive chart failed, falling back:', err)
        this.recordFailure('massive')
      }
    }

    // Fallback to existing Yahoo-based chart fetch
    return null
  }

  private recordSuccess(provider: ProviderName): void {
    const status = this.status.get(provider)
    if (status) {
      status.lastSuccess = Date.now()
      status.consecutiveFailures = 0
    }
  }

  private recordFailure(provider: ProviderName): void {
    const status = this.status.get(provider)
    if (status) {
      status.lastFailure = Date.now()
      status.consecutiveFailures++

      // Disable provider after 5 consecutive failures
      if (status.consecutiveFailures >= 5) {
        status.enabled = false
        console.warn(
          `[ProviderRegistry] Provider "${provider}" disabled after 5 consecutive failures`
        )
      }
    }
  }

  reset(): void {
    for (const status of this.status.values()) {
      status.enabled = true
      status.lastSuccess = null
      status.lastFailure = null
      status.consecutiveFailures = 0
    }
  }
}

export const providerRegistry = new ProviderRegistry()
