import { Anchor, Radio } from 'lucide-react';
import { EXCHANGE_RATE } from './anchorsData';

export default function Header() {
  return (
    <header className="border-b border-[#334155] bg-[#1e293b]/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10 text-[#10b981] shadow-[0_0_0_1px_rgba(34,197,94,0.5),0_0_24px_rgba(34,197,94,0.35)]">
            <Anchor size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-50 sm:text-2xl">
              עוגן המציאות למסחר
            </h1>
            <p className="text-sm text-slate-400">
              Trading Reality Anchor · הפוך רווח על המסך למשהו מוחשי — לפני שהוא נעלם
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-start sm:self-auto">
          <div className="flex items-center gap-2 rounded-full border border-[#10b981]/40 bg-[#10b981]/10 px-3 py-1.5 text-xs font-medium text-[#10b981]">
            <Radio size={14} className="animate-pulse" />
            <span>שער חי: 1$ = {EXCHANGE_RATE.toFixed(2)} ₪</span>
          </div>
        </div>
      </div>
    </header>
  );
}
