# Calculate My Win — Day Trading Dashboard

A client-side day trading dashboard that tracks multiple stocks in parallel with live charts and includes instant profit/loss calculators with persistent log.

## Tech Stack

- **Framework**: React 19 + Vite + TypeScript
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **Charts**: Recharts
- **Icons**: Lucide React
- **State**: React Context + hooks
- **Persistence**: localStorage (no backend)
- **Fonts**: IBM Plex Sans (UI) + JetBrains Mono (numbers)

## Features

- **Multi-ticker watchlist** — Track multiple stocks simultaneously with independent time ranges
- **Live data polling** — Refreshes all tracked stocks every 15 seconds
- **Flexible time ranges** — 10m / 1h / 3h / 1d / 1w / 1mo / 1y per ticker
- **Real-time price charts** — Area charts with color-coded trends
- **Mode A calculator** — Instant percentage gain calculator
- **Mode B calculator** — Position profit/loss calculator with live price integration
- **Simulation log** — Persistent history of logged calculations (localStorage)
- **Smart data fallback** — Finnhub → Yahoo Finance → Demo data

## Getting Started

### Installation

```bash
npm install
```

### Optional: Finnhub API Key Setup

For improved live stock data, create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your Finnhub API key (get a free key at [https://finnhub.io/](https://finnhub.io/)):

```
VITE_FINNHUB_API_KEY=your_key_here
```

**Without the key**, the app will fall back to Yahoo Finance and demo data — it works perfectly fine without it.

### Development

```bash
npm run dev
```

Open your browser to the URL shown (typically `http://localhost:5173`).

### Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist/` folder.

## Data Source Fallback Chain

The app fetches stock data using a smart fallback strategy:

| Scenario | Quote Source | Chart Source | Badge |
|----------|-------------|--------------|-------|
| Both Finnhub + Yahoo succeed | Finnhub | Yahoo | `Live · finnhub` |
| Only Finnhub succeeds | Finnhub | Mock (anchored to real price) | `Live · finnhub` |
| Only Yahoo succeeds | Yahoo | Yahoo | `Live · yahoo` |
| Both fail | Mock | Mock | `Demo` (amber badge) |

**No API key?** The app automatically uses Yahoo Finance and generates realistic demo data when needed. Everything runs client-side in your browser.

## How to Use

1. **Load a stock** — Enter a symbol (e.g., `AAPL`, `NVDA`, `TSLA`) and press Load
2. **Switch time ranges** — Click the range tabs (`10m` / `1h` / `3h` / `1d` / `1w` / `1mo` / `1y`)
3. **Set active ticker** — Click "Set active" to use a ticker in the calculators
4. **Use Mode A** — Quick percentage gain calculator (no submit needed — updates as you type)
5. **Use Mode B** — Full position calculator with "Use live price" button
6. **Log simulations** — Save calculations to review later (persists across browser sessions)

## License

MIT

---

**Not financial advice.** This tool is for educational and informational purposes only.
