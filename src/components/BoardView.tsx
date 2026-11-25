import type { CSSProperties } from 'react';
import { FONT_FOR } from '../lib/board';
import { BOARD_BG_MAP } from '../lib/presets';
import type { Board, BoardItem } from '../lib/types';
import { Photo } from './Bits';

const cq = (v: number) => `${(v * 100).toFixed(3)}cqw`;

export function itemStyle(item: BoardItem): CSSProperties {
  return {
    left: cq(item.x),
    top: cq(item.y),
    width: cq(item.w),
    height: item.type === 'image' ? cq(item.h) : undefined,
    minHeight: item.type === 'text' ? cq(item.h) : undefined,
    transform: `rotate(${item.r}deg)`,
    zIndex: item.z,
  };
}

export function BoardItemContent({ item, full }: { item: BoardItem; full?: boolean }) {
  if (item.type === 'image') {
    if (item.frame === 'polaroid') {
      return (
        <div
          className="bi-polaroid"
          style={{ padding: `${cq(item.w * 0.055)} ${cq(item.w * 0.055)} ${cq(item.w * 0.2)}` }}
        >
          <Photo id={item.photoId} size={full ? 'full' : 'thumb'} />
        </div>
      );
    }
    return <Photo id={item.photoId} size={full ? 'full' : 'thumb'} className="bi-photo" />;
  }
  const f = FONT_FOR[item.style];
  return (
    <div
      className="bi-text"
      style={{
        fontFamily: f.family,
        fontWeight: f.weight,
        fontStyle: f.italic ? 'italic' : 'normal',
        textTransform: f.upper ? 'uppercase' : 'none',
        lineHeight: f.line,
        letterSpacing: `${f.tracking}em`,
        fontSize: cq(item.size),
        color: item.color,
      }}
    >
      <span style={item.bg ? { background: item.bg, padding: '0.18em 0.35em' } : undefined}>{item.text}</span>
    </div>
  );
}

/** Read-only render of a board. Scales to whatever width it's given. */
export function BoardView({ board, full, className = '' }: { board: Board; full?: boolean; className?: string }) {
  const bg = BOARD_BG_MAP.get(board.background) ?? BOARD_BG_MAP.get('bone')!;
  const ratio = board.aspect === '9:19.5' ? '9 / 19.5' : board.aspect === '4:5' ? '4 / 5' : '1 / 1';
  return (
    <div className={`board ${className}`} style={{ aspectRatio: ratio, background: bg.css }}>
      {board.items.map((item) => (
        <div key={item.id} className={`bi bi--${item.type}`} style={itemStyle(item)}>
          <BoardItemContent item={item} full={full} />
        </div>
      ))}
    </div>
  );
}
