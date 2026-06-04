import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from 'recharts'
import type { ChartPoint, OverlayPoint } from '../types'
import { formatPrice, formatPercent } from '../utils/format'

interface PriceChartProps {
  data: ChartPoint[]
  positive: boolean
  overlay?: OverlayPoint[]
  overlaySymbol?: string
  preMarketHigh?: number
  preMarketLow?: number
  previousClose?: number
  currentPrice?: number
  isPreMarket?: boolean
}

interface MergedPoint {
  time: string
  timestamp: number
  price: number
  pricePct: number
  overlayPct: number | null
}

export function PriceChart({
  data,
  positive,
  overlay,
  overlaySymbol,
  preMarketHigh,
  preMarketLow,
  previousClose,
  currentPrice,
  isPreMarket,
}: PriceChartProps) {
  const stroke = positive ? '#4ade80' : '#f87171'
  const fillId = positive ? 'greenGradient' : 'redGradient'

  const merged = useMemo<MergedPoint[]>(() => {
    if (data.length === 0) return []
    const baseline = data[0].price
    const overlayMap = new Map<number, number>()
    if (overlay && overlay.length > 0) {
      for (const o of overlay) overlayMap.set(o.timestamp, o.pctChange)
    }
    return data.map((p) => {
      // Match overlay by nearest timestamp within ±2.5 min (intraday) or ±36h (daily)
      let nearest: number | null = null
      if (overlay && overlay.length > 0) {
        let bestDelta = Infinity
        for (const o of overlay) {
          const delta = Math.abs(o.timestamp - p.timestamp)
          if (delta < bestDelta) {
            bestDelta = delta
            nearest = o.pctChange
          }
        }
      }
      return {
        time: p.time,
        timestamp: p.timestamp,
        price: p.price,
        pricePct: ((p.price - baseline) / baseline) * 100,
        overlayPct: nearest,
      }
    })
  }, [data, overlay])

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
        No chart data available
      </div>
    )
  }

  const minPrice = Math.min(...data.map((d) => d.price))
  const maxPrice = Math.max(...data.map((d) => d.price))
  const candidateExtremes: number[] = [minPrice, maxPrice]
  if (preMarketHigh !== undefined) candidateExtremes.push(preMarketHigh)
  if (preMarketLow !== undefined) candidateExtremes.push(preMarketLow)
  if (previousClose !== undefined) candidateExtremes.push(previousClose)
  if (currentPrice !== undefined) candidateExtremes.push(currentPrice)
  const domainMin = Math.min(...candidateExtremes)
  const domainMax = Math.max(...candidateExtremes)
  const padding = (domainMax - domainMin) * 0.04 || 0.02
  const domain: [number, number] = [domainMin - padding, domainMax + padding]

  const showOverlay = !!overlay && overlay.length > 1

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={merged}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fill: '#71717a', fontSize: 10 }}
            minTickGap={40}
            stroke="#3f3f46"
          />
          <YAxis
            yAxisId="price"
            domain={domain}
            tickFormatter={(v) => v.toFixed(2)}
            tick={{ fill: '#71717a', fontSize: 10 }}
            width={52}
            stroke="#3f3f46"
          />
          {showOverlay && (
            <YAxis
              yAxisId="pct"
              orientation="right"
              tickFormatter={(v) => `${v.toFixed(1)}%`}
              tick={{ fill: '#52525b', fontSize: 9 }}
              width={42}
              stroke="#27272a"
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '0.375rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(value: number, name: string) => {
              if (name === 'price') return [formatPrice(value), 'Price']
              if (name === 'overlayPct')
                return [
                  formatPercent(value),
                  `${overlaySymbol ?? 'SPY'} since open`,
                ]
              return [value, name]
            }}
          />
          {preMarketHigh !== undefined && (
            <ReferenceLine
              yAxisId="price"
              y={preMarketHigh}
              stroke="#34d399"
              strokeDasharray="4 4"
              strokeOpacity={0.8}
              strokeWidth={1.5}
            >
              <Label
                value={`PM High ${formatPrice(preMarketHigh)}`}
                position="insideTopRight"
                fill="#34d399"
                fontSize={10}
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
              />
            </ReferenceLine>
          )}
          {preMarketLow !== undefined && (
            <ReferenceLine
              yAxisId="price"
              y={preMarketLow}
              stroke="#f87171"
              strokeDasharray="4 4"
              strokeOpacity={0.8}
              strokeWidth={1.5}
            >
              <Label
                value={`PM Low ${formatPrice(preMarketLow)}`}
                position="insideBottomRight"
                fill="#f87171"
                fontSize={10}
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
              />
            </ReferenceLine>
          )}
          {previousClose !== undefined && (
            <ReferenceLine
              yAxisId="price"
              y={previousClose}
              stroke="#a1a1aa"
              strokeDasharray="6 3"
              strokeOpacity={0.7}
              strokeWidth={1.25}
            >
              <Label
                value={`Prev Close ${formatPrice(previousClose)}`}
                position="insideRight"
                fill="#d4d4d8"
                fontSize={10}
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
              />
            </ReferenceLine>
          )}
          {currentPrice !== undefined && (
            <ReferenceLine
              yAxisId="price"
              y={currentPrice}
              stroke={isPreMarket ? '#60a5fa' : stroke}
              strokeOpacity={0.9}
              strokeWidth={2}
            >
              <Label
                value={`${isPreMarket ? 'Pre-Mkt' : 'Now'} ${formatPrice(currentPrice)}`}
                position="left"
                fill={isPreMarket ? '#60a5fa' : stroke}
                fontSize={11}
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
                offset={4}
              />
            </ReferenceLine>
          )}
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="price"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{ r: 3, fill: stroke }}
            isAnimationActive={false}
          />
          {showOverlay && (
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="overlayPct"
              stroke="#a1a1aa"
              strokeWidth={1.25}
              strokeOpacity={0.55}
              strokeDasharray="2 2"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
