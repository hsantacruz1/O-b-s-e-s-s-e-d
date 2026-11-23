import { useMemo, type ReactNode } from 'react';
import { addDays, dayKey, formatDuration, parseDayKey, startOfWeekKey } from '../lib/dates';

/* ───────────── Progress ring ───────────── */

export function Ring({
  value,
  size = 56,
  stroke = 5,
  color = 'var(--red)',
  track = 'var(--line)',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      {children && <div className="ring-inner">{children}</div>}
    </div>
  );
}

/* ───────────── Bar (XP / progress) ───────────── */

export function Bar({ value, color, tall }: { value: number; color?: string; tall?: boolean }) {
  return (
    <div className={`bar ${tall ? 'bar--tall' : ''}`}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

/* ───────────── Heatmap ("The Grind Map") ───────────── */

export function Heatmap({ minutes, weeks = 18, color = '#FF3347' }: { minutes: Map<string, number>; weeks?: number; color?: string }) {
  const today = dayKey();
  const { cols, months } = useMemo(() => {
    const start = addDays(startOfWeekKey(today), -(weeks - 1) * 7);
    const cols: { key: string; v: number; future: boolean }[][] = [];
    const months: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      const col: { key: string; v: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = addDays(start, w * 7 + d);
        col.push({ key, v: minutes.get(key) ?? 0, future: key > today });
        if (d === 0) {
          const m = parseDayKey(key).getMonth();
          if (m !== lastMonth) {
            const prev = months[months.length - 1];
            // Skip a label that would collide with the previous one.
            if (!prev || w - prev.col >= 3) months.push({ col: w, label: parseDayKey(key).toLocaleDateString(undefined, { month: 'short' }) });
            else if (prev.col === 0) months[months.length - 1] = { col: w, label: parseDayKey(key).toLocaleDateString(undefined, { month: 'short' }) };
            lastMonth = m;
          }
        }
      }
      cols.push(col);
    }
    return { cols, months };
  }, [minutes, weeks, today]);

  const level = (v: number) => (v <= 0 ? 0 : v < 20 ? 1 : v < 45 ? 2 : v < 90 ? 3 : 4);
  const alpha = [0, 0.28, 0.5, 0.75, 1];

  return (
    <div className="heatmap" role="img" aria-label="Activity over recent weeks">
      <div className="heatmap-months" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
        {months.map((m) => (
          <span key={m.col} style={{ gridColumn: m.col + 1 }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
        {cols.map((col, i) => (
          <div className="heatmap-col" key={i}>
            {col.map((c) => {
              const l = level(c.v);
              return (
                <span
                  key={c.key}
                  className={`heat ${c.future ? 'heat--future' : ''} ${c.key === today ? 'heat--today' : ''}`}
                  title={`${c.key}: ${formatDuration(c.v)}`}
                  style={l ? { background: color, opacity: alpha[l] } : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        {alpha.map((a, i) => (
          <span key={i} className="heat heat--legend" style={i ? { background: color, opacity: a } : undefined} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/* ───────────── Bar chart ───────────── */

export function BarChart({ data, color = 'var(--red)', unit = 'min' }: { data: { label: string; value: number; highlight?: boolean }[]; color?: string; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="barchart">
      {data.map((d, i) => (
        <div className="barchart-col" key={i}>
          <div className="barchart-val">{d.value > 0 ? (unit === 'min' ? formatDuration(d.value) : d.value) : ''}</div>
          <div className="barchart-track">
            <div
              className="barchart-bar"
              style={{ height: `${(d.value / max) * 100}%`, background: d.highlight ? color : undefined }}
            />
          </div>
          <div className={`barchart-label ${d.highlight ? 'is-hl' : ''}`}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ───────────── Line chart (metrics) ───────────── */

export function LineChart({
  points,
  color = '#FF3347',
  unit,
  bestIndex,
}: {
  points: { ts: number; value: number }[];
  color?: string;
  unit: string;
  bestIndex: number;
}) {
  const W = 320;
  const H = 140;
  const pad = { l: 8, r: 8, t: 18, b: 22 };
  if (points.length === 0) return null;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.12;
  max += span * 0.12;
  const t0 = points[0].ts;
  const t1 = points[points.length - 1].ts;
  const x = (i: number) =>
    points.length === 1 ? W / 2 : pad.l + ((points[i].ts - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  const gid = `g${color.replace(/[^a-z0-9]/gi, '')}`;
  const fmt = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const last = points.length - 1;

  return (
    <svg className="linechart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Trend in ${unit}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--line)" strokeWidth="1" />
      {points.length > 1 && <path d={area} fill={`url(#${gid})`} />}
      {points.length > 1 && <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === bestIndex ? 5 : 3} fill={i === bestIndex ? '#F7C548' : color} stroke="var(--surface)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      ))}
      <text x={pad.l} y={H - 6} className="linechart-axis">{fmt(t0)}</text>
      {points.length > 1 && (
        <text x={W - pad.r} y={H - 6} textAnchor="end" className="linechart-axis">{fmt(t1)}</text>
      )}
      <text x={Math.min(W - pad.r, Math.max(pad.l, x(last)))} y={Math.max(12, y(points[last].value) - 9)} textAnchor={last === 0 ? 'middle' : 'end'} className="linechart-label">
        {points[last].value} {unit}
      </text>
    </svg>
  );
}

/* ───────────── Streak flame ───────────── */

export function Flame({ count, alive, size = 'md' }: { count: number; alive: boolean; size?: 'md' | 'lg' }) {
  return (
    <span className={`flame flame--${size} ${alive && count > 0 ? 'is-alive' : ''}`} aria-label={`${count} day streak`}>
      <svg viewBox="0 0 24 24" width={size === 'lg' ? 22 : 16} height={size === 'lg' ? 22 : 16} aria-hidden="true">
        <defs>
          <linearGradient id="flameg" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#FF3347" />
            <stop offset=".6" stopColor="#FF7A1A" />
            <stop offset="1" stopColor="#F7C548" />
          </linearGradient>
        </defs>
        <path
          d="M12 2c.5 3.2 2.4 5 4.2 7 1.6 1.8 2.8 3.7 2.8 6.3A7 7 0 0 1 12 22a7 7 0 0 1-7-6.7c0-2.3 1-4 2.4-5.4.3 1.7 1.2 2.8 2.4 3.3-.6-3.9.6-8 2.2-11.2Z"
          fill={alive && count > 0 ? 'url(#flameg)' : 'currentColor'}
        />
      </svg>
      <b>{count}</b>
    </span>
  );
}

/* ───────────── Intensity flames ───────────── */

export function Intensity({ value, size = 13 }: { value: number; size?: number }) {
  if (!value) return null;
  return (
    <span className="intensity" aria-label={`Intensity ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size} className={i <= value ? 'on' : ''} aria-hidden="true">
          <path d="M12 2c.5 3.2 2.4 5 4.2 7 1.6 1.8 2.8 3.7 2.8 6.3A7 7 0 0 1 12 22a7 7 0 0 1-7-6.7c0-2.3 1-4 2.4-5.4.3 1.7 1.2 2.8 2.4 3.3-.6-3.9.6-8 2.2-11.2Z" />
        </svg>
      ))}
    </span>
  );
}
