import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SectionHead, Segmented, Wordmark } from '../components/Bits';
import { exportBackup, importBackup, storageEstimate, wipeEverything } from '../lib/backup';
import { db, saveProfile } from '../lib/db';
import { toast } from '../lib/events';
import { useObsessions, useProfileOrDefault } from '../lib/hooks';
import { OATH } from '../lib/mantras';
import { goBack } from '../lib/router';
import { hasSampleData, loadSampleData, removeSampleData } from '../lib/sample';
import { ObsessionIcon } from '../lib/icons';
import { setTheme, useThemePref } from '../lib/theme';
import { ui } from '../lib/ui';

export function Settings() {
  const profile = useProfileOrDefault();
  const obsessions = useObsessions(true);
  const [name, setName] = useState(profile.name);
  const [mantra, setMantra] = useState('');
  const [usage, setUsage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const theme = useThemePref();
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
      toast(`Restored ${r.entries} entries and ${r.photos} photographs`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Import failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const wipe = async () => {
    const ok = await ui.confirm({ title: 'Erase everything?', body: 'All obsessions, entries, photographs and boards are deleted from this device. Export a backup first if you want to keep them.', confirmLabel: 'Erase all', danger: true });
    if (!ok) return;
    await wipeEverything();
    window.location.hash = '/';
    window.location.reload();
  };

  return (
    <div className="screen settings">
      <header className="topbar">
        <button className="icon-btn" onClick={() => goBack('/')} aria-label="Back">
          <ChevronLeft size={24} strokeWidth={1.3} />
        </button>
        <h2 className="topbar-title">Settings</h2>
        <span style={{ width: 40 }} />
      </header>

      <SectionHead title="You" />
      <div className="card">
        <label className="field-label" htmlFor="name">Name</label>
        <input id="name" className="input" value={name} placeholder="What do they call you?" onChange={(e) => setName(e.target.value)} onBlur={() => saveProfile({ name: name.trim() })} />
      </div>

      <SectionHead title="Appearance" />
      <Segmented
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'system', label: 'Automatic' },
          { value: 'light', label: 'Marble' },
          { value: 'dark', label: 'Nero' },
        ]}
      />

      <SectionHead title="Obsessions" action={<button className="link-btn" onClick={() => ui.openObsessionForm()}><Plus size={14} strokeWidth={1.5} /> Add</button>} />
      <div className="list">
        {obsessions.map((o, i) => (
          <div key={o.id} className={`list-row ${o.archived ? 'is-muted' : ''}`}>
            <button className="list-row-main" onClick={() => ui.openObsessionForm(o.id)}>
              <span className="list-icon" style={{ ['--oc' as string]: o.color }}>
                <ObsessionIcon o={o} size={17} />
              </span>
              <span>
                {o.name}
                {o.archived && <em> · archived</em>}
              </span>
            </button>
            <button className="icon-btn" onClick={() => move(o.id, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp size={15} strokeWidth={1.4} /></button>
            <button className="icon-btn" onClick={() => move(o.id, 1)} disabled={i === obsessions.length - 1} aria-label="Move down"><ArrowDown size={15} strokeWidth={1.4} /></button>
          </div>
        ))}
      </div>

      <SectionHead title="Your mantras" />
      <div className="card">
        <p className="muted small">Your own words join the daily mantras, and appear twice as often.</p>
        <div className="mantra-list">
          {profile.customMantras.map((m, i) => (
            <div key={i} className="mantra-item">
              <span>“{m}”</span>
              <button className="icon-btn" aria-label="Remove mantra" onClick={() => saveProfile({ customMantras: profile.customMantras.filter((_, j) => j !== i) })}>
                <X size={15} strokeWidth={1.4} />
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
          <SectionHead title="Add to your home screen" />
          <div className="card install">
            {isIOS ? (
              <ol>
                <li>Tap the <b>Share</b> button in Safari.</li>
                <li>Choose <b>Add to Home Screen</b>.</li>
                <li>Open OBSESSED from your home screen. It runs full screen, and offline.</li>
              </ol>
            ) : (
              <ol>
                <li>Open the browser menu <b>⋮</b>.</li>
                <li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
                <li>Open it like any other app. It works offline.</li>
              </ol>
            )}
          </div>
        </>
      )}

      <SectionHead title="Your data" />
      <div className="list">
        <button className="list-row" onClick={doExport} disabled={!!busy}>
          <span>{busy === 'export' ? 'Preparing…' : 'Export backup'}</span>
          <ChevronRight size={15} strokeWidth={1.3} />
        </button>
        <button className="list-row" onClick={() => importInput.current?.click()} disabled={!!busy}>
          <span>{busy === 'import' ? 'Restoring…' : 'Restore from backup'}</span>
          <ChevronRight size={15} strokeWidth={1.3} />
        </button>
        {sample ? (
          <button className="list-row" onClick={async () => toast(`Removed ${await removeSampleData()} sample entries`)}>
            <span>Remove sample data</span>
            <ChevronRight size={15} strokeWidth={1.3} />
          </button>
        ) : (
          <button className="list-row" onClick={async () => toast(`Added ${await loadSampleData()} sample entries`)}>
            <span>Load sample data (to explore)</span>
            <ChevronRight size={15} strokeWidth={1.3} />
          </button>
        )}
        <button className="list-row list-row--danger" onClick={wipe}>
          <span>Erase everything</span>
        </button>
      </div>
      <p className="muted small pad-x">
        Everything stays on this device. No account, no cloud, no one watching. Export a backup from time to time. {usage && `Using ${usage}.`}
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
        <Wordmark size={15} />
        <p>Become obsessed. Stay obsessed.</p>
        <span>v{__APP_VERSION__}</span>
      </div>
    </div>
  );
}
