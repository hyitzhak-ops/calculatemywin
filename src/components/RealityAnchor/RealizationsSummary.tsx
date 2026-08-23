import { useMemo } from 'react';
import { BarChart3, RotateCcw, Sparkles } from 'lucide-react';
import { allProducts } from './anchorsData';
import { useRealizations } from './RealizationsContext';

export default function RealizationsSummary() {
  const { counts, resetOne } = useRealizations();

  const rows = useMemo(() => {
    const productById = new Map(allProducts.map((p) => [p.id, p]));
    return Object.entries(counts)
      .map(([id, count]) => ({ product: productById.get(id), count }))
      .filter((row): row is { product: NonNullable<typeof row.product>; count: number } => !!row.product && row.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [counts]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          count: acc.count + row.count,
          ils: acc.ils + row.product.priceILS * row.count,
          usd: acc.usd + row.product.priceUSD * row.count,
        }),
        { count: 0, ils: 0, usd: 0 },
      ),
    [rows],
  );

  return (
    <div className="rounded-2xl border border-[#334155] bg-[#1e293b] p-5">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 size={18} className="text-[#10b981]" />
        <h2 className="text-base font-bold text-slate-100">סיכום המימושים שלי</h2>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#334155] bg-[#0f172a]/60 p-3 text-center">
          <p className="text-2xl font-extrabold text-[#10b981]">{totals.count}</p>
          <p className="text-xs text-slate-400">מימושים בסה"כ</p>
        </div>
        <div className="rounded-xl border border-[#334155] bg-[#0f172a]/60 p-3 text-center">
          <p className="text-lg font-extrabold text-slate-100">{totals.ils.toLocaleString()} ₪</p>
          <p className="text-xs text-slate-400">${totals.usd.toLocaleString()} שווי מומש</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#334155] p-6 text-center">
          <Sparkles size={20} className="text-slate-500" />
          <p className="text-sm text-slate-400">
            עדיין לא מימשת אף רווח. לחץ על "קח את זה הביתה עכשיו" בכרטיסייה שמתאימה לך.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ product, count }) => (
            <div
              key={product.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-[#334155] bg-[#0f172a]/40 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{product.name}</p>
                <p className="text-xs text-slate-500">
                  {product.priceILS.toLocaleString()} ₪ × {count} = {(product.priceILS * count).toLocaleString()} ₪
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="rounded-full bg-[#10b981]/10 px-2.5 py-1 text-xs font-bold text-[#10b981]">
                  {count}
                </span>
                <button
                  type="button"
                  onClick={() => resetOne(product.id)}
                  title="אפס מימושים לפריט הזה"
                  className="rounded-md border border-[#334155] p-1.5 text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
