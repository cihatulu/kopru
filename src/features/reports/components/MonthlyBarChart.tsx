import { useState } from 'react';
import type { MonthPoint } from '../domain/profitability';

const CHART_H = 120;
const BAR_W = 36;
const GAP = 12;

const formatK = (n: number) => {
  if (n >= 1_000_000) return `₺${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₺${(n / 1_000).toFixed(0)}K`;
  return `₺${n}`;
};

/** Son 6 ayın ciro grafiği — bağımlılık eklemeden düz SVG. */
export function MonthlyBarChart({ months }: { months: MonthPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxRevenue = Math.max(...months.map((m) => m.revenue), 1);
  const totalWidth = months.length * (BAR_W + GAP) - GAP;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        width={totalWidth + 4}
        height={CHART_H + 40}
        viewBox={`0 0 ${totalWidth + 4} ${CHART_H + 40}`}
        className="block mx-auto"
        style={{ minWidth: totalWidth }}
      >
        {months.map((month, i) => {
          const barH = month.revenue > 0 ? Math.max(4, (month.revenue / maxRevenue) * CHART_H) : 4;
          const x = i * (BAR_W + GAP);
          const y = CHART_H - barH;
          const isHovered = hovered === i;
          const isEmpty = month.revenue === 0;
          const tipX = Math.min(x - 4, totalWidth - 80);

          return (
            <g key={month.key}>
              <rect x={x} y={0} width={BAR_W} height={CHART_H} rx={6} fill={isHovered ? '#f1f5f9' : '#f8fafc'} />
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx={6}
                fill={isEmpty ? '#e2e8f0' : isHovered ? '#2563eb' : '#3b82f6'}
                style={{ transition: 'fill 0.15s, y 0.3s, height 0.3s' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              />

              {isHovered && !isEmpty && (
                <g>
                  <rect x={tipX} y={y - 30} width={76} height={22} rx={6} fill="#1e293b" />
                  <text
                    x={tipX + 38}
                    y={y - 14}
                    textAnchor="middle"
                    fill="white"
                    fontSize={10}
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    {formatK(month.revenue)}
                  </text>
                </g>
              )}

              <text
                x={x + BAR_W / 2}
                y={CHART_H + 16}
                textAnchor="middle"
                fill={isHovered ? '#1e293b' : '#94a3b8'}
                fontSize={10}
                fontWeight={isHovered ? '700' : '600'}
                fontFamily="sans-serif"
              >
                {month.label}
              </text>

              {!isHovered && !isEmpty && barH > 20 && (
                <text
                  x={x + BAR_W / 2}
                  y={y + 13}
                  textAnchor="middle"
                  fill="white"
                  fontSize={9}
                  fontWeight="700"
                  fontFamily="sans-serif"
                >
                  {formatK(month.revenue)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
