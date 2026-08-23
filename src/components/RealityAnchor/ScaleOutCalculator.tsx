import { Zap, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { useProfit } from './ProfitContext';
import { EXCHANGE_RATE, SCALE_OUT_THRESHOLD, usdToIls } from './anchorsData';

export default function ScaleOutCalculator() {
  const { profitUSD } = useProfit();
  const reachedThreshold = profitUSD >= SCALE_OUT_THRESHOLD;
  const halfUSD = profitUSD / 2;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-8">
      <div className="rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/5 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Zap size={18} className="text-[#f59e0b]" />
          <h2 className="text-base font-bold text-slate-100 sm:text-lg">
            אסטרטגיית מימוש בשלבים (Scale-Out Helper)
          </h2>
        </div>

        {reachedThreshold ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={22} className="mt-0.5 flex-shrink-0 text-[#10b981]" />
              <div>
                <p className="font-bold text-slate-100">
                  הרווח הגיע ל-${profitUSD.toLocaleString()} — מכור 50% מיד ונעל את הרווח!
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  מכירה מיידית של ${halfUSD.toLocaleString()} ({usdToIls(halfUSD).toLocaleString()} ₪) נועלת
                  רווח מובטח.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#0f172a]/60 px-4 py-3">
              <ArrowRightLeft size={18} className="text-[#f59e0b]" />
              <div className="text-sm">
                <p className="font-semibold text-slate-200">50% הנותרים</p>
                <p className="text-slate-400">העבר סטופ ל-Break-Even (מחיר הכניסה)</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            הרווח הנוכחי (${profitUSD.toLocaleString()} / {usdToIls(profitUSD).toLocaleString()} ₪) עדיין מתחת
            לסף המימוש של ${SCALE_OUT_THRESHOLD}. המשך לפי התוכנית — כשתגיע לסף, כאן תופיע הנחיית מימוש 50%.
          </p>
        )}

        <p className="mt-4 text-xs text-slate-500">שער המרה קבוע: 1$ = {EXCHANGE_RATE.toFixed(2)} ₪</p>
      </div>
    </section>
  );
}
