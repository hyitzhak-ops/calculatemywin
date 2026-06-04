# 🚀 Quick Start: Massive.com Integration

## ⚡ Get Started in 3 Steps

### Step 1: Get Your Massive.com API Key

1. Visit **https://massive.com/**
2. Sign up for a free trial or paid plan
3. Go to **https://massive.com/dashboard/keys**
4. Copy your API key

### Step 2: Add to `.env`

Open `.env` file in the project root and add:

```bash
VITE_MASSIVE_API_KEY=your_api_key_here
```

**Example:**
```bash
# .env
VITE_MASSIVE_API_KEY=pk_abc123def456ghi789jkl012mno345pqr678stu901
VITE_FINNHUB_API_KEY=d8c501pr01qidic6cv3gd8c501pr01qidic6cv40
```

### Step 3: Restart the App

```bash
npm run dev
```

## ✅ Verify It's Working

### Visual Confirmation

Look for the **blue badge** in the header:

```
⚡ Powered by Massive
```

If you see this badge, Massive.com is active! 🎉

### Console Confirmation

Open browser DevTools console and look for:

```
[ProviderRegistry] ⚡ Massive.com provider initialized
[Massive] ✓ Quote fetched for AAPL at $180.50
[Massive] ✓ Pre-market levels for AAPL: H $181.20 L $179.80
```

### Test Pre-Market Data

1. Add a volatile stock symbol (e.g., NVDA, TSLA, GME)
2. Look for **two horizontal lines** on the chart:
   - Green line = Pre-market high
   - Red line = Pre-market low
3. These should be **highly accurate** now (1-minute granularity)

## 🔄 Fallback Behavior

### If Massive.com Fails:

```
⚡ Massive.com (Primary)
    ↓ fails
🟢 Finnhub (Secondary)
    ↓ fails
📊 Yahoo Finance (Tertiary)
    ↓ fails
🎭 Mock Data (Always available)
```

### Badge States:

| Badge | Meaning |
|-------|---------|
| ⚡ Powered by Massive | Massive.com is active |
| 🟢 Powered by Finnhub | Finnhub is active (Massive unavailable) |

## 📊 What Data Comes from Massive.com?

When active, Massive.com provides:

- ✅ **Real-time quotes** (sub-second latency)
- ✅ **Pre-market high/low** (4:00-9:30 AM ET, 1-minute bars)
- ✅ **Intraday chart data** (1-minute, 5-minute, hourly)
- ✅ **Gap calculations** (open vs previous close)
- ✅ **Daily OHLC** (open, high, low, close)

All other data (SPY overlay, etc.) still uses Yahoo Finance.

## 🛠️ Troubleshooting

### Issue: Green badge instead of blue

**Cause:** Massive.com API key missing or invalid

**Fix:**
1. Check `.env` has `VITE_MASSIVE_API_KEY=your_key`
2. Verify key at https://massive.com/dashboard/keys
3. Remove quotes around key (if any)
4. Restart dev server

### Issue: "Powered by Finnhub" but I want Massive

**Cause:** Environment variable not loaded

**Fix:**
```bash
# Stop server (Ctrl+C)
# Edit .env
# Restart
npm run dev
```

### Issue: Console shows `[Massive] HTTP 401`

**Cause:** Invalid API key

**Fix:**
1. Go to https://massive.com/dashboard/keys
2. Generate a new key
3. Update `.env`
4. Restart server

### Issue: No pre-market lines on chart

**Causes:**
- Weekend/market closed (expected)
- Before 4:00 AM ET (expected)
- Illiquid stock with no PM activity (expected)
- API key issue (check console for errors)

## 💡 Tips

### Maximize Accuracy

- Use **1d** or **3h** chart range for best pre-market visibility
- Pre-market lines appear only on intraday ranges (10m, 1h, 3h, 1d)
- Refresh page if switching from Finnhub → Massive mid-session

### Monitor API Usage

Check your Massive.com dashboard to track:
- API calls/minute
- Remaining quota
- Upgrade recommendations

With optimized caching, a typical 10-symbol watchlist uses:
- **~20 calls** on initial load
- **~10 calls/30s** during polling
- **~20 calls/minute** sustained

This fits comfortably in the **Starter tier** (100 calls/minute).

## 📖 Learn More

- **Full Documentation:** See `MULTI_PROVIDER_SETUP.md`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Massive.com API Docs:** https://polygon.io/docs/stocks/getting-started

---

**Need Help?** Open an issue on GitHub with:
1. Browser console logs (filter by `[Massive]` or `[ProviderRegistry]`)
2. Your provider badge state (blue or green)
3. Network tab screenshot (HTTP status codes)

**Happy Trading!** 📈
