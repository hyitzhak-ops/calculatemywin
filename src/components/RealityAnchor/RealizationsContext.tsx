import { createContext, useContext, useState, type ReactNode } from 'react';

const REALIZATIONS_KEY = 'calculatemywin_reality_anchor_realizations';

function loadCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(REALIZATIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, number>;
    }
    return {};
  } catch {
    return {};
  }
}

function persistCounts(counts: Record<string, number>): void {
  try {
    localStorage.setItem(REALIZATIONS_KEY, JSON.stringify(counts));
  } catch (err) {
    console.warn(`Failed to persist ${REALIZATIONS_KEY}:`, err);
  }
}

interface RealizationsContextValue {
  counts: Record<string, number>;
  realize: (id: string) => void;
  resetOne: (id: string) => void;
}

const RealizationsContext = createContext<RealizationsContextValue | null>(null);

export function RealizationsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<Record<string, number>>(() => loadCounts());

  const realize = (id: string) => {
    setCounts((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      persistCounts(next);
      return next;
    });
  };

  const resetOne = (id: string) => {
    setCounts((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      persistCounts(next);
      return next;
    });
  };

  return (
    <RealizationsContext.Provider value={{ counts, realize, resetOne }}>
      {children}
    </RealizationsContext.Provider>
  );
}

export function useRealizations() {
  const ctx = useContext(RealizationsContext);
  if (!ctx) {
    throw new Error('useRealizations must be used within a RealizationsProvider');
  }
  return ctx;
}
