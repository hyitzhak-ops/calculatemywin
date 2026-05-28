# Testing Checklist

This document verifies that all acceptance criteria from the specification have been met.

## Build & Development

- [x] `npm run build` succeeds with no TypeScript errors
- [x] `npm run dev` opens a dark dashboard
- [x] Dev server starts on http://localhost:5173

## Initial Load

- [ ] AAPL ticker is pre-loaded on first visit
- [ ] Dark theme with zinc-950 background
- [ ] Header shows "Calculate My Win" with emerald-tinted icon
- [ ] Footer shows API key information

## Data Sources

- [ ] Ticker shows green `Live · yahoo` or `Live · finnhub` pill (not amber `Demo`) when network is available
- [ ] With no Finnhub key, falls back to Yahoo Finance
- [ ] With both sources failing, shows amber `Demo` badge
- [ ] Console logs show which data source was used

## Watchlist Features

- [ ] Clicking `+ Add stock` adds a new empty ticker
- [ ] Typing `NVDA` and pressing Load fetches the stock and shows a chart
- [ ] Each ticker has 7 working range tabs: `10m / 1h / 3h / 1d / 1w / 1mo / 1y`
- [ ] Clicking any range tab refetches just that ticker with the new resolution
- [ ] X button removes a ticker (only shown when more than one ticker exists)
- [ ] Removing the last ticker leaves a fresh empty ticker
- [ ] Clicking the ghost "+" card adds a new ticker
- [ ] Last updated time shows in ticker subtitle
- [ ] Refresh icon manually refetches a ticker
- [ ] Refresh icon spins during loading

## Active Ticker Management

- [ ] "Set active" button marks a ticker as active
- [ ] Active ticker shows emerald ring border
- [ ] Only one ticker can be active at a time
- [ ] Clicking into a ticker's symbol input also marks it as active
- [ ] Mode B calculator header shows the active ticker symbol

## Live Polling

- [ ] All loaded tickers refresh every 15 seconds
- [ ] Subtitle shows "refreshing every 15s"
- [ ] Last updated time updates after each refresh

## Calculator Mode A (Percentage)

- [ ] Mode A and Mode B render side by side on `md` and up
- [ ] Typing in Mode A updates the result instantly (no Submit button)
- [ ] Result shows as "—" when inputs are empty
- [ ] Result shows "Enter valid buy price > 0" for invalid buy price
- [ ] Profit colors flip green/red correctly
- [ ] Percentage calculation: ((sell - buy) / buy) * 100

## Calculator Mode B (Position)

- [ ] Header shows active ticker symbol (e.g., "Mode B — AAPL Position")
- [ ] "Use live price" button fills Buy Price from active ticker's quote
- [ ] "Use live price" is disabled when no active quote exists
- [ ] Typing updates Total Investment and Profit/Loss instantly
- [ ] Profit/Loss shows both USD and percentage
- [ ] Colors are green for profit, red for loss
- [ ] "Log simulation" button is disabled when result is invalid
- [ ] "Log simulation" button is disabled when no active ticker
- [ ] Clicking "Log simulation" saves to the log
- [ ] "Saved to log" message shows briefly for 2 seconds

## Simulation Log

- [ ] Empty state shows "No simulations yet" with history icon
- [ ] Logged simulations appear in the list
- [ ] Each entry shows: symbol, shares, buy/sell prices, profit USD, profit %, timestamp
- [ ] Profit values are color-coded (green/red)
- [ ] Relative timestamps work (e.g., "5m ago", "2h ago")
- [ ] X button on hover removes individual entry
- [ ] "Clear all" button removes all entries
- [ ] Log persists across full page reload
- [ ] Subtitle shows "{N} saved · persists in browser"

## Styling & Typography

- [ ] All numbers use monospace font (JetBrains Mono)
- [ ] All numbers use tabular-nums
- [ ] UI text uses IBM Plex Sans
- [ ] Dark theme with zinc-900/60 panels and zinc-800/80 borders
- [ ] Emerald-400/500 for active states and positive values
- [ ] Red-400 for negative values
- [ ] Green-400 for positive values
- [ ] Rounded corners (rounded-lg) on panels
- [ ] Hover states work on buttons

## Charts

- [ ] Charts show green stroke/fill when price is up
- [ ] Charts show red stroke/fill when price is down
- [ ] X-axis labels are properly formatted per range
- [ ] Y-axis shows prices with 2 decimals
- [ ] Tooltip shows on hover with proper formatting
- [ ] No dots on line, only activeDot on hover
- [ ] Chart is 12rem (h-48) tall

## Edge Cases

- [ ] Removing a ticker works with X button
- [ ] Removing the active ticker moves active to first remaining
- [ ] Can't remove the last ticker (fresh empty one replaces it)
- [ ] Invalid symbols show error messages
- [ ] Network failures fall back to mock data gracefully
- [ ] No crashes with empty inputs
- [ ] No crashes with zero/negative values

## No Backend / Client-Side Only

- [ ] No backend required
- [ ] No API keys hard-coded in source
- [ ] App works (with mock data) even if every external request fails
- [ ] All data persistence uses localStorage only
- [ ] Everything runs in the browser

## Console Debugging

- [ ] Console shows info logs for successful fetches
- [ ] Console shows warnings for failed fetches
- [ ] Console indicates which data source was used per ticker
- [ ] Console shows "No Finnhub key set" when key is missing

---

## Quick Test Sequence

1. Open http://localhost:5173
2. Verify AAPL loads automatically with live data
3. Change range from 1h to 1d — verify chart updates
4. Click "+ Add stock", type TSLA, press Load
5. Click "Set active" on TSLA ticker
6. In Mode B: enter 100 shares, click "Use live price", enter a sell price
7. Click "Log simulation" — verify it appears in the log
8. Refresh the page — verify the simulation log persists
9. Remove TSLA ticker — verify AAPL becomes active
10. Try to remove the last ticker — verify a fresh empty one appears

All features should work smoothly with instant updates and proper visual feedback.
