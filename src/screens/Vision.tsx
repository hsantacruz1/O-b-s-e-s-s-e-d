import { Image, Pin, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Empty, Segmented } from '../components/Bits';
import { BoardView } from '../components/BoardView';
import { Sheet } from '../components/Sheet';
import { ASPECTS } from '../lib/board';
import { db } from '../lib/db';
import { useBoards } from '../lib/hooks';
import { uid } from '../lib/ids';
import { BOARD_BACKGROUNDS, BOARD_TEMPLATES } from '../lib/presets';
import { navigate, useRoute } from '../lib/router';
import type { BoardAspect } from '../lib/types';

export function Vision() {
  const boards = useBoards();
  const { query } = useRoute();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (query.get('new')) {
      setCreating(true);
      navigate('/vision', { replace: true });
    }
  }, [query]);

  return (
    <div className="screen">
      <header className="screen-head">
        <h1 className="display">Vision</h1>
        <p>See it clearly before you live it.</p>
      </header>

      {boards && boards.length === 0 ? (
        <Empty
          icon={<Image size={26} strokeWidth={1.1} />}
          title="An empty wall"
          body="Gather images of the stage, the body, the home, the life. Arrange them with care, and return to them every day."
          action={
            <button className="btn btn--primary" onClick={() => setCreating(true)}>
              <Plus size={16} strokeWidth={1.5} /> New vision board
            </button>
          }
        />
      ) : (
        <div className="board-grid">
          <button className="board-card board-card--new" onClick={() => setCreating(true)}>
            <Plus size={22} strokeWidth={1.1} />
            <span>New board</span>
          </button>
          {boards?.map((b) => (
            <button key={b.id} className="board-card" onClick={() => navigate(`/vision/${b.id}`)}>
              <div className="board-card-art mat">
                <BoardView board={b} />
              </div>
              <div className="board-card-title">
                {b.title}
                {b.pinned && <Pin size={11} strokeWidth={1.5} />}
              </div>
              <div className="board-card-meta">{b.items.filter((i) => i.type === 'image').length} images</div>
            </button>
          ))}
        </div>
      )}

      <NewBoardSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function NewBoardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [aspect, setAspect] = useState<BoardAspect>('9:19.5');
  const [bg, setBg] = useState('bone');

  useEffect(() => {
    if (open) {
      setTitle('');
      setAspect('9:19.5');
      setBg('bone');
    }
  }, [open]);

  const create = async () => {
    const id = uid();
    const count = await db.boards.count();
    await db.boards.add({
      id,
      title: title.trim() || 'The Vision',
      aspect,
      background: bg,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: count === 0,
    });
    // navigate() swaps out the sheet's history entry, so back from the editor lands on /vision.
    navigate(`/vision/${id}?add=1`);
  };

  return (
    <Sheet open={open} onClose={onClose} eyebrow="New" title="Vision board" footer={<button className="btn btn--primary btn--block btn--big" onClick={create}>Create and add images</button>}>
      <div className="field">
        <label className="field-label" htmlFor="board-title">Name it</label>
        <input id="board-title" className="input" placeholder="The Vision" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="chip-row">
          {BOARD_TEMPLATES.map((t) => (
            <button key={t} className={`chip ${title === t ? 'is-on' : ''}`} onClick={() => setTitle(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="field-label">Shape</label>
        <Segmented
          value={aspect}
          onChange={setAspect}
          options={ASPECTS.map((a) => ({ value: a.value, label: <span className="seg-2">{a.label}<em>{a.hint}</em></span> }))}
        />
      </div>
      <div className="field">
        <label className="field-label">Background</label>
        <div className="swatches">
          {BOARD_BACKGROUNDS.map((b) => (
            <button key={b.id} className={`swatch swatch--lg ${bg === b.id ? 'is-on' : ''}`} style={{ background: b.css }} onClick={() => setBg(b.id)} aria-label={b.label}>
              <span style={{ color: b.ink }}>{b.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
