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

## Tab 1 — Live Dashboard (Watchlist & Market Monitor)

### Watchlist
- [ ] `+ Add stock` adds a new empty ticker
- [ ] Typing `NVDA` and pressing Load fetches and renders the chart
- [ ] Each ticker has 7 working range tabs: `10m / 1h / 3h / 1d / 1w / 1mo / 1y`
- [ ] Clicking a range refetches just that ticker
- [ ] All loaded tickers refresh every 15 seconds
- [ ] X button removes a ticker (only when more than one exists)
- [ ] Removing the last ticker leaves a fresh empty one
- [ ] "Set active" puts the emerald ring on a ticker

### Charts
- [ ] Green stroke + gradient fill when price is up; red when down
- [ ] X-axis labels formatted appropriately for the range
- [ ] Tooltip on hover shows formatted price
- [ ] No dots on the line; activeDot only on hover

### OHLC Stats
- [ ] Each ticker displays Open / High / Low / Prev Close

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
- [ ] The file contains `version`, `exportedAt`, `app`, and a `data` object with all four slices (activeTrades, completedTrades, dailyGoal, dailyJournalNotes)
- [ ] **Import Backup** opens a file picker
- [ ] Selecting a non-JSON or malformed file shows the alert *"Invalid backup file format."*
- [ ] Selecting a valid backup prompts a confirmation before overwriting
- [ ] After confirming, the calendar / chart / Active Positions / banners all repopulate **without a manual page refresh**
- [ ] The success chip flashes briefly with the count of restored sections
- [ ] Legacy storage keys (e.g., `calculatemywin_simulations`) are purged on boot and after restore

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

### Log Historical Trade Form
- [ ] Panel header has a "New entry" button that toggles the form
- [ ] When collapsed, subtitle says "Click New entry to add it for any past day"
- [ ] When expanded, form displays: Date Picker (max = today) / Symbol / Shares / Avg Buy Price / Avg Sell Price
- [ ] "Calculated P/L" preview updates live as you type
- [ ] Submit inserts the trade into `completedTrades` with timestamp at noon local on the chosen day
- [ ] Success banner shows: "Trade logged successfully for [date] · +$X" (auto-dismiss after 4s)
- [ ] The calendar cell for that day immediately updates (color, total)
- [ ] The Monthly Summary Banner recalculates
- [ ] The Equity Curve shifts to include the new point
- [ ] Validation errors display: "Pick a trade date", "Stock symbol is required", "Shares must be a positive number", etc.

### Performance Calendar (monthly)
- [ ] `grid-cols-7` layout with Sun → Sat headers
- [ ] Prev / Today / Next month navigation works
- [ ] Each cell shows the day number + that day's net P/L + trade count
- [ ] Days with net > 0 are green-tinted, < 0 are red-tinted, breakeven gray
- [ ] Today's cell has an emerald ring
- [ ] Days with a saved note show the amber pencil icon
- [ ] Clicking any cell opens the Daily Management Console Modal

### Monthly Summary Banner
- [ ] Shows month label, net P/L (color-coded), total trades, and active days
- [ ] Color tone (emerald / red / neutral) matches the sign of net P/L
- [ ] Recomputes instantly when a trade is added/edited/deleted

### Daily Management Console Modal

#### Header
- [ ] Shows the long date (e.g., "Wed, May 30, 2026")
- [ ] Shows live net P/L + trade count + W/L breakdown (recomputed from that day's trades)
- [ ] X button closes the modal

#### Tab: Notes
- [ ] Tab button shows "Notes" with a NotebookPen icon
- [ ] Textarea is seeded with any existing note
- [ ] Save Note persists to `localStorage`; the day's pencil icon appears in the calendar
- [ ] "Update Note" / "Save Note" button (disabled when text is unchanged)
- [ ] Delete Note removes the entry
- [ ] Close button closes the modal without requiring a save

#### Tab: Show Details
- [ ] Tab button shows "Show Details (X)" where X is the trade count for that day
- [ ] Displays a scrollable list (`max-h-[60vh]`) of all trades logged on that day, sorted newest first
- [ ] Each row shows: Symbol / Shares / Buy → Sell / P/L (color-coded green/red)
- [ ] Empty state shows "No trades logged for this day. Use the 'Log Historical Trade' form to backfill one."

##### Edit Flow
- [ ] Clicking the pencil icon turns the row into inline inputs: Symbol / Shares / Buy Price / Sell Price
- [ ] "New P/L" preview updates live
- [ ] Save calls `updateCompletedTrade` — the trade persists, `profitUSD` recalculates
- [ ] Cancel reverts to read-only row
- [ ] Validation errors display: "Symbol is required", "Shares must be > 0", "Buy price must be ≥ 0", etc.
- [ ] After saving, the calendar cell color/total updates immediately
- [ ] The Monthly Summary Banner recalculates
- [ ] The Equity Curve shifts
- [ ] If the edited trade belongs to today, the Daily Goal Tracker updates

##### Delete Flow
- [ ] Clicking the trash icon opens an inline confirmation banner: "Delete NVDA · 100 shares? Are you sure you want to delete this trade log? This will recalculate all historical reports."
- [ ] Confirm calls `deleteCompletedTrade(id)` — the trade is removed
- [ ] Cancel closes the banner
- [ ] After deleting, the calendar cell color/total updates immediately
- [ ] The Monthly Summary Banner recalculates
- [ ] The Equity Curve shifts
- [ ] If the deleted trade belongs to today, the Daily Goal Tracker updates

#### Esc Key Behavior
- [ ] Esc closes the delete confirm banner first
- [ ] Esc exits edit mode next
- [ ] Esc closes the modal last

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

1. Run the app, add 2 active trades, close 1, write a note for today, log 1 historical trade for yesterday.
2. Click **Export Backup**.
3. Open DevTools → Application → Local Storage → clear all `calculatemywin_*` keys.
4. Reload the page — confirm everything is empty / reset.
5. Click **Import Backup**, select the file you exported, confirm the overwrite.
6. Verify: 2 active trades, today's closed trade, yesterday's historical trade, daily profit total, journal note, equity curve all reappear without a manual page reload.

---

## Retroactive Trade Entry & Editing

1. Go to **Journal & Reports** → Click "New entry" in the **Log Historical Trade** panel.
2. Pick a past date (e.g., 3 days ago), enter AAPL / 50 / 140.00 / 145.00.
3. Submit — confirm the success banner appears with the correct date and P/L.
4. Navigate the calendar to that date's month — confirm the cell is green and shows the correct net P/L.
5. Click that day in the calendar → switch to **Show Details** tab.
6. Confirm the trade appears with AAPL / 50 / $140 → $145 / +$250.00.
7. Click the pencil icon → edit Shares to 100, Buy to 141.00, Sell to 146.00.
8. Confirm "New P/L" preview shows +$500.00.
9. Save — confirm the calendar cell and monthly banner update immediately.
10. Switch to the Equity Curve — confirm the point for that date shifted.
11. Click the trash icon → confirm → confirm the trade is deleted.
12. Verify the calendar cell for that day turns gray, the monthly banner recalculates, and the equity curve point is removed.

---

## Persistence & Edge Cases

- [ ] All 4 storage slices survive a full page reload
- [ ] `dailyProfit` increments past `goal.max` (no cap)
- [ ] Removing the active ticker moves "active" to the first remaining
- [ ] Network failures fall back to mock data gracefully
- [ ] No crashes with empty inputs, zero values, or negative values
- [ ] Calendar / chart use local-browser time (date keys are `YYYY-MM-DD` in local TZ)
- [ ] Historical trade form anchors timestamps at noon local to avoid timezone drift
- [ ] Editing a trade recalculates `profitUSD` automatically
- [ ] Deleting a trade cascades to calendar, chart, goal banner, and all reports

---

## Console Debugging

- [ ] Successful fetches log info-level lines
- [ ] Failed fetches log warnings, then fall back to the next source
- [ ] Console message confirms which source produced the rendered chart per ticker
- [ ] If `VITE_FINNHUB_API_KEY` is missing, console clearly notes that
- [ ] On app boot, legacy storage keys (e.g., `calculatemywin_simulations`) are purged
- [ ] On backup restore, legacy storage keys are purged again

---

## Quick Smoke Sequence (~3 min)

1. Open the app — verify AAPL loads with `Live · …` badge.
2. Switch to **Daily Goal & Risk Manager** — add a position (e.g. AAPL · 10 sh · $100).
3. Click **Report Sale** at $110 — confirm the daily total grows by $100.
4. Switch to **Journal & Reports** — verify the calendar cell for today is green and the Equity Curve has a point.
5. Click today's calendar cell → **Tab: Notes** → write a short note, save.
6. Switch to **Tab: Show Details** → verify the trade appears → click pencil icon → edit Shares to 20, Sell to 115.
7. Save — confirm the calendar cell, monthly banner, and equity curve all update.
8. Click **Log Historical Trade** → pick yesterday → enter NVDA / 5 / 200.00 / 210.00.
9. Submit — navigate calendar to yesterday's cell — confirm it's green with +$50.
10. Click **Export Backup** — confirm the file downloads.
11. Clear `localStorage` and reload.
12. Click **Import Backup**, pick the file, confirm.
13. Verify the active trade, today's + yesterday's closed trades, note, and chart all reappear without a manual refresh.

If all 13 steps pass, the app is healthy.
