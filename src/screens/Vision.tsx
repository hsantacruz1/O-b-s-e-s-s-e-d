import { Pin, Plus } from 'lucide-react';
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
        <h1 className="display">VISION</h1>
        <p>See it before you live it. Make it your lock screen.</p>
      </header>

      {boards && boards.length === 0 ? (
        <Empty
          emoji="🖼️"
          title="No boards yet"
          body="Collect photos of the stage, the body, the house, the plaque. Arrange them. Look at them every day."
          action={
            <button className="btn btn--primary" onClick={() => setCreating(true)}>
              <Plus size={18} /> New vision board
            </button>
          }
        />
      ) : (
        <div className="board-grid">
          <button className="board-card board-card--new" onClick={() => setCreating(true)}>
            <Plus size={28} />
            <span>New board</span>
          </button>
          {boards?.map((b) => (
            <button key={b.id} className="board-card" onClick={() => navigate(`/vision/${b.id}`)}>
              <div className="board-card-art">
                <BoardView board={b} />
              </div>
              <div className="board-card-title">
                {b.pinned && <Pin size={12} />} {b.title}
              </div>
              <div className="board-card-meta">{b.items.filter((i) => i.type === 'image').length} photos</div>
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
  const [bg, setBg] = useState('ink');

  useEffect(() => {
    if (open) {
      setTitle('');
      setAspect('9:19.5');
      setBg('ink');
    }
  }, [open]);

  const create = async () => {
    const id = uid();
    const count = await db.boards.count();
    await db.boards.add({
      id,
      title: title.trim() || 'My Vision',
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
    <Sheet open={open} onClose={onClose} eyebrow="New" title="VISION BOARD" footer={<button className="btn btn--primary btn--block btn--big" onClick={create}>Create &amp; add photos</button>}>
      <div className="field">
        <label className="field-label" htmlFor="board-title">Name it</label>
        <input id="board-title" className="input" placeholder="My Vision" value={title} onChange={(e) => setTitle(e.target.value)} />
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
              <span>{b.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
