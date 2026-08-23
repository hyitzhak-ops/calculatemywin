import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Lock } from 'lucide-react';
import { anchorTiers } from './anchorsData';
import { useProfit } from './ProfitContext';
import AnchorCard from './AnchorCard';
import type { AnchorTier } from './types';

function distanceToRange(value: number, [min, max]: [number, number]) {
  if (value < min) return min - value;
  if (value > max) return value - max;
  return 0;
}

function useActiveTier(): { tier: AnchorTier; isExactMatch: boolean } {
  const { profitUSD } = useProfit();

  return useMemo(() => {
    let best = anchorTiers[0];
    let bestDistance = distanceToRange(profitUSD, anchorTiers[0].rangeUSD);

    for (const tier of anchorTiers.slice(1)) {
      const distance = distanceToRange(profitUSD, tier.rangeUSD);
      if (distance < bestDistance) {
        best = tier;
        bestDistance = distance;
      }
    }

    return { tier: best, isExactMatch: bestDistance === 0 };
  }, [profitUSD]);
}

function MatchedAnchorsBar({ realizedIds, onRealize }: { realizedIds: Set<string>; onRealize: (id: string) => void }) {
  const { profitUSD } = useProfit();
  const { tier, isExactMatch } = useActiveTier();

  const sortedProducts = useMemo(
    () => [...tier.products].sort((a, b) => Math.abs(a.priceUSD - profitUSD) - Math.abs(b.priceUSD - profitUSD)),
    [tier, profitUSD],
  );

  return (
    <section className="mx-auto max-w-6xl px-4">
      <div className="rounded-2xl border border-[#10b981]/50 bg-gradient-to-b from-[#10b981]/10 to-transparent p-5 shadow-[0_0_0_1px_rgba(34,197,94,0.5),0_0_24px_rgba(34,197,94,0.35)] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#10b981]" />
            <h2 className="text-base font-bold text-slate-100 sm:text-lg">
              {isExactMatch ? 'זה מה שהרווח שלך שווה עכשיו' : 'הכי קרוב לרווח שלך כרגע'}
            </h2>
          </div>
          <span className="text-xs text-slate-500">{tier.products.length} אפשרויות בטווח הזה</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tier.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {sortedProducts.map((product) => (
              <AnchorCard
                key={product.id}
                product={product}
                highlighted
                compact
                realized={realizedIds.has(product.id)}
                onRealize={() => onRealize(product.id)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

export default function RealityAnchorGrid() {
  const { tier: activeTier } = useActiveTier();
  const [realizedIds, setRealizedIds] = useState<Set<string>>(new Set());

  const handleRealize = (id: string) => {
    setRealizedIds((prev) => new Set(prev).add(id));
  };

  return (
    <div className="flex flex-col gap-8">
      <MatchedAnchorsBar realizedIds={realizedIds} onRealize={handleRealize} />

      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="flex flex-col gap-10">
          {anchorTiers.map((tier) => {
            const isActive = tier.id === activeTier.id;
            return (
              <div
                key={tier.id}
                className={`rounded-2xl border p-4 transition-colors sm:p-6 ${
                  isActive ? 'border-[#10b981]/60 bg-[#10b981]/5' : 'border-[#334155]'
                }`}
              >
                <div className="mb-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span>{tier.emoji}</span>
                    <h3 className="text-lg font-bold text-slate-100 sm:text-xl">{tier.title}</h3>
                    <span className="text-sm font-medium text-slate-400">
                      ${tier.rangeUSD[0].toLocaleString()} – ${tier.rangeUSD[1].toLocaleString()} (
                      {tier.rangeILS[0].toLocaleString()} ₪ – {tier.rangeILS[1].toLocaleString()} ₪)
                    </span>
                  </div>
                  <p className="mt-2 text-sm italic text-slate-400">"{tier.quote}"</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {tier.products.map((product) => (
                    <AnchorCard
                      key={product.id}
                      product={product}
                      highlighted={isActive}
                      realized={realizedIds.has(product.id)}
                      onRealize={() => handleRealize(product.id)}
                    />
                  ))}
                </div>

                {isActive && realizedIds.size > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium text-[#10b981]">
                    <Lock size={14} />
                    <span>{realizedIds.size} רווחים ננעלו הפעם 🔒</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
