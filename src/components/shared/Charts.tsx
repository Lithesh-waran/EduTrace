import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber } from '@/lib/format';

export const CHART_COLORS = {
  navy: '#15365C',
  steel: '#245A91',
  success: '#218653',
  warning: '#D99416',
  critical: '#C73E3A',
  muted: '#98A2B3',
  border: '#DCE3EB',
} as const;

const axisProps = {
  stroke: '#98A2B3',
  tick: { fill: '#667085', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    borderRadius: 6,
    border: '1px solid #DCE3EB',
    fontSize: 12,
    boxShadow: '0 8px 24px -12px rgba(16,24,40,0.18)',
  },
  labelStyle: { color: '#1D2939', fontWeight: 600, fontSize: 12 },
} as const;

export interface ChartSeries {
  key: string;
  name: string;
  color: string;
}

export function SimpleBarChart({
  data,
  xKey,
  series,
  height = 230,
  layout = 'horizontal',
  stacked,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  layout?: 'horizontal' | 'vertical';
  stacked?: boolean;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 6, right: 8, left: layout === 'vertical' ? 8 : -18, bottom: 0 }}
        >
          <CartesianGrid stroke="#EEF2F7" vertical={layout === 'vertical'} horizontal={layout === 'horizontal'} />
          {layout === 'horizontal' ? (
            <>
              <XAxis dataKey={xKey} {...axisProps} interval={0} />
              <YAxis {...axisProps} width={44} />
            </>
          ) : (
            <>
              <XAxis type="number" {...axisProps} />
              <YAxis type="category" dataKey={xKey} {...axisProps} width={150} />
            </>
          )}
          <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(21,54,92,0.04)' }} />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.name}
              fill={item.color}
              radius={[3, 3, 0, 0]}
              stackId={stacked ? 'stack' : undefined}
              maxBarSize={26}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleLineChart({
  data,
  xKey,
  series,
  height = 230,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#EEF2F7" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} width={44} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          {series.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.name}
              stroke={item.color}
              strokeWidth={2}
              dot={{ r: 2.5, strokeWidth: 1, fill: '#fff' }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusDonut({
  data,
  height = 210,
  totalLabel,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  totalLabel?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const visible = data.filter((item) => item.value > 0);
  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row">
      <div className="relative" style={{ width: 170, height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={2}
              strokeWidth={0}
            >
              {visible.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(value: number) => formatNumber(value)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-foreground">{formatNumber(total)}</span>
          <span className="text-2xs text-muted-foreground">{totalLabel ?? 'records'}</span>
        </div>
      </div>
      <ul className="grid flex-1 grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
        {data.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden />
              <span className="truncate text-muted-foreground">{item.name}</span>
            </span>
            <span className="shrink-0 font-medium text-foreground">{formatNumber(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pb-1 text-2xs text-muted-foreground">
      {series.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden />
          {item.name}
        </span>
      ))}
    </div>
  );
}

export { Legend };
