export interface AnchorProduct {
  id: string;
  name: string;
  description: string;
  priceUSD: number;
  priceILS: number;
  imageUrl: string;
  category: string;
}

export interface AnchorTier {
  id: string;
  emoji: string;
  title: string;
  rangeUSD: [number, number];
  rangeILS: [number, number];
  quote: string;
  products: AnchorProduct[];
}
