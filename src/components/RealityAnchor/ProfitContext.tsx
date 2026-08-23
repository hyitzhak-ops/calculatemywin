import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PROFIT, EXCHANGE_RATE, usdToIls } from './anchorsData';

interface ProfitContextValue {
  profitUSD: number;
  profitILS: number;
  setProfitUSD: (value: number) => void;
}

const ProfitContext = createContext<ProfitContextValue | null>(null);

export function ProfitProvider({ children }: { children: ReactNode }) {
  const [profitUSD, setProfitUSD] = useState(DEFAULT_PROFIT);

  const value = useMemo<ProfitContextValue>(
    () => ({
      profitUSD,
      profitILS: usdToIls(profitUSD),
      setProfitUSD,
    }),
    [profitUSD],
  );

  return <ProfitContext.Provider value={value}>{children}</ProfitContext.Provider>;
}

export function useProfit() {
  const ctx = useContext(ProfitContext);
  if (!ctx) {
    throw new Error('useProfit must be used within a ProfitProvider');
  }
  return ctx;
}

export { EXCHANGE_RATE };
