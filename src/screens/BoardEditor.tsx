import {
  BringToFront,
  ChevronLeft,
  Copy,
  Download,
  Expand,
  Frame,
  Highlighter,
  ImagePlus,
  LayoutGrid,
  MoreHorizontal,
  Palette,
  Pencil,
  SendToBack,
  Share2,
  Shuffle,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Empty, Segmented } from '../components/Bits';
import { BoardItemContent, BoardView, itemStyle } from '../components/BoardView';
import { Sheet } from '../components/Sheet';
import { evaluateAchievements } from '../lib/actions';
import { ASPECTS, TEXT_STYLE_LABELS, autoLayout, boardHeight, newImageItem, newTextItem, renderBoard, type LayoutKind } from '../lib/board';
import { db } from '../lib/db';
import { toast } from '../lib/events';
import { buzz } from '../lib/haptics';
import { uid } from '../lib/ids';
import { collectOrphanPhotos, savePhotos } from '../lib/images';
import { BOARD_BACKGROUNDS, BOARD_BG_MAP, TEXT_COLORS, VISION_WORDS } from '../lib/presets';
import { goBack, navigate, useBackToClose } from '../lib/router';
import { ui } from '../lib/ui';
import type { Board, BoardItem, BoardTextItem, TextStyle } from '../lib/types';

type Gesture =
  | { kind: 'drag'; id: string; pid: number; sx: number; sy: number; orig: BoardItem }
  | { kind: 'pinch'; id: string; a: number; b: number; d0: number; a0: number; m0: { x: number; y: number }; orig: BoardItem }
  | { kind: 'resize'; id: string; pid: number; sx: number; sy: number; orig: BoardItem; c: { x: number; y: number } }
  | { kind: 'rotate'; id: string; pid: number; orig: BoardItem; c: { x: number; y: number } };

const dist = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(q.x - p.x, q.y - p.y);
const angle = (p: { x: number; y: number }, q: { x: number; y: number }) => (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
const snapAngle = (r: number) => {
  const n = Math.round(r / 90) * 90;
  return Math.abs(r - n) < 4 ? n : r;
};

export function BoardEditor({ id }: { id: string }) {
  const stored = useLiveQuery(async () => (await db.boards.get(id)) ?? null, [id]);
  const [board, setBoardState] = useState<Board | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'text' | 'layout' | 'style' | 'export' | 'more'>(null);
  const [editingText, setEditingText] = useState<BoardTextItem | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [boardPx, setBoardPx] = useState(0);
  const [layoutSeed, setLayoutSeed] = useState(1);
  const history = useRef<Board[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const saveTimer = useRef<number>(0);
  const latest = useRef<Board | null>(null);
  const deleted = useRef(false);

  useEffect(() => {
    if (stored && !latest.current) {
      latest.current = stored;
      setBoardState(stored);
    }
  }, [stored]);

  /* ── persistence ── */
  const flush = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    if (latest.current && !deleted.current) db.boards.put({ ...latest.current, updatedAt: Date.now() });
  }, []);

  /** All edits go through here: synchronous, so gestures never read a stale board. */
  const setBoard = useCallback((updater: (b: Board) => Board, opts: { snapshot?: boolean } = {}) => {
    const prev = latest.current;
    if (!prev) return;
    if (opts.snapshot) history.current = [...history.current.slice(-30), prev];
    const next = updater(prev);
    latest.current = next;
    setBoardState(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flush, 350);
  }, [flush]);

  useEffect(() => () => {
    flush();
    evaluateAchievements();
  }, [flush]);

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    buzz(8);
    latest.current = prev;
    setBoardState(prev);
    flush();
  };

  /* ── fit board to the stage ── */
  useLayoutEffect(() => {
    if (!stage.current || !board) return;
    const H = boardHeight(board.aspect);
    const fit = () => {
      const r = stage.current!.getBoundingClientRect();
      setBoardPx(Math.floor(Math.min(r.width - 24, (r.height - 24) / H)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage.current);
    return () => ro.disconnect();
  }, [board?.aspect, !!board]);

  /* ── keep text boxes' stored height in sync with how they render ── */
  useLayoutEffect(() => {
    if (!surface.current || !board || !boardPx) return;
    const fixes: Record<string, number> = {};
    surface.current.querySelectorAll<HTMLElement>('[data-item][data-type="text"]').forEach((el) => {
      const item = board.items.find((i) => i.id === el.dataset.item);
      if (!item) return;
      const h = el.offsetHeight / boardPx;
      if (Math.abs(h - item.h) > 0.004) fixes[item.id] = h;
    });
    if (Object.keys(fixes).length) setBoard((b) => ({ ...b, items: b.items.map((i) => (fixes[i.id] ? { ...i, h: fixes[i.id] } : i)) }));
  }, [board?.items, boardPx, setBoard]);

  if (stored === null) {
    return (
      <div className="screen">
        <Empty emoji="🕳️" title="Board not found" action={<button className="btn btn--primary" onClick={() => navigate('/vision', { replace: true })}>Back to boards</button>} />
      </div>
    );
  }
  if (!board) return <div className="screen" />;

  const H = boardHeight(board.aspect);
  const bg = BOARD_BG_MAP.get(board.background) ?? BOARD_BG_MAP.get('ink')!;
  const sel = board.items.find((i) => i.id === selected) ?? null;
  const imageCount = board.items.filter((i) => i.type === 'image').length;

  const updateItem = (itemId: string, patch: Partial<BoardItem>, snapshot = false) =>
    setBoard((b) => ({ ...b, items: b.items.map((i) => (i.id === itemId ? ({ ...i, ...patch } as BoardItem) : i)) }), { snapshot });

  /* ── gestures ── */
  const toUnits = (e: { clientX: number; clientY: number }) => {
    const r = surface.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / boardPx, y: (e.clientY - r.top) / boardPx };
  };
  const center = (i: BoardItem) => ({ x: i.x + i.w / 2, y: i.y + i.h / 2 });

  const startPinch = (item: BoardItem) => {
    const [a, b] = [...pointers.current.keys()];
    const pa = pointers.current.get(a)!;
    const pb = pointers.current.get(b)!;
    gesture.current = { kind: 'pinch', id: item.id, a, b, d0: dist(pa, pb), a0: angle(pa, pb), m0: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }, orig: item };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const p = toUnits(e);
    pointers.current.set(e.pointerId, p);
    surface.current!.setPointerCapture(e.pointerId);
    const target = e.target as HTMLElement;
    const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle;
    const itemEl = target.closest<HTMLElement>('[data-item]');
    const g = gesture.current;

    if (pointers.current.size === 2 && g && (g.kind === 'drag' || g.kind === 'pinch')) {
      const item = board.items.find((i) => i.id === g.id);
      if (item) startPinch(item);
      return;
    }
    if (handle && sel) {
      history.current = [...history.current.slice(-30), board];
      gesture.current =
        handle === 'rotate'
          ? { kind: 'rotate', id: sel.id, pid: e.pointerId, orig: sel, c: center(sel) }
          : { kind: 'resize', id: sel.id, pid: e.pointerId, sx: p.x, sy: p.y, orig: sel, c: center(sel) };
      return;
    }
    if (itemEl) {
      const item = board.items.find((i) => i.id === itemEl.dataset.item);
      if (!item) return;
      if (selected !== item.id) buzz(6);
      setSelected(item.id);
      history.current = [...history.current.slice(-30), board];
      gesture.current = { kind: 'drag', id: item.id, pid: e.pointerId, sx: p.x, sy: p.y, orig: item };
      return;
    }
    setSelected(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = toUnits(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    const o = g.orig;

    if (g.kind === 'drag' && e.pointerId === g.pid) {
      updateItem(g.id, { x: o.x + (p.x - g.sx), y: o.y + (p.y - g.sy) });
    } else if (g.kind === 'pinch') {
      const pa = pointers.current.get(g.a);
      const pb = pointers.current.get(g.b);
      if (!pa || !pb) return;
      const s = Math.max(0.2, Math.min(6, dist(pa, pb) / g.d0));
      const m = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      const c = center(o);
      const w = Math.max(0.06, o.w * s);
      const h = Math.max(0.04, o.h * s);
      const cx = c.x + (m.x - g.m0.x);
      const cy = c.y + (m.y - g.m0.y);
      const patch: Partial<BoardItem> = { w, h, x: cx - w / 2, y: cy - h / 2, r: snapAngle(o.r + angle(pa, pb) - g.a0) };
      if (o.type === 'text') (patch as Partial<BoardTextItem>).size = Math.max(0.02, o.size * s);
      updateItem(g.id, patch);
    } else if (g.kind === 'rotate' && e.pointerId === g.pid) {
      updateItem(g.id, { r: snapAngle(angle(g.c, p) + 90) });
    } else if (g.kind === 'resize' && e.pointerId === g.pid) {
      if (o.type === 'text') {
        const s = Math.max(0.2, dist(g.c, p) / Math.max(0.01, dist(g.c, { x: g.sx, y: g.sy })));
        const w = Math.max(0.15, o.w * s);
        updateItem(g.id, { w, size: Math.max(0.02, o.size * s), x: g.c.x - w / 2, y: g.c.y - (o.h * s) / 2, h: o.h * s });
      } else {
        const rad = (-o.r * Math.PI) / 180;
        const dx = p.x - g.sx;
        const dy = p.y - g.sy;
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
        const w = Math.max(0.08, o.w + lx * 2);
        const h = Math.max(0.08, o.h + ly * 2);
        updateItem(g.id, { w, h, x: g.c.x - w / 2, y: g.c.y - h / 2 });
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch' && pointers.current.size === 1) {
      // One finger lifted: carry on as a drag with the other.
      const [pid, pt] = [...pointers.current.entries()][0];
      const item = board.items.find((i) => i.id === g.id);
      gesture.current = item ? { kind: 'drag', id: g.id, pid, sx: pt.x, sy: pt.y, orig: item } : null;
      return;
    }
    if (pointers.current.size === 0) gesture.current = null;
  };

  /* ── actions ── */
  const addPhotos = async (files: FileList) => {
    setBusy(true);
    const ids = await savePhotos(files);
    const photos = await db.photos.bulkGet(ids);
    setBusy(false);
    if (!ids.length) {
      toast('Couldn’t read those photos', 'error');
      return;
    }
    setBoard((b) => {
      const added = photos.map((ph, i) => newImageItem(b, ids[i], ph ? ph.width / ph.height : 1, b.items.length + i));
      const next = { ...b, items: [...b.items, ...added] };
      // First batch of photos? Make it beautiful right away.
      const imgs = next.items.filter((i) => i.type === 'image').length;
      return b.items.filter((i) => i.type === 'image').length === 0 && imgs >= 2 ? { ...next, items: autoLayout(next, 'collage', Date.now()) } : next;
    }, { snapshot: true });
    buzz([10, 30, 10]);
  };

  const applyLayout = (kind: LayoutKind) => {
    const seed = layoutSeed * 7919 + Date.now();
    setLayoutSeed((s) => s + 1);
    setBoard((b) => ({ ...b, items: autoLayout(b, kind, seed) }), { snapshot: true });
    buzz(10);
  };

  const reorder = (dir: 'front' | 'back') => {
    if (!sel) return;
    const zs = board.items.map((i) => i.z);
    updateItem(sel.id, { z: dir === 'front' ? Math.max(...zs) + 1 : Math.min(...zs) - 1 }, true);
  };

  const duplicate = () => {
    if (!sel) return;
    const copy = { ...sel, id: uid(), x: sel.x + 0.04, y: sel.y + 0.04, z: Math.max(...board.items.map((i) => i.z)) + 1 };
    setBoard((b) => ({ ...b, items: [...b.items, copy] }), { snapshot: true });
    setSelected(copy.id);
  };

  const remove = () => {
    if (!sel) return;
    setBoard((b) => ({ ...b, items: b.items.filter((i) => i.id !== sel.id) }), { snapshot: true });
    setSelected(null);
    buzz(12);
  };

  const cycleStyle = () => {
    if (sel?.type !== 'text') return;
    const styles: TextStyle[] = ['display', 'serif', 'script', 'sans'];
    const next = styles[(styles.indexOf(sel.style) + 1) % styles.length];
    updateItem(sel.id, { style: next } as Partial<BoardItem>, true);
    toast(TEXT_STYLE_LABELS[next]);
  };

  const deleteBoard = async () => {
    const ok = await ui.confirm({ title: `Delete “${board.title}”?`, body: 'The board and its photos are removed from this device.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    window.clearTimeout(saveTimer.current);
    deleted.current = true;
    await db.boards.delete(board.id);
    await collectOrphanPhotos();
    navigate('/vision', { replace: true });
  };

  return (
    <div className="editor">
      <header className="editor-top">
        <button className="icon-btn" onClick={() => { flush(); goBack('/vision'); }} aria-label="Back">
          <ChevronLeft size={24} />
        </button>
        <button className="editor-title" onClick={() => setSheet('more')}>
          {board.title}
        </button>
        <div className="row gap-s">
          <button className="icon-btn" onClick={undo} disabled={!history.current.length} aria-label="Undo">
            <Undo2 size={20} />
          </button>
          <button className="icon-btn" onClick={() => { setSelected(null); setPresenting(true); }} aria-label="Present">
            <Expand size={20} />
          </button>
          <button className="icon-btn" onClick={() => setSheet('more')} aria-label="Board options">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </header>

      <div className="editor-stage" ref={stage}>
        {boardPx > 0 && (
          <div
            ref={surface}
            className="board board--edit"
            style={{ width: boardPx, height: boardPx * H, background: bg.css }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {board.items.map((item) => (
              <div
                key={item.id}
                data-item={item.id}
                data-type={item.type}
                className={`bi bi--${item.type} ${item.id === selected ? 'is-selected' : ''}`}
                style={itemStyle(item)}
              >
                <BoardItemContent item={item} full />
                {item.id === selected && (
                  <>
                    <span className="bh bh--rotate" data-handle="rotate" />
                    <span className="bh bh--resize" data-handle="resize" />
                  </>
                )}
              </div>
            ))}
            {imageCount === 0 && (
              <div className="board-empty" onPointerDown={(e) => e.stopPropagation()}>
                <button className="btn btn--primary btn--big" onClick={() => fileInput.current?.click()} disabled={busy}>
                  {busy ? <span className="spinner" /> : <ImagePlus size={20} />} Add photos
                </button>
                <p>Pick the photos that make you feel it. We’ll lay them out, then make it yours.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="editor-tools">
        {sel ? (
          <div className="toolrow" key="sel">
            {sel.type === 'text' ? (
              <>
                <Tool icon={<Pencil size={20} />} label="Edit" onClick={() => { setEditingText(sel); setSheet('text'); }} />
                <Tool icon={<Type size={20} />} label="Font" onClick={cycleStyle} />
                <Tool
                  icon={<Palette size={20} />}
                  label="Color"
                  onClick={() => {
                    const next = TEXT_COLORS[(TEXT_COLORS.indexOf(sel.color) + 1) % TEXT_COLORS.length];
                    updateItem(sel.id, { color: next } as Partial<BoardItem>, true);
                  }}
                />
                <Tool
                  icon={<Highlighter size={20} />}
                  label="Label"
                  active={!!sel.bg}
                  onClick={() => {
                    const bgc = sel.bg ? null : sel.color === '#0B0B0C' ? '#F4F1EA' : sel.color === '#F4F1EA' ? '#FF3347' : '#0B0B0C';
                    updateItem(sel.id, { bg: bgc } as Partial<BoardItem>, true);
                  }}
                />
              </>
            ) : (
              <Tool
                icon={<Frame size={20} />}
                label="Polaroid"
                active={sel.frame === 'polaroid'}
                onClick={() => updateItem(sel.id, { frame: sel.frame === 'polaroid' ? 'none' : 'polaroid' } as Partial<BoardItem>, true)}
              />
            )}
            <Tool icon={<BringToFront size={20} />} label="Front" onClick={() => reorder('front')} />
            <Tool icon={<SendToBack size={20} />} label="Back" onClick={() => reorder('back')} />
            <Tool icon={<Copy size={20} />} label="Copy" onClick={duplicate} />
            <Tool icon={<Trash2 size={20} />} label="Delete" danger onClick={remove} />
          </div>
        ) : (
          <div className="toolrow" key="main">
            <Tool icon={busy ? <span className="spinner" /> : <ImagePlus size={22} />} label="Photos" onClick={() => fileInput.current?.click()} />
            <Tool icon={<Type size={22} />} label="Words" onClick={() => { setEditingText(null); setSheet('text'); }} />
            <Tool icon={<LayoutGrid size={22} />} label="Layout" onClick={() => setSheet('layout')} disabled={imageCount === 0} />
            <Tool icon={<Palette size={22} />} label="Style" onClick={() => setSheet('style')} />
            <Tool icon={<Download size={22} />} label="Save" accent onClick={() => { flush(); setSheet('export'); }} />
          </div>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) addPhotos(e.target.files);
          e.target.value = '';
        }}
      />

      <TextSheet
        open={sheet === 'text'}
        initial={editingText}
        defaultColor={bg.ink}
        onClose={() => setSheet(null)}
        onSave={(t) => {
          if (editingText) {
            updateItem(editingText.id, t as Partial<BoardItem>, true);
          } else {
            const item = newTextItem(board, t.text, t.style, t.color);
            setBoard((b) => ({ ...b, items: [...b.items, { ...item, bg: t.bg }] }), { snapshot: true });
            setSelected(item.id);
          }
          setSheet(null);
        }}
      />

      <Sheet open={sheet === 'layout'} onClose={() => setSheet(null)} eyebrow="Auto-arrange" title="LAYOUT">
        <div className="layout-options">
          {(
            [
              ['collage', 'Collage', 'Tight mosaic, edge to edge'],
              ['grid', 'Grid', 'Clean and even'],
              ['scatter', 'Scatter', 'Polaroids on the table'],
            ] as [LayoutKind, string, string][]
          ).map(([k, label, hint]) => (
            <button key={k} className="layout-option" onClick={() => applyLayout(k)}>
              <span className={`layout-art layout-art--${k}`}>
                <i />
                <i />
                <i />
                <i />
              </span>
              <b>{label}</b>
              <em>{hint}</em>
            </button>
          ))}
        </div>
        <p className="muted small center">
          <Shuffle size={13} /> Tap again to shuffle. Words stay where you put them.
        </p>
      </Sheet>

      <Sheet open={sheet === 'style'} onClose={() => setSheet(null)} eyebrow="Board" title="STYLE">
        <div className="field">
          <label className="field-label">Background</label>
          <div className="swatches">
            {BOARD_BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                className={`swatch swatch--lg ${board.background === b.id ? 'is-on' : ''}`}
                style={{ background: b.css }}
                onClick={() => setBoard((x) => ({ ...x, background: b.id }), { snapshot: true })}
                aria-label={b.label}
              >
                <span>{b.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label">Shape</label>
          <Segmented
            value={board.aspect}
            onChange={(aspect) => setBoard((x) => ({ ...x, aspect }), { snapshot: true })}
            options={ASPECTS.map((a) => ({ value: a.value, label: <span className="seg-2">{a.label}<em>{a.hint}</em></span> }))}
          />
        </div>
      </Sheet>

      <ExportSheet open={sheet === 'export'} board={board} onClose={() => setSheet(null)} />

      <Sheet open={sheet === 'more'} onClose={() => setSheet(null)} eyebrow="Board" title="OPTIONS">
        <div className="field">
          <label className="field-label" htmlFor="rename">Name</label>
          <input id="rename" className="input" value={board.title} onChange={(e) => setBoard((b) => ({ ...b, title: e.target.value }))} />
        </div>
        <div className="list">
          <button
            className="list-row"
            onClick={async () => {
              const pinned = !board.pinned;
              if (pinned) await db.boards.toCollection().modify({ pinned: false });
              setBoard((b) => ({ ...b, pinned }));
              flush();
              toast(pinned ? 'Pinned to Today' : 'Unpinned');
            }}
          >
            <span>{board.pinned ? 'Unpin from Today' : 'Pin to Today screen'}</span>
          </button>
          <button className="list-row" onClick={() => { setSheet(null); setPresenting(true); }}>
            <span>Present full screen</span>
          </button>
          <button className="list-row list-row--danger" onClick={deleteBoard}>
            <span>Delete board</span>
          </button>
        </div>
      </Sheet>

      {presenting && <Present board={board} onClose={() => setPresenting(false)} />}
    </div>
  );
}

function Tool({ icon, label, onClick, active, danger, accent, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; danger?: boolean; accent?: boolean; disabled?: boolean }) {
  return (
    <button className={`tool ${active ? 'is-on' : ''} ${danger ? 'tool--danger' : ''} ${accent ? 'tool--accent' : ''}`} onClick={onClick} disabled={disabled}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TextSheet({
  open,
  initial,
  defaultColor,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: BoardTextItem | null;
  defaultColor: string;
  onClose: () => void;
  onSave: (t: { text: string; style: TextStyle; color: string; bg: string | null }) => void;
}) {
  const [text, setText] = useState('');
  const [style, setStyle] = useState<TextStyle>('display');
  const [color, setColor] = useState(defaultColor);
  const [label, setLabel] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText(initial?.text ?? '');
    setStyle(initial?.style ?? 'display');
    setColor(initial?.color ?? defaultColor);
    setLabel(!!initial?.bg);
  }, [open, initial, defaultColor]);

  const labelBg = color === '#0B0B0C' ? '#F4F1EA' : '#0B0B0C';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={initial ? 'Edit words' : 'Add words'}
      title="SAY IT"
      footer={
        <button className="btn btn--primary btn--block btn--big" disabled={!text.trim()} onClick={() => onSave({ text: text.trim(), style, color, bg: label ? labelBg : null })}>
          {initial ? 'Update' : 'Add to board'}
        </button>
      }
    >
      <div className="field">
        <textarea className="input textarea textarea--big" rows={2} placeholder="Type it into existence…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="chip-row">
          {VISION_WORDS.map((w) => (
            <button key={w} className="chip" onClick={() => setText(w)}>
              {w}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field-label">Font</label>
        <div className="font-options">
          {(Object.keys(TEXT_STYLE_LABELS) as TextStyle[]).map((s) => (
            <button key={s} className={`font-option font-option--${s} ${style === s ? 'is-on' : ''}`} onClick={() => setStyle(s)}>
              <b>{s === 'display' ? 'AA' : 'Aa'}</b>
              <span>{TEXT_STYLE_LABELS[s]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field-label">Color</label>
        <div className="swatches">
          {TEXT_COLORS.map((c) => (
            <button key={c} className={`swatch ${color === c ? 'is-on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
          ))}
          <button className={`chip ${label ? 'is-on' : ''}`} onClick={() => setLabel((l) => !l)}>
            <Highlighter size={14} /> Label
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function ExportSheet({ open, board, onClose }: { open: boolean; board: Board; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBlob(null);
    setUrl(null);
    renderBoard(board, board.aspect === '9:19.5' ? 1170 : 1080)
      .then((b) => {
        if (cancelled) return;
        setBlob(b);
        setUrl(URL.createObjectURL(b));
      })
      .catch(() => toast('Could not render the board', 'error'));
    return () => {
      cancelled = true;
    };
    // Render once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const filename = `${board.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'vision'}-obsessed.png`;
  const file = blob ? new File([blob], filename, { type: 'image/png' }) : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: board.title });
    } catch {
      /* cancelled */
    }
  };
  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Export"
      title={board.aspect === '9:19.5' ? 'MAKE IT YOUR WALLPAPER' : 'SAVE THE BOARD'}
      footer={
        <div className="stack gap-s">
          {canShare && (
            <button className="btn btn--primary btn--block btn--big" onClick={share} disabled={!blob}>
              <Share2 size={18} /> Save / Share image
            </button>
          )}
          <button className={`btn ${canShare ? 'btn--ghost' : 'btn--primary btn--big'} btn--block`} onClick={download} disabled={!blob}>
            <Download size={18} /> Download PNG
          </button>
        </div>
      }
    >
      <div className={`export-preview export-preview--${board.aspect.replace(/[:.]/g, '-')}`}>
        {url ? <img src={url} alt="Exported board" /> : <div className="export-loading"><span className="spinner" /> Rendering in full resolution…</div>}
      </div>
      {board.aspect === '9:19.5' && (
        <p className="muted small center">
          iPhone: Save Image → Photos → Share → Use as Wallpaper. Android: open the image → Set as wallpaper. You’ll see it every time you pick up your phone.
        </p>
      )}
    </Sheet>
  );
}

function Present({ board, onClose }: { board: Board; onClose: () => void }) {
  useBackToClose(true, onClose);
  return createPortal(
    <div className="present" onClick={onClose} style={{ ['--present-ratio' as string]: 1 / boardHeight(board.aspect) }}>
      <BoardView board={board} full className="present-board" />
      <span className="present-hint">Tap to close</span>
    </div>,
    document.body,
  );
}
