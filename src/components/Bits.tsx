import { useEffect, useRef, useState, type ReactNode } from 'react';
import { buzz } from '../lib/haptics';
import { usePhotoUrl } from '../lib/images';

export function Wordmark({ size = 13 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }} aria-label="Obsessed">
      OBSESSED
    </span>
  );
}

export function Photo({ id, size = 'thumb', className, alt = '' }: { id: string; size?: 'thumb' | 'full'; className?: string; alt?: string }) {
  const url = usePhotoUrl(id, size);
  return url ? (
    <img src={url} className={className} alt={alt} draggable={false} decoding="async" />
  ) : (
    <span className={`photo-skeleton ${className ?? ''}`} />
  );
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h3 className="label">{title}</h3>
      {action}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'is-on' : ''}
          onClick={() => {
            buzz(5);
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Press and hold to confirm: a thin circle draws itself while you hold,
 * like one long inhale. Used for commitments.
 */
export function HoldButton({ children, onComplete, duration = 2200 }: { children: ReactNode; onComplete: () => void; duration?: number }) {
  const [p, setP] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);
  const done = useRef(false);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    if (!done.current) setP(0);
  };
  const tick = () => {
    const v = Math.min(1, (performance.now() - start.current) / duration);
    setP(v);
    if (v >= 1) {
      done.current = true;
      buzz([10, 60, 30]);
      onComplete();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <button
      className={`hold ${p > 0 ? 'is-holding' : ''}`}
      onPointerDown={(e) => {
        if (done.current) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        buzz(6);
        start.current = performance.now();
        raf.current = requestAnimationFrame(tick);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-circle" style={{ transform: `scale(${0.86 + p * 0.14})` }}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={r} className="hold-track" />
          <circle cx="50" cy="50" r={r} className="hold-fill" strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform="rotate(-90 50 50)" />
        </svg>
        <span className="hold-dot" style={{ opacity: p }} />
      </span>
      <span className="hold-label">{p > 0 && p < 1 ? 'Breathe in…' : children}</span>
    </button>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
