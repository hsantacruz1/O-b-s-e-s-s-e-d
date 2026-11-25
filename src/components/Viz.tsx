import { useMemo, type ReactNode } from 'react';
import { addDays, dayKey, formatDuration, parseDayKey, startOfWeekKey } from '../lib/dates';

/* ───────────── Progress ring (thin, like a drawn circle) ───────────── */

export function Ring({
  value,
  size = 52,
  stroke = 1.5,
  color = 'var(--ink)',
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
  const r = (size - stroke) / 2 - 1;
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
          strokeWidth={stroke + 0.5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.25,.8,.25,1)' }}
        />
      </svg>
      {children && <div className="ring-inner">{children}</div>}
    </div>
  );
}

/* ───────────── Progress line ───────────── */

export function Bar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

/* ───────────── Practice calendar ───────────── */

export function Heatmap({ minutes, weeks = 18, color = 'var(--ink)' }: { minutes: Map<string, number>; weeks?: number; color?: string }) {
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
            const label = parseDayKey(key).toLocaleDateString(undefined, { month: 'short' });
            const prev = months[months.length - 1];
            if (!prev || w - prev.col >= 3) months.push({ col: w, label });
            else if (prev.col === 0) months[months.length - 1] = { col: w, label };
            lastMonth = m;
          }
        }
      }
      cols.push(col);
    }
    return { cols, months };
  }, [minutes, weeks, today]);

  const level = (v: number) => (v <= 0 ? 0 : v < 20 ? 1 : v < 45 ? 2 : v < 90 ? 3 : 4);
  const alpha = [0, 0.22, 0.45, 0.7, 1];

  return (
    <div className="heatmap" role="img" aria-label="Practice over recent weeks">
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

export function BarChart({ data }: { data: { label: string; value: number; highlight?: boolean }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="barchart">
      {data.map((d, i) => (
        <div className={`barchart-col ${d.highlight ? 'is-hl' : ''}`} key={i}>
          <div className="barchart-val">{d.value > 0 ? formatDuration(d.value) : ''}</div>
          <div className="barchart-track">
            <div className="barchart-bar" style={{ height: `${(d.value / max) * 100}%` }} />
          </div>
          <div className="barchart-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ───────────── Line chart (measurements) ───────────── */

export function LineChart({
  points,
  color = 'var(--ink)',
  unit,
  bestIndex,
}: {
  points: { ts: number; value: number }[];
  color?: string;
  unit: string;
  bestIndex: number;
}) {
  const W = 320;
  const H = 130;
  const pad = { l: 6, r: 6, t: 20, b: 22 };
  if (points.length === 0) return null;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.1;
  max += span * 0.1;
  const t0 = points[0].ts;
  const t1 = points[points.length - 1].ts;
  const x = (i: number) =>
    points.length === 1 ? W / 2 : pad.l + ((points[i].ts - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const fmt = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const last = points.length - 1;

  return (
    <svg className="linechart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Trend in ${unit}`}>
      {[0.33, 0.66].map((f) => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} stroke="var(--line)" strokeWidth="0.75" strokeDasharray="2 4" />
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--line-2)" strokeWidth="0.75" />
      {points.length > 1 && <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) =>
        i === bestIndex ? (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={4.5} fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
        ) : (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={2.2} fill={color} />
        ),
      )}
      <text x={pad.l} y={H - 5} className="linechart-axis">{fmt(t0)}</text>
      {points.length > 1 && (
        <text x={W - pad.r} y={H - 5} textAnchor="end" className="linechart-axis">{fmt(t1)}</text>
      )}
      <text x={Math.min(W - pad.r, Math.max(pad.l, x(last)))} y={Math.max(12, y(points[last].value) - 10)} textAnchor={last === 0 ? 'middle' : 'end'} className="linechart-label">
        {points[last].value} {unit}
      </text>
    </svg>
  );
}

/* ───────────── Streak: three ascending steps ───────────── */

export function StepsGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 14.5h4v-4h4v-4h5" />
      <path d="M14.5 1.5v5" opacity=".45" />
    </svg>
  );
}

export function Streak({ count, alive }: { count: number; alive: boolean }) {
  return (
    <span className={`streak ${alive && count > 0 ? 'is-alive' : ''}`} aria-label={`${count} day streak`}>
      <StepsGlyph />
      <b>{count}</b>
    </span>
  );
}

/* ───────────── Depth of focus: five quiet dots ───────────── */

export function FocusDots({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="focus-dots" aria-label={`Focus ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= value ? 'on' : ''} />
      ))}
    </span>
  );
}

/* ───────────── Mountains: the horizon behind Focus and onboarding ───────────── */

export function Mountains({ className = '' }: { className?: string }) {
  return (
    <svg className={`mountains ${className}`} viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
      <path className="m-far" d="M0 120 L38 92 L70 108 L118 62 L150 86 L196 48 L238 90 L270 74 L318 104 L352 80 L400 98 L400 200 L0 200 Z" />
      <path className="m-mid" d="M0 150 L52 116 L90 132 L140 98 L186 130 L228 112 L276 140 L322 110 L364 128 L400 118 L400 200 L0 200 Z" />
      <path className="m-near" d="M0 176 L60 150 L118 166 L170 146 L232 170 L290 150 L348 168 L400 156 L400 200 L0 200 Z" />
    </svg>
  );
}
