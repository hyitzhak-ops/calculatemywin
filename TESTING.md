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

### Charts (Core)
- [ ] Green stroke + gradient fill when price is up; red when down
- [ ] X-axis labels formatted appropriately for the range
- [ ] Tooltip on hover shows formatted price
- [ ] No dots on the line; activeDot only on hover

### Pre-Market Analytics
- [ ] **Pre-Market High/Low reference lines** appear on intraday charts (`10m / 1h / 3h / 1d`) when the stock had pre-market activity
- [ ] PM High line is dashed emerald with `PM High $X.XX` label
- [ ] PM Low line is dashed red with `PM Low $Y.YY` label
- [ ] Reference lines are NOT shown on `1w / 1mo / 1y` ranges
- [ ] **Gap pill** displays: green tint for positive gap, red for negative, format `Gap +4.2% (+$2.10)`
- [ ] **Pre-Market range pill** shows `Pre-Mkt: H $X · L $Y` with emerald H + red L
- [ ] Both pills hide gracefully when the data isn't available

### SPY Market Correlation Overlay
- [ ] Low-opacity dashed gray line appears on the chart for non-SPY tickers
- [ ] Right-side %-axis labels the overlay in percentage terms
- [ ] Inline legend below the chart: `SPY · % since open (relative strength)`
- [ ] When the active ticker IS `SPY`, no overlay is drawn (skipped automatically)
- [ ] Tooltip on hover shows both `Price` and `SPY since open` rows

### Volatility Alert System
- [ ] After loading a stock, wait through a few 15s polling cycles
- [ ] When you simulate or witness a >2% price move within ~3 minutes, the chart container gets:
  - [ ] Animated `volatilityPulse` ring (amber, 1.4s pulse)
  - [ ] Corner badge: `⚠️ HIGH VOLATILITY · ±X.XX% in Ys` (amber background, alert triangle icon)
- [ ] Alert auto-dismisses after 8 seconds
- [ ] Alert resets when you change the symbol
- [ ] No alert fires on stable stocks within the 2% threshold

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

### Add Position Form — Risk-Based Sizing

#### Form Fields
- [ ] Form has 5 fields: Symbol · Buy Price · Stop-Loss Price · Max Account Risk · Number of Shares
- [ ] Layout is 2-column on `lg+` (form left, sizing card right)

#### Automated Share Calculation
- [ ] With Buy `$180`, Stop `$178.50`, Max Risk `$150` → Shares auto-fills to `100`
- [ ] Formula: `floor(maxRisk / (buyPrice − stopLoss))`
- [ ] If you manually edit Shares, future auto-fills do NOT overwrite your value
- [ ] "Reset to recommended (X)" link appears next to the Shares label after manual edit
- [ ] Clicking it snaps Shares back to the recommendation

#### Validation
- [ ] If Stop ≥ Buy, inline red helper triggers: *"Stop-loss must be below buy price"*
- [ ] Recommendation is suppressed when validation fails
- [ ] Sizing card collapses to placeholder when not all 3 inputs (Buy/Stop/MaxRisk) are valid

#### Sizing Card (Right Rail)
- [ ] **Recommended Shares** — large bold integer in emerald-bordered card
- [ ] **Risk per share** sub-line shows `buyPrice − stopLoss`
- [ ] **Total Capital Required** — `shares × buyPrice` with multiplication breakdown
- [ ] **If stop hits** — actual realized loss based on current shares, in red
- [ ] **Under budget by** — leftover from rounding shares down (always ≤ Max Risk)

### Stop-Loss Scenario Matrix (Planning Preview)
- [ ] **Empty state** — dashed border with "Enter Symbol & Buy Price to preview stop-loss scenarios" appears when fields are empty
- [ ] **Activates** the moment Symbol + Buy Price are both valid
- [ ] Renders 4 tiers: −5%, −10%, −15%, −20%
- [ ] Stop Price column = `buyPrice × (1 − tier)`
- [ ] $/share column = `buyPrice − stopPrice`
- [ ] **Without Max Risk**: Shares + Capital columns are hidden, footer hint appears
- [ ] **With Max Risk**: Shares column = `floor(maxRisk / (buyPrice − stopPrice))`, Capital column = `shares × buyPrice`
- [ ] **`[Use this]` button** writes the tier's stop price into the form's Stop-Loss field with `.toFixed(2)`
- [ ] Clicking `Use this` re-enables share auto-fill (Shares input refreshes from new tier)
- [ ] **Active tier highlight** — when current Stop-Loss matches a tier (within ±$0.005), that row turns emerald and button reads `Armed`
- [ ] Visual style uses muted `slate-300/400` palette (distinct from active-trade matrices)

### Active Position Cards
For each open trade:
- [ ] Header shows symbol badge, shares, buy price, total cost
- [ ] If trade was opened with stop-loss, header shows `Planned stop $X · risk $Y` (red icon, small font)
- [ ] **Profit Targets matrix (left, green-tinted)** lists 4 tiers (5/10/15/20%) with target price, total value, net profit
- [ ] **Stop-Loss Thresholds matrix (right, red-tinted)** lists the same tiers downside with stop price, total value, net loss
- [ ] On `lg` screens the two columns sit side-by-side; on small screens they stack
- [ ] **Report Sale** opens a sell-price input + Strategy/Catalyst dropdown
- [ ] Strategy dropdown options: `— Untagged —` / `Pre-market Gainer` / `Earnings Report` / `Support Bounce` / `FOMO / Emotional` / `Other`
- [ ] Live realized P/L preview updates as you type the sell price
- [ ] Confirming the sale moves the trade to Today's Closed Trades, updates Daily Realized Profit, and persists the chosen catalyst
- [ ] **Discard (X)** removes a position without recording a sale

### Today's Closed Trades Table
- [ ] Columns: Symbol / Shares / Buy / Sell / Profit / When
- [ ] Profit column color-coded green / red
- [ ] "Clear all" wipes the day's closed trades

---

## Tab 3 — Journal & Reports

### Backup & Restore Panel (top of tab + global header)
- [ ] **Export Backup** downloads `trading_dashboard_backup_YYYY-MM-DD.json`
- [ ] The file contains `version`, `exportedAt`, `app`, and a `data` object with all four slices
- [ ] **Import Backup** opens a file picker
- [ ] Selecting a non-JSON or malformed file shows the alert *"Invalid backup file format."*
- [ ] Selecting a valid backup prompts a confirmation before overwriting
- [ ] After confirming, the calendar / chart / Active Positions / banners all repopulate **without a manual page refresh**
- [ ] The success chip flashes briefly with the count of restored sections
- [ ] Legacy storage keys (e.g., `calculatemywin_simulations`) are purged on boot and after restore

### Reporting Window (Shared Filter)
- [ ] Five preset chips: Today / This Week / This Month / This Quarter / Custom
- [ ] Selecting Custom reveals two `<input type="date">` fields with `min`/`max` wired together
- [ ] Subtitle reflects the resolved range
- [ ] Changing the filter immediately updates BOTH the Equity Curve and the Date-Range Report below

### Equity Curve Chart
- [ ] Renders a smooth `monotone` cumulative-P/L area
- [ ] Stroke is emerald when net is positive; red when net is negative
- [ ] Linear gradient fades the fill toward transparent at the bottom
- [ ] `y=0` reference line is visible
- [ ] Hovering a point shows the custom tooltip with **Date · Cumulative · Growth % · Day P/L · Trades**
- [ ] **Summary cards**: Peak Equity, Max Drawdown, Max Daily Win, Max Daily Loss — each with the date it occurred
- [ ] Empty state shows when the window has no data

### Gold Statistics Panel
- [ ] **Win Rate card** — large bold percentage. Color: ≥50% emerald, ≥33% amber, <33% red. Sub-line shows `XW · YL` (and BE count if any).
- [ ] **Profit Factor card** — `grossProfit / grossLoss`. Renders `N/A` when no losses, `∞` when only wins, otherwise to 2 decimals. Tier-colored at 1.5 / 1.0 thresholds. Sub-line shows the actual division.
- [ ] **Avg Win card** — emerald `+$X.XX`. Sub-line: `X.XX× avg loss` (win/loss ratio).
- [ ] **Avg Loss card** — red `−$Y.YY`. Sub-line: `Expectancy ±$Z / trade` (color-matched to sign).
- [ ] Empty state when zero closed trades: "Close a trade to start tracking your edge."

### Edge Finder Panel
- [ ] When zero trades have catalysts: shows hint about tagging trades
- [ ] When tagged trades exist:
  - [ ] **🟢 "Your Edge" callout** appears for the catalyst with the highest net positive P/L
  - [ ] **🔴 "Risk Warning" callout** appears for the most negative net P/L (only when actually negative AND different from the best)
  - [ ] **Strategy table** lists every catalyst (incl. "Untagged" if any) sorted by Net P/L
  - [ ] Each row: catalyst name / count / win rate / W/L / Net P/L
  - [ ] Win Rate cell color-tiered (green/amber/red)
  - [ ] Net P/L cell color-coded by sign
  - [ ] Untagged row dimmed at 60% opacity

### Log Historical Trade Form
- [ ] Panel header has a "New entry" button that toggles the form
- [ ] When expanded, form displays 6 columns on `lg+`: Date / Symbol / Shares / Buy / Sell / Strategy
- [ ] Strategy dropdown matches the close form's options
- [ ] "Calculated P/L" preview updates live
- [ ] Submit inserts the trade into `completedTrades` (with optional `catalyst`) at noon local on the chosen day
- [ ] Success banner: "Trade logged successfully for [date] · +$X" (auto-dismiss after 4s)
- [ ] Calendar cell, Monthly Summary, Equity Curve, Gold Stats, Edge Finder all update

### Performance Calendar (Monthly)
- [ ] `grid-cols-7` layout with Sun → Sat headers
- [ ] Prev / Today / Next month navigation works
- [ ] Each cell shows the day number + that day's net P/L + trade count
- [ ] Color-coded green / red / gray
- [ ] Today's cell has an emerald ring
- [ ] Days with a saved note show the amber pencil icon
- [ ] Clicking any cell opens the Daily Management Console Modal

### Daily Management Console Modal

#### Header
- [ ] Long date label (e.g., "Wed, May 30, 2026")
- [ ] Live net P/L + trade count + W/L breakdown (recomputed from that day's trades)
- [ ] X button closes the modal

#### Tab: Notes
- [ ] Textarea seeded with any existing note
- [ ] Save Note persists; pencil icon appears on the calendar cell
- [ ] "Update Note" / "Save Note" button (disabled when text is unchanged)
- [ ] Delete Note removes the entry without closing the modal

#### Tab: Show Details
- [ ] Tab button shows "Show Details (X)" with that day's trade count
- [ ] Empty state: "No trades logged for this day."
- [ ] Each row shows: Symbol / Shares / Buy → Sell / P/L (color-coded) / Strategy chip (when set)

##### Edit Flow
- [ ] Pencil icon turns the row into 5 inline inputs: Symbol / Shares / Buy / Sell / Strategy
- [ ] "New P/L" preview updates live
- [ ] Save calls `updateCompletedTrade` — the trade persists, `profitUSD` recalculates
- [ ] Catalyst can be set, changed, or cleared (`— Untagged —`)
- [ ] Cancel reverts to read-only row
- [ ] Validation: "Symbol is required", "Shares must be > 0", etc.
- [ ] After saving: calendar cell, monthly banner, equity curve, Gold Stats, Edge Finder all update

##### Delete Flow
- [ ] Trash icon opens an inline confirmation banner
- [ ] Confirm calls `deleteCompletedTrade(id)`
- [ ] Cancel closes the banner
- [ ] After deleting: calendar cell, monthly banner, equity curve, Gold Stats, Edge Finder all update

#### Esc Key Behavior
- [ ] Esc closes the delete confirm banner first
- [ ] Esc exits edit mode next
- [ ] Esc closes the modal last

### Lessons Learned Timeline
- [ ] Lists every day with a saved note, newest first
- [ ] Each entry: date · net P/L badge · trade count · full note text
- [ ] Per-row delete works
- [ ] Empty state shows the BookOpen icon

### Date-Range Report
- [ ] 8 stat cards: Net P/L · Total Trades · Wins (with win-rate %) · Losses · Best Day · Worst Day · Breakeven · Avg / Trade
- [ ] Numbers update in lockstep with the Equity Curve when the Reporting Window changes

---

## Backup Round-Trip Test

1. Run the app, add 2 active trades (one with stop-loss + max risk, one without), close 1 with a catalyst, write a note for today, log 1 historical trade for yesterday with a catalyst.
2. Click **Export Backup**.
3. Open DevTools → Application → Local Storage → clear all `calculatemywin_*` keys.
4. Reload the page — confirm everything is empty / reset.
5. Click **Import Backup**, select the file you exported, confirm the overwrite.
6. Verify: 1 active trade with planned stop, today's closed trade with catalyst, yesterday's historical trade with catalyst, daily profit, journal note, equity curve, **Gold Stats**, **Edge Finder** all reappear without a manual page reload.

---

## Risk-Based Sizing & Scenario Matrix Walkthrough

1. **Tab 2** → Click "+ Add Position".
2. Type `AAPL` in Symbol → confirm Stop-Loss Scenario Matrix shows empty state.
3. Type `180` in Buy Price → confirm matrix activates with 4 tiers (Stop Prices: $171, $162, $153, $144).
4. Type `150` in Max Account Risk → confirm Shares + Capital columns appear.
   - Tier −5%: 16 shares · $2,880
   - Tier −10%: 8 shares · $1,440
   - Tier −15%: 5 shares · $900
   - Tier −20%: 3 shares · $540
5. Click `Use this` on the −5% row → confirm:
   - Stop-Loss field populates with `171.00`
   - Sizing card on the right shows: 16 shares · $2,880 capital · −$144 if stop hits · under budget by $6
   - The −5% row now shows `Armed` button (emerald background)
6. Manually change Shares to `10` → confirm "Reset to recommended (16)" link appears.
7. Click "Reset to recommended" → Shares snaps back to 16.
8. Type `185` in Stop-Loss → confirm red helper "Stop-loss must be below buy price" appears, sizing card collapses.
9. Fix Stop-Loss back to `171` → confirm card returns.
10. Submit. Active Position card header should show `Planned stop $171.00 · risk $144.00`.

---

## Edge Analytics & Catalyst Tagging Walkthrough

1. Make sure you have at least 5 closed trades with mixed P/L.
2. Tag them via:
   - Risk Manager → Report Sale → catalyst dropdown
   - Journal → Log Historical Trade → Strategy column
   - Journal → Click any calendar day → Show Details tab → pencil icon → Strategy field
3. Make at least 2 of them tagged `Pre-market Gainer` and ≥1 of them positive.
4. Make ≥1 tagged `FOMO / Emotional` and negative.
5. Verify **Gold Statistics**:
   - Win Rate matches `wins / total × 100`
   - Profit Factor matches `grossProfit / grossLoss` (or shows ∞ / N/A appropriately)
   - Avg Win and Avg Loss are correct
   - Expectancy sub-line is signed correctly
6. Verify **Edge Finder**:
   - 🟢 "Your Edge" callout names the catalyst with the highest net + amount
   - 🔴 "Risk Warning" callout names the catalyst with the most negative net + warning
   - Strategy table is sorted by Net P/L
7. Edit a trade in the Daily Modal → change its catalyst → confirm Gold Stats and Edge Finder update instantly.
8. Delete a trade → confirm the same.

---

## Persistence & Edge Cases

- [ ] All 4 storage slices survive a full page reload
- [ ] `dailyProfit` increments past `goal.max` (no cap)
- [ ] Removing the active ticker moves "active" to the first remaining
- [ ] Network failures fall back to mock data gracefully
- [ ] Pre-market lines & SPY overlay disappear gracefully when fallback to mock data
- [ ] No crashes with empty inputs, zero values, or negative values
- [ ] Calendar / chart use local-browser time (date keys are `YYYY-MM-DD` in local TZ)
- [ ] Pre-market candle filtering uses `America/New_York` timezone (correct regardless of user TZ)
- [ ] Historical trade form anchors timestamps at noon local to avoid timezone drift
- [ ] Editing a trade recalculates `profitUSD` automatically
- [ ] Deleting a trade cascades to calendar, chart, goal banner, all reports, Gold Stats, Edge Finder
- [ ] Optional fields (`stopLoss`, `riskBudget`, `catalyst`) on existing storage data don't break loading

---

## Console Debugging

- [ ] Successful fetches log info-level lines for both ticker AND SPY overlay
- [ ] Failed fetches log warnings, then fall back to the next source
- [ ] Console message confirms which source produced the rendered chart per ticker
- [ ] If `VITE_FINNHUB_API_KEY` is missing, console clearly notes that
- [ ] On app boot, legacy storage keys (e.g., `calculatemywin_simulations`) are purged
- [ ] On backup restore, legacy storage keys are purged again

---

## Quick Smoke Sequence (~5 min)

1. Open the app — verify AAPL loads with `Live · …` badge.
2. **Tab 1**: Verify Gap pill, PM range pill, dashed PM High/Low lines on the chart, and dashed gray SPY overlay with right-side %-axis.
3. **Tab 2**: Click "+ Add Position" → enter AAPL, $180, $171, $150 → confirm Scenario Matrix, click `Use this` on −5% → confirm Shares=16 → Submit.
4. Click **Report Sale** at $185 → pick "Pre-market Gainer" catalyst → Confirm.
5. **Tab 3**: Verify the calendar cell for today is green and the Equity Curve has a point.
6. Verify **Gold Statistics** shows 100% Win Rate, ∞ Profit Factor, and the correct numbers.
7. Verify **Edge Finder** highlights `Pre-market Gainer` as your edge.
8. Click today's calendar cell → **Tab: Show Details** → pencil icon → change catalyst to "FOMO / Emotional" → Save.
9. Confirm Edge Finder now shows the new catalyst attribution.
10. Click **Log Historical Trade** → backfill yesterday with NVDA / 5 / 200 / 195 / "FOMO / Emotional" → Submit.
11. Confirm yesterday's calendar cell turns red and Edge Finder now shows a "Risk Warning" callout.
12. Click **Export Backup** — confirm the file downloads.
13. Clear `localStorage` and reload.
14. Click **Import Backup**, pick the file, confirm.
15. Verify everything reappears without a manual refresh.

If all 15 steps pass, the app is healthy.
