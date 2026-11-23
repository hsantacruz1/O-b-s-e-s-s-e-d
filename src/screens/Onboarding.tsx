import { ChevronLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { HoldButton, Wordmark } from '../components/Bits';
import { db, saveProfile } from '../lib/db';
import { formatDuration } from '../lib/dates';
import { buzz } from '../lib/haptics';
import { uid } from '../lib/ids';
import { OATH } from '../lib/mantras';
import { OBSESSION_COLORS, PRESETS, type Preset } from '../lib/presets';
import { loadSampleData } from '../lib/sample';

interface Pick {
  key: string;
  preset: Preset;
  target: number;
  why: string;
}

const TARGETS = [15, 30, 45, 60, 90, 120];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [picks, setPicks] = useState<Pick[]>([]);
  const [custom, setCustom] = useState('');
  const [sealed, setSealed] = useState(false);

  const toggle = (p: Preset) => {
    buzz(8);
    setPicks((cur) => (cur.some((x) => x.key === p.name) ? cur.filter((x) => x.key !== p.name) : [...cur, { key: p.name, preset: p, target: p.target, why: '' }]));
  };

  const addCustom = () => {
    const n = custom.trim();
    if (!n) return;
    const color = OBSESSION_COLORS[picks.length % OBSESSION_COLORS.length];
    setPicks((cur) => [...cur, { key: `${n}-${uid()}`, preset: { name: n, emoji: '🔥', color, target: 60, why: '', metrics: [] }, target: 60, why: '' }]);
    setCustom('');
  };

  const finish = async () => {
    setSealed(true);
    await db.obsessions.bulkAdd(
      picks.map((p, i) => ({
        id: uid(),
        name: p.preset.name,
        emoji: p.preset.emoji,
        color: p.preset.color,
        why: p.why.trim() || p.preset.why,
        dailyTargetMin: p.target,
        metrics: p.preset.metrics.map((m) => ({ ...m, id: uid() })),
        createdAt: Date.now(),
        archived: false,
        order: i + 1,
      })),
    );
    // Let the moment land, then flip into the app.
    window.setTimeout(async () => {
      await saveProfile({ name: name.trim(), onboardedAt: Date.now() });
      onDone();
    }, 2000);
  };

  /** Skip setup and land in a populated app (sample data is removable in Settings). */
  const demo = async () => {
    setSealed(true);
    await loadSampleData();
    await saveProfile({ name: '', onboardedAt: Date.now() - 26 * 86_400_000 });
    onDone();
  };

  const next = () => {
    buzz(8);
    setStep((s) => s + 1);
  };

  return (
    <div className={`onboard onboard--step${step}`}>
      <div className="onboard-glow" />
      {step > 0 && !sealed && (
        <header className="topbar topbar--clear">
          <button className="icon-btn" onClick={() => setStep((s) => s - 1)} aria-label="Back">
            <ChevronLeft size={24} />
          </button>
          <div className="onboard-dots">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={i <= step ? 'on' : ''} />
            ))}
          </div>
          <span style={{ width: 40 }} />
        </header>
      )}

      {step === 0 && (
        <div className="onboard-body onboard-intro">
          <div className="onboard-intro-top">
            <Wordmark size={44} />
          </div>
          <div className="onboard-intro-lines">
            <p className="fade-1">Every legend had one thing in common.</p>
            <p className="fade-2">Not talent. Not luck.</p>
            <h1 className="fade-3">They got obsessed.</h1>
          </div>
          <div className="onboard-intro-foot fade-4">
            <button className="btn btn--primary btn--block btn--huge" onClick={next}>
              Begin
            </button>
            <button className="link-btn onboard-demo" onClick={demo} disabled={sealed}>
              Just looking? Explore with sample data
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="onboard-body">
          <div className="onboard-q">
            <div className="eyebrow">01 · Identity</div>
            <h2>What do they call you?</h2>
          </div>
          <input
            className="input input--huge"
            placeholder="Your name"
            value={name}
            autoFocus
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && next()}
          />
          <div className="onboard-foot">
            <button className="btn btn--primary btn--block btn--big" onClick={next} disabled={!name.trim()}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="onboard-body">
          <div className="onboard-q">
            <div className="eyebrow">02 · The craft</div>
            <h2>What are you obsessed with?</h2>
            <p>Pick one to three. Focus is a superpower.</p>
          </div>
          <div className="preset-grid">
            {PRESETS.map((p) => {
              const on = picks.some((x) => x.key === p.name);
              return (
                <button key={p.name} className={`preset ${on ? 'is-on' : ''}`} style={{ ['--oc' as string]: p.color }} onClick={() => toggle(p)}>
                  <span className="preset-emoji">{p.emoji}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
            {picks
              .filter((p) => !PRESETS.some((x) => x.name === p.key))
              .map((p) => (
                <button key={p.key} className="preset is-on" style={{ ['--oc' as string]: p.preset.color }} onClick={() => setPicks((c) => c.filter((x) => x.key !== p.key))}>
                  <span className="preset-emoji">{p.preset.emoji}</span>
                  <span>{p.preset.name}</span>
                </button>
              ))}
          </div>
          <div className="row gap-s">
            <input className="input" placeholder="Something else…" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} maxLength={28} />
            <button className="btn btn--ghost btn--icon" onClick={addCustom} aria-label="Add custom obsession">
              <Plus size={20} />
            </button>
          </div>
          <div className="onboard-foot">
            <button className="btn btn--primary btn--block btn--big" onClick={next} disabled={picks.length === 0}>
              {picks.length > 3 ? `${picks.length} it is. Bold.` : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="onboard-body">
          <div className="onboard-q">
            <div className="eyebrow">03 · The commitment</div>
            <h2>How much, every day?</h2>
            <p>Be honest. Consistency beats intensity.</p>
          </div>
          <div className="commit-list">
            {picks.map((p, i) => (
              <div key={p.key} className="commit" style={{ ['--oc' as string]: p.preset.color }}>
                <div className="commit-head">
                  <span className="commit-emoji">{p.preset.emoji}</span>
                  <b>{p.preset.name}</b>
                  <span className="commit-val">{formatDuration(p.target)}/day</span>
                </div>
                <div className="chip-row">
                  {TARGETS.map((t) => (
                    <button key={t} className={`chip ${p.target === t ? 'is-on' : ''}`} onClick={() => setPicks((c) => c.map((x, j) => (j === i ? { ...x, target: t } : x)))}>
                      {formatDuration(t)}
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  placeholder={p.preset.why || 'Why does this matter to you?'}
                  value={p.why}
                  onChange={(e) => setPicks((c) => c.map((x, j) => (j === i ? { ...x, why: e.target.value } : x)))}
                />
              </div>
            ))}
          </div>
          <div className="onboard-foot">
            <button className="btn btn--primary btn--block btn--big" onClick={next}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="onboard-body onboard-oath">
          {!sealed ? (
            <>
              <div className="onboard-q">
                <div className="eyebrow">04 · The oath</div>
                <h2>Say it like you mean it.</h2>
              </div>
              <blockquote className="oath">{OATH}</blockquote>
              <p className="muted center">
                {name.trim() || 'You'}, from today the work comes first. Every rep goes on the record.
              </p>
              <div className="onboard-foot">
                <HoldButton onComplete={finish} className="btn--huge">
                  Hold to commit
                </HoldButton>
              </div>
            </>
          ) : (
            <div className="sealed">
              <div className="sealed-ring" />
              <Wordmark size={40} />
              <p>Welcome to the obsessed, {name.trim() || 'legend'}.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
