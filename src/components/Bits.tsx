import { useEffect, useRef, useState, type ReactNode } from 'react';
import { buzz } from '../lib/haptics';
import { usePhotoUrl } from '../lib/images';

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      OBSESSED<span className="wordmark-dot">.</span>
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

export function Empty({ emoji, title, body, action }: { emoji: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h3 className="eyebrow">{title}</h3>
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
            buzz(6);
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Press and hold to confirm. Used for moments that should feel like a commitment. */
export function HoldButton({ children, onComplete, duration = 1400, className = '' }: { children: ReactNode; onComplete: () => void; duration?: number; className?: string }) {
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
      buzz([20, 40, 60]);
      onComplete();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <button
      className={`hold-btn ${className}`}
      onPointerDown={(e) => {
        if (done.current) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        buzz(10);
        start.current = performance.now();
        raf.current = requestAnimationFrame(tick);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-fill" style={{ transform: `scaleX(${p})` }} />
      <span className="hold-label">{children}</span>
    </button>
  );
}

export function Stat({ value, label, accent }: { value: ReactNode; label: string; accent?: string }) {
  return (
    <div className="stat">
      <div className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
