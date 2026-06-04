# Multi-Provider Data Integration System

## Overview

The application now supports a **Multi-Provider** architecture with intelligent fallback for fetching stock market data. This ensures maximum reliability and data accuracy by leveraging multiple data sources.

## Supported Providers (Priority Order)

1. **⚡ Massive.com (Polygon.io)** - Primary (if API key provided)
   - Highly accurate pre-market data (4:00 AM - 9:30 AM ET)
   - Real-time intraday quotes
   - 1-minute granularity for chart data
   - Best for paid/trial tier users
   - Dashboard: https://massive.com/dashboard/keys

2. **🟢 Finnhub.io** - Secondary fallback
   - Real-time quotes
   - Basic intraday support
   - Free tier available
   - Dashboard: https://finnhub.io/

3. **📊 Yahoo Finance** - Tertiary fallback
   - Free (no API key required)
   - Historical chart data
   - Daily aggregates
   - Accessed via CORS proxies

4. **🎭 Mock Data** - Final fallback
   - Demo data for testing
   - Used when all providers fail

## Configuration

### 1. Add API Keys to `.env`

```bash
# Primary: Massive.com (Polygon.io)
VITE_MASSIVE_API_KEY=your_massive_api_key_here

# Secondary: Finnhub.io
VITE_FINNHUB_API_KEY=your_finnhub_api_key_here
```

### 2. Obtaining API Keys

#### Massive.com (Recommended for Accuracy)
1. Visit https://massive.com/
2. Sign up for a free trial or paid plan
3. Navigate to https://massive.com/dashboard/keys
4. Copy your API key
5. Add to `.env` as `VITE_MASSIVE_API_KEY`

#### Finnhub.io (Free Tier Available)
1. Visit https://finnhub.io/
2. Sign up for a free account
3. Copy your API key from the dashboard
4. Add to `.env` as `VITE_FINNHUB_API_KEY`

## Architecture

### Provider Selection Logic

```
┌─────────────────────────────────────┐
│  User Requests Stock Data (AAPL)   │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   Provider Registry (providerRegistry) │
└────────────────┬────────────────────┘
                 │
                 ▼
         ┌───────┴────────┐
         │                │
         ▼                ▼
   Has Massive Key?    No Key?
         │                │
         │                ▼
         │         Use Finnhub/Yahoo
         │
         ▼
┌──────────────────────┐
│  Try Massive.com     │
│  (Polygon.io API)    │
└──────────┬───────────┘
           │
           ├─── Success? ─────► Return data ✓
           │
           └─── Failure? ─────► Fall back to Finnhub
                                      │
                                      ├─── Success? ─────► Return data ✓
                                      │
                                      └─── Failure? ─────► Fall back to Yahoo
                                                    │
                                                    └─── Success/Fail ─────► Return data or mock
```

### File Structure

```
src/
├── services/
│   ├── stockService.ts              # Main service (updated with provider integration)
│   └── providers/
│       ├── types.ts                 # Provider interfaces & types
│       ├── massiveProvider.ts       # Massive.com (Polygon.io) implementation
│       └── providerRegistry.ts      # Orchestration & fallback logic
├── components/
│   ├── Dashboard.tsx                # Header integration
│   └── ProviderStatusBadge.tsx      # UI status indicator
└── types/
    └── index.ts                     # DataSource type updated
```

## Features

### 1. Intelligent Fallback
- Each provider has retry logic with exponential backoff
- Automatic fallback to next provider on failure
- Providers disabled after 5 consecutive failures

### 2. Pre-Market Data Enhancement
- **Massive.com**: 1-minute granularity (4:00 AM - 9:30 AM ET)
- Accurate high/low boundaries for gap-up/gap-down analysis
- Cached indefinitely per symbol (static during trading session)

### 3. Real-Time Quote Updates
- 30-second polling interval
- Live tail accumulation bridges Yahoo's lag
- Stale quote detection (90-second freshness threshold)

### 4. UI Status Indicator
- **⚡ Powered by Massive** - Blue badge (Massive.com active)
- **🟢 Powered by Finnhub** - Green badge (Finnhub active)
- Displayed in Dashboard header

## API Endpoint Mapping

### Massive.com (Polygon.io)

| Feature | Endpoint | Example |
|---------|----------|---------|
| Last Quote | `/v2/last/trade/{ticker}` | `/v2/last/trade/AAPL` |
| Pre-Market | `/v2/aggs/ticker/{ticker}/range/1/minute/{date}/{date}` | `/v2/aggs/ticker/AAPL/range/1/minute/2024-01-15/2024-01-15` |
| Chart Data | `/v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}` | `/v2/aggs/ticker/AAPL/range/1/minute/2024-01-15/2024-01-15` |
| Previous Close | `/v2/aggs/ticker/{ticker}/prev` | `/v2/aggs/ticker/AAPL/prev` |
| Daily OHLC | `/v1/open-close/{ticker}/{date}` | `/v1/open-close/AAPL/2024-01-15` |

### Finnhub.io

| Feature | Endpoint | Example |
|---------|----------|---------|
| Quote | `/api/v1/quote` | `/api/v1/quote?symbol=AAPL&token=KEY` |

### Yahoo Finance (via CORS Proxy)

| Feature | Endpoint | Example |
|---------|----------|---------|
| Chart | `/v8/finance/chart/{symbol}` | `/v8/finance/chart/AAPL?interval=1m&range=1d` |

## Data Flow Example

### Scenario: User adds "TSLA" to watchlist

1. **Initial Load** (Full Fetch):
   ```
   ┌─ fetchStockData('TSLA', '1d', isPolling=false)
   │
   ├─ Quote: Try Massive → Finnhub → Yahoo
   ├─ Chart: Try Massive → Yahoo
   ├─ Pre-Market: Try Massive → Yahoo (dedicated 1m fetch)
   └─ SPY Overlay: Yahoo
   
   Cache all static data (PM levels, chart, overlay)
   ```

2. **30s Polling** (Live Updates):
   ```
   ┌─ fetchStockData('TSLA', '1d', isPolling=true)
   │
   ├─ Quote: Massive/Finnhub (live price)
   ├─ Chart: Yahoo (new candle)
   ├─ Pre-Market: Use cached values
   └─ SPY Overlay: Refresh alignment
   
   Extend chart with live tail
   ```

## Debugging

### Enable Provider Logs

Check browser console for detailed logs:

```javascript
[Massive] ✓ Quote fetched for AAPL at $180.50
[ProviderRegistry] ⚡ Massive.com provider initialized
[Finnhub] ✓ Quote fetched for AAPL
[PreMarket] ✓ Fetched for AAPL: H $181.20 L $179.80
```

### Common Issues

#### "No data available"
- **Check**: API keys in `.env` are correct
- **Check**: Network tab for 401/403 errors (invalid key)
- **Fix**: Verify key at provider dashboard

#### "Chart frozen"
- **Cause**: CORS proxy cache serving stale data
- **Fix**: Cache-buster (`_cb=${Date.now()}`) appended automatically

#### "Pre-market missing"
- **Cause**: Weekend, market closed, or illiquid stock
- **Expected**: Pre-market data only available 4:00-9:30 AM ET on trading days

## Performance Optimizations

### 1. Static Data Caching
- Pre-market levels: Fetched once, cached indefinitely
- Historical chart: Cached per symbol+range
- SPY overlay: Cached and refreshed only on polling

### 2. API Rate Limiting
- 30-second polling interval (reduces calls by 50% vs 15s)
- Static data never re-fetched during session
- Live tail accumulation extends chart without extra API calls

### 3. Concurrent Fetching
- Quote, chart, pre-market, and overlay fetched in parallel
- Reduces total fetch time from ~15s sequential to ~5s concurrent

## Migration Notes

### From Finnhub-Only to Multi-Provider

**No Breaking Changes**:
- Existing Finnhub integration fully preserved
- `VITE_FINNHUB_API_KEY` still works as before
- Add `VITE_MASSIVE_API_KEY` to enable enhanced accuracy

**Type Changes**:
```typescript
// Before
type DataSource = 'finnhub' | 'yahoo' | 'mock'

// After
type DataSource = 'massive' | 'finnhub' | 'yahoo' | 'mock'
```

**LocalStorage Compatibility**:
- All existing cached data remains valid
- New provider data uses same schema
- No migration required

## Cost Considerations

### Free Tier
- **Finnhub**: 60 calls/minute
- **Yahoo Finance**: No key required, rate-limited by CORS proxy
- **Mock**: Unlimited (generated locally)

### Paid Tier (Recommended)
- **Massive.com (Polygon.io)**: 
  - Free tier: 5 API calls/minute
  - Starter: 100 calls/minute ($29/mo)
  - Developer: 1000 calls/minute ($99/mo)
  - Higher tiers available for professional trading

With optimized caching:
- 10 symbols watchlist = ~10 initial calls + 10 calls/30s polling
- ~20 calls/minute sustained = Well within Starter tier

## Testing

### Test Provider Fallback

1. **Test Massive Priority**:
   ```bash
   # Set Massive key only
   VITE_MASSIVE_API_KEY=valid_key
   VITE_FINNHUB_API_KEY=
   ```
   Expected: Blue "Powered by Massive" badge

2. **Test Finnhub Fallback**:
   ```bash
   # Set invalid Massive key
   VITE_MASSIVE_API_KEY=invalid_key
   VITE_FINNHUB_API_KEY=valid_key
   ```
   Expected: Automatic fallback, Green "Powered by Finnhub" badge

3. **Test Yahoo Fallback**:
   ```bash
   # No keys
   VITE_MASSIVE_API_KEY=
   VITE_FINNHUB_API_KEY=
   ```
   Expected: Yahoo/Mock data, "Powered by Finnhub" badge (default)

## Future Enhancements

- [ ] Alpha Vantage provider integration
- [ ] IEX Cloud provider integration
- [ ] Provider health dashboard
- [ ] Auto-disable/re-enable providers based on success rate
- [ ] Provider-specific retry strategies
- [ ] WebSocket support for real-time streaming (Polygon.io)
- [ ] Historical backfill for multi-day analysis

## Support

For issues or questions:
1. Check browser console for provider logs
2. Verify API keys at provider dashboards
3. Review this documentation
4. Open GitHub issue with logs and config (redact API keys)

---

**Last Updated**: 2026-06-03
**Version**: 1.0.0
