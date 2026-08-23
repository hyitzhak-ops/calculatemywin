import { motion } from 'framer-motion';
import { Wallet, Lock, ArrowUpCircle } from 'lucide-react';
import clsx from 'clsx';
import type { AnchorProduct } from './types';

interface AnchorCardProps {
  product: AnchorProduct;
  highlighted?: boolean;
  compact?: boolean;
  realized?: boolean;
  affordable?: boolean;
  missingUSD?: number;
  missingILS?: number;
  onRealize?: () => void;
}

export default function AnchorCard({
  product,
  highlighted,
  compact,
  realized,
  affordable = true,
  missingUSD,
  missingILS,
  onRealize,
}: AnchorCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={clsx(
        'group flex flex-col overflow-hidden rounded-2xl border bg-[#1e293b] transition-shadow duration-300',
        highlighted
          ? 'border-[#10b981] shadow-[0_0_0_1px_rgba(34,197,94,0.5),0_0_24px_rgba(34,197,94,0.35)]'
          : 'border-[#334155] hover:border-slate-500',
      )}
    >
      <div className={clsx('relative overflow-hidden', compact ? 'h-32' : 'h-44')}>
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-slate-100 backdrop-blur">
          {product.category}
        </span>
        {highlighted && affordable && (
          <span className="absolute bottom-2 left-2 rounded-full bg-[#10b981] px-2.5 py-1 text-xs font-bold text-slate-950">
            תואם לרווח שלך
          </span>
        )}
        {highlighted && !affordable && (
          <span className="absolute bottom-2 left-2 rounded-full bg-slate-700 px-2.5 py-1 text-xs font-bold text-slate-200">
            בטווח הזה
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className={clsx('font-semibold text-slate-100', compact ? 'text-sm' : 'text-base')}>
          {product.name}
        </h3>
        {!compact && <p className="text-sm text-slate-400">{product.description}</p>}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-[#10b981]">
              {product.priceILS.toLocaleString()} ₪
            </span>
            <span className="text-xs text-slate-500">/ ${product.priceUSD.toLocaleString()}</span>
          </div>
        </div>

        {highlighted && affordable && realized && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-[#10b981]/50 bg-[#10b981]/10 px-3 py-2 text-sm font-bold text-[#10b981]">
            <Lock size={16} />
            נעול בהצלחה!
          </div>
        )}
        {highlighted && affordable && !realized && onRealize && (
          <button
            type="button"
            onClick={onRealize}
            className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[#10b981] px-3 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-[#22c55e]"
          >
            <Wallet size={16} />
            קח את זה הביתה עכשיו (מימוש רווח)
          </button>
        )}
        {highlighted && !affordable && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 bg-slate-800/40 px-3 py-2 text-xs font-medium text-slate-400">
            <ArrowUpCircle size={14} />
            <span>
              עוד ${missingUSD?.toLocaleString()} ({missingILS?.toLocaleString()} ₪) ותוכל לממש את זה
            </span>
          </div>
        )}
      </div>
    </motion.article>
  );
}
