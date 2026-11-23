import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SectionHead, Wordmark } from '../components/Bits';
import { exportBackup, importBackup, storageEstimate, wipeEverything } from '../lib/backup';
import { db, saveProfile } from '../lib/db';
import { toast } from '../lib/events';
import { useObsessions, useProfileOrDefault } from '../lib/hooks';
import { OATH } from '../lib/mantras';
import { goBack } from '../lib/router';
import { hasSampleData, loadSampleData, removeSampleData } from '../lib/sample';
import { ui } from '../lib/ui';

export function Settings() {
  const profile = useProfileOrDefault();
  const obsessions = useObsessions(true);
  const [name, setName] = useState(profile.name);
  const [mantra, setMantra] = useState('');
  const [usage, setUsage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const sample = useLiveQuery(hasSampleData, []);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => setName(profile.name), [profile.name]);
  useEffect(() => {
    storageEstimate().then(setUsage);
  }, []);

  const move = async (id: string, dir: -1 | 1) => {
    const list = [...obsessions];
    const i = list.findIndex((o) => o.id === id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await db.transaction('rw', db.obsessions, () => Promise.all(list.map((o, k) => db.obsessions.update(o.id, { order: k + 1 }))));
  };

  const doExport = async () => {
    setBusy('export');
    try {
      const file = await exportBackup();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'OBSESSED backup' }).catch(() => {});
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } finally {
      setBusy(null);
    }
  };

  const doImport = async (file: File) => {
    const ok = await ui.confirm({ title: 'Restore this backup?', body: 'Everything currently on this device is replaced with the backup.', confirmLabel: 'Restore', danger: true });
    if (!ok) return;
    setBusy('import');
    try {
      const r = await importBackup(file);
      toast(`Restored ${r.entries} reps and ${r.photos} photos`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Import failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const wipe = async () => {
    const ok = await ui.confirm({ title: 'Erase everything?', body: 'All obsessions, reps, photos and boards are deleted from this device. Export a backup first if you want to keep them.', confirmLabel: 'Erase all', danger: true });
    if (!ok) return;
    await wipeEverything();
    window.location.hash = '/';
    window.location.reload();
  };

  return (
    <div className="screen settings">
      <header className="topbar">
        <button className="icon-btn" onClick={() => goBack('/')} aria-label="Back">
          <ChevronLeft size={24} />
        </button>
        <h2 className="topbar-title">Settings</h2>
        <span style={{ width: 40 }} />
      </header>

      <SectionHead title="You" />
      <div className="card">
        <label className="field-label" htmlFor="name">Name</label>
        <input id="name" className="input" value={name} placeholder="What do they call you?" onChange={(e) => setName(e.target.value)} onBlur={() => saveProfile({ name: name.trim() })} />
      </div>

      <SectionHead title="Obsessions" action={<button className="link-btn" onClick={() => ui.openObsessionForm()}><Plus size={15} /> Add</button>} />
      <div className="list">
        {obsessions.map((o, i) => (
          <div key={o.id} className={`list-row ${o.archived ? 'is-muted' : ''}`}>
            <button className="list-row-main" onClick={() => ui.openObsessionForm(o.id)}>
              <span className="list-emoji" style={{ background: `${o.color}22`, color: o.color }}>{o.emoji}</span>
              <span>
                {o.name}
                {o.archived && <em> · archived</em>}
              </span>
            </button>
            <button className="icon-btn" onClick={() => move(o.id, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp size={16} /></button>
            <button className="icon-btn" onClick={() => move(o.id, 1)} disabled={i === obsessions.length - 1} aria-label="Move down"><ArrowDown size={16} /></button>
          </div>
        ))}
      </div>

      <SectionHead title="Your mantras" />
      <div className="card">
        <p className="muted small">Your own words show up in the daily mantra rotation, twice as often as ours.</p>
        <div className="mantra-list">
          {profile.customMantras.map((m, i) => (
            <div key={i} className="mantra-item">
              <span>“{m}”</span>
              <button className="icon-btn" aria-label="Remove mantra" onClick={() => saveProfile({ customMantras: profile.customMantras.filter((_, j) => j !== i) })}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="row gap-s">
          <input className="input" placeholder={OATH} value={mantra} onChange={(e) => setMantra(e.target.value)} />
          <button
            className="btn btn--primary btn--small"
            disabled={!mantra.trim()}
            onClick={() => {
              saveProfile({ customMantras: [...profile.customMantras, mantra.trim()] });
              setMantra('');
            }}
          >
            Add
          </button>
        </div>
      </div>

      {!isStandalone && (
        <>
          <SectionHead title="Put it on your home screen" />
          <div className="card install">
            {isIOS ? (
              <ol>
                <li>Tap the <b>Share</b> button in Safari.</li>
                <li>Choose <b>Add to Home Screen</b>.</li>
                <li>Open OBSESSED from your home screen. Full screen, works offline.</li>
              </ol>
            ) : (
              <ol>
                <li>Open the browser menu <b>⋮</b>.</li>
                <li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
                <li>Launch it like any other app. Works offline.</li>
              </ol>
            )}
          </div>
        </>
      )}

      <SectionHead title="Your data" />
      <div className="list">
        <button className="list-row" onClick={doExport} disabled={!!busy}>
          <span>{busy === 'export' ? 'Packing it up…' : 'Export backup'}</span>
          <ChevronRight size={16} />
        </button>
        <button className="list-row" onClick={() => importInput.current?.click()} disabled={!!busy}>
          <span>{busy === 'import' ? 'Restoring…' : 'Restore from backup'}</span>
          <ChevronRight size={16} />
        </button>
        {sample ? (
          <button className="list-row" onClick={async () => toast(`Removed ${await removeSampleData()} sample reps`)}>
            <span>Remove sample data</span>
            <ChevronRight size={16} />
          </button>
        ) : (
          <button className="list-row" onClick={async () => toast(`Added ${await loadSampleData()} sample reps`)}>
            <span>Load sample data (to explore)</span>
            <ChevronRight size={16} />
          </button>
        )}
        <button className="list-row list-row--danger" onClick={wipe}>
          <span>Erase everything</span>
        </button>
      </div>
      <p className="muted small pad-x">
        Everything lives on this device only: no account, no cloud, nobody watching. Export a backup now and then. {usage && `Using ${usage}.`}
      </p>
      <input
        ref={importInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) doImport(f);
          e.target.value = '';
        }}
      />

      <div className="about">
        <Wordmark size={28} />
        <p>Become obsessed. Stay obsessed.</p>
        <span>v{__APP_VERSION__}</span>
      </div>
    </div>
  );
}
