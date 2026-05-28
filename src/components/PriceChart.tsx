import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ChartPoint } from '../types'
import { formatPrice } from '../utils/format'

interface PriceChartProps {
  data: ChartPoint[]
  positive: boolean
}

export function PriceChart({ data, positive }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
        No chart data available
      </div>
    )
  }

  const stroke = positive ? '#4ade80' : '#f87171'
  const fillId = positive ? 'greenGradient' : 'redGradient'

  const minPrice = Math.min(...data.map((d) => d.price))
  const maxPrice = Math.max(...data.map((d) => d.price))
  const padding = (maxPrice - minPrice) * 0.001
  const domain: [number, number] = [minPrice - padding, maxPrice + padding]

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={stroke}
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor={stroke}
                stopOpacity={0}
              />
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
            domain={domain}
            tickFormatter={(v) => v.toFixed(2)}
            tick={{ fill: '#71717a', fontSize: 10 }}
            width={52}
            stroke="#3f3f46"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '0.375rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(value: number) => [formatPrice(value), 'Price']}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{ r: 3, fill: stroke }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
