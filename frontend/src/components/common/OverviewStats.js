import React, { useState } from 'react';

// Compact number formatting per the figure contract: plain with thousands
// separators under 10K (1,284), K/M above that (12.9K / 4.2M) -- investors
// read a headline number at a glance, not a column of digits.
const compactNumber = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return Math.round(n).toLocaleString();
};

const compactCurrency = (n) => `KES ${compactNumber(n)}`;

const formatDay = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// Signed delta vs. the prior 30-day window. Up is good for every metric on
// this screen (revenue/bookings/users), so direction alone decides color.
const Delta = ({ current, previous }) => {
  if (!previous) {
    return current > 0 ? <span className="text-xs font-medium text-green-600">new</span> : null;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium ${up ? 'text-green-600' : 'text-red-600'}`}>
      {up ? '+' : ''}{pct.toFixed(0)}%<span className="text-gray-400 font-normal"> vs prior 30d</span>
    </span>
  );
};

const StatTile = ({ label, value, current, previous, note }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
    <div className="mt-1 h-4">
      {note || <Delta current={current} previous={previous} />}
    </div>
  </div>
);

// Single-series line: monochrome brand indigo, 2px line, ~10% flat area
// wash, permanent end-dot + direct end-label, crosshair + tooltip on hover.
// Two measures (GMV, bookings) stay as two charts rather than one
// dual-axis chart -- different scales, never share an axis.
const TrendChart = ({ title, data, valueKey, formatValue }) => {
  const width = 480;
  const height = 160;
  const padding = { top: 10, right: 54, bottom: 10, left: 4 };
  const [hoverIndex, setHoverIndex] = useState(null);
  const color = '#4f46e5'; // indigo-600, matches this admin's existing accent

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const values = data.map((d) => d[valueKey]);
  const max = Math.max(...values, 1);
  const stepX = innerW / (data.length - 1 || 1);

  const points = data.map((d, i) => [
    padding.left + i * stepX,
    padding.top + innerH - (d[valueKey] / max) * innerH,
  ]);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const baseY = padding.top + innerH;
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${baseY} L${points[0][0].toFixed(1)},${baseY} Z`;

  const lastPoint = points[points.length - 1];
  const lastValue = values[values.length - 1];
  const hovered = hoverIndex != null ? { point: points[hoverIndex], datum: data[hoverIndex] } : null;

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round((relX - padding.left) / stepX);
    setHoverIndex(Math.min(data.length - 1, Math.max(0, idx)));
  };

  return (
    <div className="relative">
      <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-36 touch-none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <line x1={padding.left} y1={baseY} x2={width - padding.right} y2={baseY} stroke="#e5e7eb" strokeWidth="1" />
        <path d={areaPath} fill={color} fillOpacity="0.08" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {hovered && (
          <line
            x1={hovered.point[0]} y1={padding.top} x2={hovered.point[0]} y2={baseY}
            stroke="#d1d5db" strokeWidth="1"
          />
        )}
        {hovered && (
          <circle cx={hovered.point[0]} cy={hovered.point[1]} r="4" fill={color} stroke="#fff" strokeWidth="2" />
        )}

        {/* Permanent end-marker + direct label -- the headline value, always visible */}
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="4" fill={color} stroke="#fff" strokeWidth="2" />
        <text x={lastPoint[0] + 10} y={lastPoint[1] + 4} className="fill-gray-900 text-[11px] font-medium tabular-nums">
          {formatValue(lastValue)}
        </text>
      </svg>

      {hovered && (
        <div
          className="absolute top-0 -translate-x-1/2 pointer-events-none bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 shadow-lg whitespace-nowrap"
          style={{ left: `${(hovered.point[0] / width) * 100}%` }}
        >
          <span className="text-gray-300">{formatDay(hovered.datum.date)}</span>{' '}
          <span className="font-semibold tabular-nums">{formatValue(hovered.datum[valueKey])}</span>
        </div>
      )}
    </div>
  );
};

const OverviewStats = ({ stats }) => {
  if (!stats) return null;
  const { gmv, bookings, listings, users, trend } = stats;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pb-6 border-b border-gray-100">
        <StatTile
          label="Gross revenue"
          value={compactCurrency(gmv.total)}
          current={gmv.last_30d}
          previous={gmv.prev_30d}
        />
        <StatTile
          label="Bookings"
          value={compactNumber(bookings.total)}
          current={bookings.last_30d}
          previous={bookings.prev_30d}
        />
        <StatTile
          label="Active listings"
          value={compactNumber(listings.active)}
          note={<span className="text-xs text-gray-400">{listings.pending_verification} pending verification</span>}
        />
        <StatTile
          label="Users"
          value={compactNumber(users.total)}
          current={users.last_30d}
          previous={users.prev_30d}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-x-10 gap-y-6 pt-6 pb-2">
        <TrendChart title="Revenue, last 30 days" data={trend} valueKey="gmv" formatValue={compactCurrency} />
        <TrendChart title="Bookings, last 30 days" data={trend} valueKey="bookings" formatValue={compactNumber} />
      </div>
    </div>
  );
};

export default OverviewStats;
