import { ProfitProvider } from './ProfitContext';
import { RealizationsProvider } from './RealizationsContext';
import Header from './Header';
import IronRulesBanner from './IronRulesBanner';
import ProfitSlider from './ProfitSlider';
import RealityAnchorGrid from './RealityAnchorGrid';
import RealizationsSummary from './RealizationsSummary';
import ScaleOutCalculator from './ScaleOutCalculator';

export function RealityAnchorPage() {
  return (
    <ProfitProvider>
      <RealizationsProvider>
        <div
          dir="rtl"
          className="-mx-3 -my-4 rounded-2xl bg-[#0f172a] text-slate-100 sm:-mx-6 sm:-my-6"
          style={{ fontFamily: "'Heebo', 'Assistant', 'Inter', system-ui, sans-serif" }}
        >
          <Header />
          <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start">
            <aside className="lg:sticky lg:top-4 lg:w-80 lg:flex-shrink-0">
              <RealizationsSummary />
            </aside>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <IronRulesBanner />
              <ProfitSlider />
              <RealityAnchorGrid />
              <ScaleOutCalculator />
            </div>
          </div>
          <footer className="border-t border-[#334155] px-4 py-6 text-center text-xs text-slate-500">
            עוגן המציאות למסחר · המספרים על המסך הם דברים אמיתיים — תממש בזמן.
          </footer>
        </div>
      </RealizationsProvider>
    </ProfitProvider>
  );
}
