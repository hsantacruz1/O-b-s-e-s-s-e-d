import { uid } from './ids';
import { loadPhotoImage } from './images';
import { BOARD_BG_MAP } from './presets';
import type { Board, BoardAspect, BoardImageItem, BoardItem, BoardTextItem, TextStyle } from './types';

/** Board height in "board-width" units. */
export function boardHeight(aspect: BoardAspect): number {
  return aspect === '9:19.5' ? 19.5 / 9 : aspect === '4:5' ? 5 / 4 : 1;
}

export const ASPECTS: { value: BoardAspect; label: string; hint: string }[] = [
  { value: '9:19.5', label: 'Wallpaper', hint: 'Lock screen' },
  { value: '4:5', label: 'Portrait', hint: 'Post' },
  { value: '1:1', label: 'Square', hint: 'Grid' },
];

export const FONT_FOR: Record<TextStyle, { family: string; weight: number; italic?: boolean; upper?: boolean; line: number; tracking: number }> = {
  display: { family: '"Cormorant Garamond"', weight: 400, line: 1.04, tracking: -0.01 },
  serif: { family: '"Cormorant Garamond"', weight: 400, italic: true, line: 1.08, tracking: 0 },
  sans: { family: '"Jost Variable", Jost', weight: 500, upper: true, line: 1.3, tracking: 0.28 },
  script: { family: '"Jost Variable", Jost', weight: 300, line: 1.2, tracking: 0.02 },
};

export const TEXT_STYLE_ORDER: TextStyle[] = ['display', 'serif', 'sans', 'script'];
export const TEXT_STYLE_LABELS: Record<TextStyle, string> = { display: 'Classic', serif: 'Italic', sans: 'Gallery', script: 'Light' };

/* ───────────── Seeded randomness so "shuffle" gives new layouts ───────────── */

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Guillotine split: carve the board into `n` tight tiles. */
function splitRect(r: Rect, n: number, rand: () => number): Rect[] {
  if (n <= 1) return [r];
  const a = Math.max(1, Math.min(n - 1, Math.round(n / 2 + (rand() - 0.5) * (n > 3 ? 1.5 : 0.6))));
  const ratio = Math.min(0.72, Math.max(0.28, a / n + (rand() - 0.5) * 0.18));
  // Split across the longer side, with a little chaos for variety.
  const vertical = r.w / r.h > 0.9 ? rand() > 0.25 : rand() > 0.85;
  if (vertical) {
    const w1 = r.w * ratio;
    return [...splitRect({ x: r.x, y: r.y, w: w1, h: r.h }, a, rand), ...splitRect({ x: r.x + w1, y: r.y, w: r.w - w1, h: r.h }, n - a, rand)];
  }
  const h1 = r.h * ratio;
  return [...splitRect({ x: r.x, y: r.y, w: r.w, h: h1 }, a, rand), ...splitRect({ x: r.x, y: r.y + h1, w: r.w, h: r.h - h1 }, n - a, rand)];
}

export type LayoutKind = 'collage' | 'scatter' | 'grid';

export function autoLayout(board: Board, kind: LayoutKind, seed = Date.now()): BoardItem[] {
  const H = boardHeight(board.aspect);
  const rand = rng(seed);
  const images = board.items.filter((i): i is BoardImageItem => i.type === 'image');
  const texts = board.items.filter((i): i is BoardTextItem => i.type === 'text');
  const n = images.length;
  if (!n) return board.items;

  let placed: BoardImageItem[] = [];
  if (kind === 'collage') {
    const margin = 0.03;
    const gap = 0.012;
    const rects = splitRect({ x: margin, y: margin, w: 1 - margin * 2, h: H - margin * 2 }, n, rand);
    placed = images.map((img, i) => ({
      ...img,
      x: rects[i].x + gap / 2,
      y: rects[i].y + gap / 2,
      w: rects[i].w - gap,
      h: rects[i].h - gap,
      r: 0,
      z: i + 1,
      frame: 'none',
    }));
  } else if (kind === 'grid') {
    const cols = n <= 2 ? 1 : n <= 6 ? 2 : 3;
    const rows = Math.ceil(n / cols);
    const margin = 0.04;
    const gap = 0.02;
    const cw = (1 - margin * 2 - gap * (cols - 1)) / cols;
    const ch = (H - margin * 2 - gap * (rows - 1)) / rows;
    placed = images.map((img, i) => ({
      ...img,
      x: margin + (i % cols) * (cw + gap),
      y: margin + Math.floor(i / cols) * (ch + gap),
      w: cw,
      h: ch,
      r: 0,
      z: i + 1,
      frame: 'none',
    }));
  } else {
    // Scatter: polaroids tossed on a table.
    const cols = n <= 3 ? 1 : 2;
    const rows = Math.ceil(n / cols);
    const cellW = 1 / cols;
    const cellH = H / rows;
    const size = Math.min(cols === 1 ? 0.62 : 0.5, cellH * 1.05);
    placed = images.map((img, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const w = size * (0.9 + rand() * 0.2);
      const h = w * 1.18;
      const cx = (col + 0.5) * cellW + (rand() - 0.5) * cellW * 0.35;
      const cy = (row + 0.5) * cellH + (rand() - 0.5) * cellH * 0.25;
      return {
        ...img,
        w,
        h,
        x: Math.min(1 - w + 0.03, Math.max(-0.03, cx - w / 2)),
        y: Math.min(H - h + 0.02, Math.max(0.01, cy - h / 2)),
        r: (rand() - 0.5) * 18,
        z: i + 1,
        frame: 'polaroid',
      };
    });
  }

  // Shuffle which photo lands where, so "shuffle" feels alive.
  if (kind !== 'grid') {
    const slots = placed.map(({ x, y, w, h, r }) => ({ x, y, w, h, r }));
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    placed = placed.map((p, i) => ({ ...p, ...slots[i] }));
  }

  const top = placed.length;
  return [...placed, ...texts.map((t, i) => ({ ...t, z: top + i + 1 }))];
}

export function newImageItem(board: Board, photoId: string, aspectRatio: number, index: number): BoardImageItem {
  const H = boardHeight(board.aspect);
  const w = 0.46;
  const h = Math.min(H * 0.5, w / Math.max(0.3, aspectRatio));
  const maxZ = board.items.reduce((m, i) => Math.max(m, i.z), 0);
  return {
    id: uid(),
    type: 'image',
    photoId,
    w,
    h,
    x: 0.08 + ((index * 0.17) % 0.4),
    y: H * 0.15 + ((index * 0.21) % (H * 0.5)),
    r: (index % 2 ? 1 : -1) * (2 + (index % 3)),
    z: maxZ + 1,
    frame: 'none',
  };
}

export function newTextItem(board: Board, text: string, style: TextStyle, color: string): BoardTextItem {
  const H = boardHeight(board.aspect);
  const maxZ = board.items.reduce((m, i) => Math.max(m, i.z), 0);
  const size = style === 'display' ? 0.12 : style === 'serif' ? 0.1 : style === 'sans' ? 0.042 : 0.07;
  return { id: uid(), type: 'text', text, style, color, bg: null, x: 0.08, y: H * 0.42, w: 0.84, h: size * 1.4, size, r: 0, z: maxZ + 1 };
}

/* ───────────── Export to a real image (wallpaper) ───────────── */

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

export async function renderBoard(board: Board, width = 1170): Promise<Blob> {
  await document.fonts.ready;
  // Make sure every text style's font is actually loaded before drawing.
  await Promise.all(
    (Object.keys(FONT_FOR) as TextStyle[]).map((s) => {
      const f = FONT_FOR[s];
      return document.fonts.load(`${f.italic ? 'italic ' : ''}${f.weight} 40px ${f.family}`).catch(() => null);
    }),
  );
  const H = boardHeight(board.aspect);
  const W = width;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = Math.round(W * H);
  const ctx = canvas.getContext('2d')!;
  const bg = BOARD_BG_MAP.get(board.background) ?? BOARD_BG_MAP.get('bone')!;

  if (bg.stops.length === 1) {
    ctx.fillStyle = bg.stops[0][1];
  } else {
    const a = ((bg.angle - 90) * Math.PI) / 180;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const len = Math.abs(canvas.width * Math.cos(a)) / 2 + Math.abs(canvas.height * Math.sin(a)) / 2;
    const g = ctx.createLinearGradient(cx - Math.cos(a) * len, cy - Math.sin(a) * len, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    bg.stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const items = [...board.items].sort((a, b) => a.z - b.z);
  const images = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    items.filter((i): i is BoardImageItem => i.type === 'image').map(async (i) => images.set(i.photoId, await loadPhotoImage(i.photoId))),
  );

  for (const item of items) {
    const x = item.x * W;
    const y = item.y * W;
    const w = item.w * W;
    const h = item.h * W;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((item.r * Math.PI) / 180);

    if (item.type === 'image') {
      const img = images.get(item.photoId);
      let ix = -w / 2;
      let iy = -h / 2;
      let iw = w;
      let ih = h;
      if (item.frame === 'polaroid') {
        ctx.shadowColor = 'rgba(20,18,15,0.18)';
        ctx.shadowBlur = W * 0.03;
        ctx.shadowOffsetY = W * 0.01;
        ctx.fillStyle = '#FBFAF8';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.shadowColor = 'transparent';
        const pad = w * 0.055;
        ix = -w / 2 + pad;
        iy = -h / 2 + pad;
        iw = w - pad * 2;
        ih = h - pad - w * 0.2;
      }
      if (img) {
        const ir = img.naturalWidth / img.naturalHeight;
        const fr = iw / ih;
        let sw = img.naturalWidth;
        let sh = img.naturalHeight;
        let sx = 0;
        let sy = 0;
        if (ir > fr) {
          sw = sh * fr;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          sh = sw / fr;
          sy = (img.naturalHeight - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, ix, iy, iw, ih);
      }
    } else {
      const f = FONT_FOR[item.style];
      const size = item.size * W;
      ctx.font = `${f.italic ? 'italic ' : ''}${f.weight} ${size}px ${f.family}`;
      // Tracking, where the browser's canvas supports it.
      if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${f.tracking * size}px`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = f.upper ? item.text.toUpperCase() : item.text;
      const lines = wrapLines(ctx, text, w - size * 0.3 - (item.bg ? size * 0.7 : 0));
      const lh = size * f.line;
      const blockH = lines.length * lh;
      if (item.bg) {
        const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
        ctx.fillStyle = item.bg;
        const padX = size * 0.35;
        const padY = size * 0.18;
        ctx.fillRect(-widest / 2 - padX, -blockH / 2 - padY, widest + padX * 2, blockH + padY * 2);
      }
      ctx.fillStyle = item.color;
      lines.forEach((l, i) => ctx.fillText(l, 0, -blockH / 2 + lh * (i + 0.5)));
    }
    ctx.restore();
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png'));
}
