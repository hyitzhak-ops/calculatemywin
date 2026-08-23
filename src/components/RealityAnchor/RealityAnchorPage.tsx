import { ProfitProvider } from './ProfitContext';
import Header from './Header';
import IronRulesBanner from './IronRulesBanner';
import ProfitSlider from './ProfitSlider';
import RealityAnchorGrid from './RealityAnchorGrid';
import ScaleOutCalculator from './ScaleOutCalculator';

export function RealityAnchorPage() {
  return (
    <ProfitProvider>
      <div
        dir="rtl"
        className="-mx-3 -my-4 rounded-2xl bg-[#0f172a] text-slate-100 sm:-mx-6 sm:-my-6"
        style={{ fontFamily: "'Heebo', 'Assistant', 'Inter', system-ui, sans-serif" }}
      >
        <Header />
        <div className="flex flex-col gap-2 pb-4">
          <IronRulesBanner />
          <ProfitSlider />
          <RealityAnchorGrid />
          <ScaleOutCalculator />
        </div>
        <footer className="border-t border-[#334155] px-4 py-6 text-center text-xs text-slate-500">
          עוגן המציאות למסחר · המספרים על המסך הם דברים אמיתיים — תממש בזמן.
        </footer>
      </div>
    </ProfitProvider>
  );
}
