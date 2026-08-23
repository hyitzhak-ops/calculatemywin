import { motion } from 'framer-motion';
import { DollarSign, TrendingUp } from 'lucide-react';
import { useProfit } from './ProfitContext';
import { MAX_PROFIT, MIN_PROFIT } from './anchorsData';

export default function ProfitSlider() {
  const { profitUSD, profitILS, setProfitUSD } = useProfit();

  const percent = ((profitUSD - MIN_PROFIT) / (MAX_PROFIT - MIN_PROFIT)) * 100;

  return (
    <section className="py-2">
      <div className="rounded-2xl border border-[#334155] bg-[#1e293b] p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-2 text-slate-300">
          <TrendingUp size={18} className="text-[#10b981]" />
          <h2 className="text-base font-semibold sm:text-lg">
            כמה רווח יש לך פתוח כרגע?
          </h2>
        </div>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <motion.span
              key={profitUSD}
              initial={{ scale: 0.92, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="flex items-center text-4xl font-extrabold text-[#10b981] sm:text-5xl"
            >
              <DollarSign size={30} className="ms-1" />
              {profitUSD.toLocaleString()}
            </motion.span>
            <span className="text-lg text-slate-500">≈</span>
            <span className="text-2xl font-bold text-slate-200 sm:text-3xl">
              {profitILS.toLocaleString()} ₪
            </span>
          </div>

          <input
            type="number"
            min={MIN_PROFIT}
            max={MAX_PROFIT}
            step={10}
            value={profitUSD}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!Number.isNaN(value)) {
                setProfitUSD(Math.min(MAX_PROFIT, Math.max(MIN_PROFIT, value)));
              }
            }}
            className="w-28 rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-left text-lg font-semibold text-slate-100 focus:border-[#10b981] focus:outline-none"
            aria-label="הזנת סכום רווח בדולרים"
          />
        </div>

        <input
          type="range"
          className="reality-anchor-slider"
          min={MIN_PROFIT}
          max={MAX_PROFIT}
          step={10}
          value={profitUSD}
          onChange={(e) => setProfitUSD(Number(e.target.value))}
          aria-label="סליידר רווח"
        />

        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>${MIN_PROFIT.toLocaleString()}</span>
          <span className="hidden text-slate-400 sm:inline">{Math.round(percent)}% מהטווח</span>
          <span>${MAX_PROFIT.toLocaleString()}</span>
        </div>
      </div>
    </section>
  );
}
