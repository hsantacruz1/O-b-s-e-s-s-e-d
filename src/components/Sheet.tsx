import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useBackToClose } from '../lib/router';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  full?: boolean;
}

/** Bottom sheet with a backdrop, drag-to-dismiss handle and back-button support. */
export function Sheet({ open, onClose, title, eyebrow, children, footer, full }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; dy: number } | null>(null);

  useBackToClose(open, onClose);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  const onHandleDown = (e: React.PointerEvent) => {
    drag.current = { y0: e.clientY, dy: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    if (!drag.current || !panel.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y0);
    panel.current.style.transition = 'none';
    panel.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onHandleUp = () => {
    if (!drag.current || !panel.current) return;
    const { dy } = drag.current;
    drag.current = null;
    panel.current.style.transition = '';
    panel.current.style.transform = '';
    if (dy > 110) onClose();
  };

  return createPortal(
    <div className={`sheet-root ${shown ? 'is-shown' : ''}`} role="dialog" aria-modal="true">
      <div className="sheet-backdrop" onClick={onClose} />
      <div ref={panel} className={`sheet ${full ? 'sheet--full' : ''}`}>
        <div className="sheet-grab" onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}>
          <span />
        </div>
        {(title || eyebrow) && (
          <header className="sheet-head">
            <div>
              {eyebrow && <div className="eyebrow">{eyebrow}</div>}
              {title && <h2 className="sheet-title">{title}</h2>}
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </header>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
