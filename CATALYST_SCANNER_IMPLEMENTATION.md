# Catalyst, FDA Pipeline, & Sentiment Scanner Implementation

## Overview
Advanced intelligence engine integrated into the "+ Add Position" form that scans 60 days of news headlines to identify strategic trading opportunities across three specialized buckets.

## Architecture

### Core Service: `catalystScannerService.ts`
Located at: `src/services/catalystScannerService.ts`

**Purpose:** Classify market catalysts and detect overreaction opportunities specific to:
- Biotech companies experiencing market crashes despite strong secondary pipelines
- Corporate M&A, partnerships, and strategic deals
- AI transformation/pivot announcements

### Three Intelligence Buckets

#### 🧬 Bucket 1: Biotech & FDA Pipeline Intelligence
**Keywords Scanned:**
- **Negative signals:** Phase 1/2/3 failure, CRL, FDA rejection, trial halted, discontinued, safety concerns
- **Positive signals:** FDA approval, met primary endpoint, positive data, efficacy, breakthrough therapy, successful trial

**Special Logic: Biotech Bounce Setup Detection**
- Triggers when: Major crash detected (negative keywords) AND active secondary pipeline (positive keywords)
- Displays: 🔵 "Biotech Bounce Setup" badge with "Medium-Risk with Asymmetric Upside" classification
- Impact: Highlights potential overreaction plays where market punished entire company for single asset failure

#### 🟢 Bucket 2: Corporate M&A, Deals & Partnerships
**Keywords Scanned:**
- Acquisition, merger, strategic partnership, joint venture, licensing agreement
- Million/billion contract, collaboration, supply agreement, distribution agreement

**Impact on Risk Score:**
- Each detected deal: -1 to risk score (capped at -2 for multiple deals)
- Logic: Strategic deals = institutional backing = safer play

#### ⚡ Bucket 3: AI Momentum Tracker
**Keywords Scanned:**
- Artificial intelligence, AI integration, generative AI, machine learning, LLM
- AI platform, AI-powered, ChatGPT, OpenAI, Anthropic, NVIDIA partnership

**Impact on Risk Score:**
- AI momentum detected: -1 to risk score
- Logic: AI hype drives retail volume and positive sentiment

## UI Integration

### Location
Integrated into `RiskManagerTab.tsx` → `AddTradeForm` component
- Appears below the Corporate Risk Assessment panel
- Auto-triggers 600ms after symbol entry (same debounce as risk scanner)

### Visual Design

#### Main Panel
- **Border:** Blue gradient with 30% opacity
- **Background:** Blue with 5% opacity
- **Icon:** Zap (⚡) in blue
- **Header:** "Catalyst & Edge Intelligence"

#### Risk Impact Display
When catalysts affect risk score:
```
Risk Impact: -2 (safer)
Strategic corporate catalyst detected (2) → risk reduced by 2
```

#### Biotech Overreaction Alert
Special blue-gradient card with:
- 🔵 Icon badge
- Title: "Biotech Bounce Setup Detected"
- Explanation of crash vs. pipeline strength
- Keyword breakdown (crash keywords vs. pipeline strength keywords)
- Badge: "Medium-Risk with Asymmetric Upside"

#### Bucket Sections
Each bucket displays as collapsible section:
- Purple theme for Biotech
- Green theme for Corporate Deals
- Yellow theme for AI Momentum

Each event shows:
- Sentiment icon (✅ positive, 🔴 negative, ⚪ neutral)
- Signal type (e.g., "STRATEGIC CATALYST")
- Days ago
- Source
- Headline (2-line clamp)
- Auto-generated detail/explanation
- External link to source article

### Expandable Lists
- Shows 3 events by default
- "Show X more" button to expand full list
- "Show less" to collapse back

## Risk Score Adjustment Logic

### Formula
```typescript
adjustment = 0
- Strategic deals detected: adjustment -= min(count, 2)  // Cap at -2
- AI momentum detected: adjustment -= 1
- Biotech overreaction: No adjustment (flagged separately)
adjustment = clamp(adjustment, -3, +3)
```

### Integration with Corporate Risk Scanner
The adjustment is **advisory only** — the score is displayed but does not automatically modify the Corporate Risk Scanner score. This maintains separation of concerns while providing actionable intelligence.

## Data Flow

1. **User types symbol** → 600ms debounce timer starts
2. **Fetch news** → Finnhub API `/company-news` (60 days lookback)
3. **Classify articles** → Keyword matching across all three buckets
4. **Detect overreaction** → Cross-reference negative + positive biotech signals
5. **Calculate risk adjustment** → Apply deal/AI momentum logic
6. **Render UI** → Display buckets, badges, and risk impact

## Error Handling
- Missing API key: Shows advisory message, doesn't block form
- Network failure: Shows error message, doesn't block form
- Partial results: Displays what was successfully fetched

## Performance Optimizations
- Debounced scanning (600ms) prevents excessive API calls
- Abort controller cancels in-flight requests when symbol changes
- Skeleton loader during fetch provides smooth UX
- Expandable lists prevent UI clutter

## Example Use Cases

### Case 1: Biotech Overreaction Play
**Symbol:** EXAMPLE
**Scenario:** Company's Phase 3 trial for Drug A fails, stock crashes 85%
**Scanner detects:**
- Negative: "Phase 3 failure", "did not meet primary endpoint" (Drug A)
- Positive: "FDA approval", "successful trial" (Drug B, Drug C still active)
**Alert shown:** 🔵 Biotech Bounce Setup with asymmetric upside badge
**Trader action:** Enter position with tight stop, betting on market overreaction

### Case 2: Strategic M&A Catalyst
**Symbol:** TECH
**Scanner detects:**
- "Strategic partnership with Microsoft announced"
- "$500 million licensing agreement"
**Impact:** Risk score reduced by -2
**Alert shown:** 🟢 "STRATEGIC CATALYST" event
**Trader action:** Enter with confidence due to institutional backing

### Case 3: AI Momentum Play
**Symbol:** CORP
**Scanner detects:**
- "Company announces major AI platform integration"
- "Generative AI deployment across product line"
**Impact:** Risk score reduced by -1
**Alert shown:** ⚡ "AI HYPE/MOMENTUM" event
**Trader action:** Enter expecting retail volume spike

## Technical Notes

### Dependencies
- Finnhub API (same key as Corporate Risk Scanner)
- React hooks: `useState`, `useEffect`, `useRef`
- Tailwind CSS for styling
- Lucide icons

### Browser Compatibility
- Modern browsers supporting ES6+
- Fetch API with AbortController

### Future Enhancements
- Historical catalyst correlation analysis
- Sentiment scoring via NLP
- Price movement correlation to catalyst type
- Machine learning classification beyond keyword matching

## Files Modified/Created

### Created
- `src/services/catalystScannerService.ts` (368 lines)

### Modified
- `src/components/RiskManagerTab.tsx`
  - Added import for catalyst scanner service
  - Added `<CatalystIntelligencePanel>` component (200+ lines)
  - Integrated panel below Corporate Risk Assessment

## Testing Checklist
- ✅ Build passes without errors
- ✅ TypeScript types verified
- ✅ Debounced API calls working
- ✅ Abort controller prevents race conditions
- ✅ UI renders correctly with real data
- ✅ Error states handled gracefully
- ✅ Expandable lists function properly
- ✅ Risk adjustment calculation accurate
- ✅ Biotech overreaction detection logic correct
- ✅ External links open in new tab

## Conclusion
The Catalyst Scanner provides traders with actionable intelligence for identifying:
1. Biotech overreaction opportunities (80-90% crashes with intact secondary pipeline)
2. Strategic value creation events (M&A, partnerships, major contracts)
3. AI momentum plays (pivots and integrations driving retail interest)

All intelligence is **advisory only** — execution remains in the trader's control, with no automated blocking or forced actions.
