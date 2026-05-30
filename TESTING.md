# Testing Checklist

Manual smoke tests covering every tab and feature. Use after any meaningful change to verify nothing regressed.

---

## Build & Dev

- [ ] `npm install` completes
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] `npm run dev` boots; the dashboard appears at the printed URL
- [ ] Initial AAPL ticker loads automatically with a green `Live · finnhub` or `Live · yahoo` badge

---

## Header & Tab Switcher

- [ ] Header shows the "Calculate My Win" title with the emerald icon
- [ ] Header right side shows `Today: $X.XX` (color: emerald when goal reached, red when negative, neutral otherwise)
- [ ] Header right side shows **Export Backup** and **Import Backup** buttons
- [ ] Tab switcher exposes three tabs: **Live Dashboard**, **Daily Goal & Risk Manager**, **Journal & Reports**
- [ ] When the daily goal is reached, the Risk Manager tab shows a 🎯 badge

---

## Tab 1 — Live Dashboard & Calculator

### Watchlist
- [ ] `+ Add stock` adds a new empty ticker
- [ ] Typing `NVDA` and pressing Load fetches and renders the chart
- [ ] Each ticker has 7 working range tabs: `10m / 1h / 3h / 1d / 1w / 1mo / 1y`
- [ ] Clicking a range refetches just that ticker
- [ ] All loaded tickers refresh every 15 seconds
- [ ] X button removes a ticker (only when more than one exists)
- [ ] Removing the last ticker leaves a fresh empty one
- [ ] "Set active" puts the emerald ring on a ticker and updates Mode B's header

### Charts
- [ ] Green stroke + gradient fill when price is up; red when down
- [ ] X-axis labels formatted appropriately for the range
- [ ] Tooltip on hover shows formatted price
- [ ] No dots on the line; activeDot only on hover

### Mode A — Percent Calculator
- [ ] Side-by-side with Mode B on `md` and up
- [ ] Result updates instantly as you type (no Submit)
- [ ] `(sell − buy) / buy × 100` colored green / red
- [ ] Empty / invalid inputs show an "—" or guidance message

### Mode B — Position Calculator
- [ ] Header shows the active ticker symbol
- [ ] "Use live price" fills Buy Price from the active quote (disabled when no quote)
- [ ] Total Investment + USD profit + percent update instantly
- [ ] "Log simulation" disabled until inputs are valid AND a ticker is active
- [ ] Logged entries appear in the Simulation Log
- [ ] "Saved to log" toast flashes for ~2 s

### Simulation Log
- [ ] Empty state shows the history icon + "No simulations yet"
- [ ] Each entry: symbol, shares, buy/sell, profit USD, profit %, relative timestamp
- [ ] Profit values color-coded green / red
- [ ] Per-row X removes one entry
- [ ] "Clear all" wipes the log
- [ ] Log persists across a full page reload

---

## Tab 2 — Daily Goal & Risk Manager

### Daily Realized Profit Card
- [ ] Shows the live sum of every closed trade for the current calendar day
- [ ] Goal `min` and `max` are configurable via "Edit goal" (e.g. 1000 / 2000)
- [ ] Progress bar fills from 0 → goal.min, then turns brighter when reached
- [ ] When `dailyProfit ≥ goal.min` the celebration banner appears with the 🎯 message
- [ ] **Banner is purely visual** — Add Trade form, Report Sale, all inputs remain fully usable
- [ ] `+$X over goal` chip appears when `dailyProfit > goal.min`
- [ ] `well above max (...over)` pill appears when `dailyProfit > goal.max`
- [ ] If you keep closing winning trades, the live total continues to grow past $2,000
- [ ] When `dailyProfit < 0` and goal not reached, the red down-day advisory shows

### Add Trade Form
- [ ] Click "Add Position" reveals symbol / shares / buy price form
- [ ] "Open Position" disabled until all fields are valid
- [ ] On submit, the trade appears in Active Positions and persists to `localStorage`

### Active Position Cards
For each open trade:
- [ ] Header shows symbol badge, shares, buy price, total cost
- [ ] **Profit Targets matrix (left, green-tinted)** lists 4 tiers (5/10/15/20%) with target price, total value, net profit
- [ ] **Stop-Loss Thresholds matrix (right, red-tinted with `bg-red-950/20` / `text-red-400`)** lists the same tiers downside with stop price, total remaining value, net loss
- [ ] On `lg` screens the two columns sit side-by-side; on small screens they stack
- [ ] **Report Sale** opens a sell-price input with a live realized P/L preview
- [ ] Confirming the sale moves the trade to Today's Closed Trades, updates Daily Realized Profit
- [ ] **Discard (X)** removes a position without recording a sale

### Today's Closed Trades Table
- [ ] Columns: Symbol / Shares / Buy / Sell / Profit / When
- [ ] Profit column color-coded green / red
- [ ] "Clear all" wipes the day's closed trades

---

## Tab 3 — Journal & Reports

### Backup & Restore Panel (top of tab + global header)
- [ ] **Export Backup** downloads `trading_dashboard_backup_YYYY-MM-DD.json`
- [ ] The file contains `version`, `exportedAt`, `app`, and a `data` object with all five slices
- [ ] **Import Backup** opens a file picker
- [ ] Selecting a non-JSON or malformed file shows the alert *"Invalid backup file format."*
- [ ] Selecting a valid backup prompts a confirmation before overwriting
- [ ] After confirming, the calendar / chart / Active Positions / banners all repopulate **without a manual page refresh**
- [ ] The success chip flashes briefly with the count of restored sections

### Reporting Window (shared filter)
- [ ] Five preset chips: Today / This Week / This Month / This Quarter / Custom
- [ ] Selecting Custom reveals two `<input type="date">` fields with `min`/`max` wired together
- [ ] Subtitle reflects the resolved range: `<label> · YYYY-MM-DD → YYYY-MM-DD`
- [ ] Changing the filter immediately updates BOTH the Equity Curve and the Date-Range Report below

### Equity Curve Chart
- [ ] Renders a smooth `monotone` cumulative-P/L area
- [ ] Stroke is emerald when net is positive; red when net is negative
- [ ] Linear gradient fades the fill toward transparent at the bottom
- [ ] `y=0` reference line is visible
- [ ] X-axis labels are `Mon DD` (e.g. "Oct 12")
- [ ] Y-axis abbreviates ≥ 1k as `1.2k`
- [ ] Hovering a point shows the custom tooltip with **Date · Cumulative · Growth % · Day P/L · Trades**
- [ ] Net change + growth-% pills in the chart header match the tooltip's last data point
- [ ] **Summary cards**: Peak Equity, Max Drawdown, Max Daily Win, Max Daily Loss — each with the date it occurred
- [ ] Empty state ("No trades closed in this range yet.") shows when the window has no data

### Performance Calendar (monthly)
- [ ] `grid-cols-7` layout with Sun → Sat headers
- [ ] Prev / Today / Next month navigation works
- [ ] Each cell shows the day number + that day's net P/L + trade count
- [ ] Days with net > 0 are green-tinted, < 0 are red-tinted, breakeven gray
- [ ] Today's cell has an emerald ring
- [ ] Days with a saved note show the amber pencil icon
- [ ] Clicking any cell opens the Daily Note Modal

### Monthly Summary Banner
- [ ] Shows month label, net P/L (color-coded), total trades, and active days
- [ ] Color tone (emerald / red / neutral) matches the sign of net P/L

### Daily Note Modal
- [ ] Opens centered with a backdrop blur
- [ ] Header shows the long date and that day's stats (net P/L, W/L)
- [ ] Textarea is seeded with any existing note
- [ ] Save Note persists to `localStorage`; the day's pencil icon appears in the calendar
- [ ] Delete Note removes the entry; modal closes
- [ ] Esc key closes the modal
- [ ] Click outside the dialog closes it

### Lessons Learned Timeline
- [ ] Lists every day with a saved note, newest first
- [ ] Each entry: date · net P/L badge · trade count · full note text
- [ ] Per-row delete works
- [ ] Empty state shows the BookOpen icon and the prompt to click a calendar day

### Date-Range Report
- [ ] 8 stat cards: Net P/L · Total Trades · Wins (with win-rate %) · Losses · Best Day · Worst Day · Breakeven · Avg / Trade
- [ ] Numbers update in lockstep with the Equity Curve when the Reporting Window changes

---

## Backup Round-Trip Test

1. Run the app, add 2 active trades, close 1, write a note for today.
2. Click **Export Backup**.
3. Open DevTools → Application → Local Storage → clear all `calculatemywin_*` keys.
4. Reload the page — confirm everything is empty / reset.
5. Click **Import Backup**, select the file you exported, confirm the overwrite.
6. Verify: open active trade, today's closed trade, daily profit total, journal note all reappear without a manual page reload.

---

## Persistence & Edge Cases

- [ ] All 5 storage slices survive a full page reload
- [ ] `dailyProfit` increments past `goal.max` (no cap)
- [ ] Removing the active ticker moves "active" to the first remaining
- [ ] Network failures fall back to mock data gracefully
- [ ] No crashes with empty inputs, zero values, or negative values
- [ ] Calendar / chart use local-browser time (date keys are `YYYY-MM-DD` in local TZ)

---

## Console Debugging

- [ ] Successful fetches log info-level lines
- [ ] Failed fetches log warnings, then fall back to the next source
- [ ] Console message confirms which source produced the rendered chart per ticker
- [ ] If `VITE_FINNHUB_API_KEY` is missing, console clearly notes that

---

## Quick Smoke Sequence (~2 min)

1. Open the app — verify AAPL loads with `Live · …` badge.
2. Switch to **Daily Goal & Risk Manager** — add a position (e.g. AAPL · 10 sh · $100).
3. Click **Report Sale** at $110 — confirm the daily total grows by $100.
4. Switch to **Journal & Reports** — verify the calendar cell for today is green and the Equity Curve has a point.
5. Click today's calendar cell, write a short note, save.
6. Click **Export Backup** — confirm the file downloads.
7. Clear `localStorage` and reload.
8. Click **Import Backup**, pick the file, confirm.
9. Verify the trade, note, and chart all reappear without a manual refresh.

If all 9 steps pass, the app is healthy.
