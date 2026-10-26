import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Ic from '../icons.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

// Matter types, ordered from the exposures that most often carry a
// positional conflict down to the quieter advisory work.
const MATTER_TYPES = ['Civil', 'Commercial', 'Corporate', 'Criminal', 'Matrimonial', 'Arbitration', 'IP', 'Writ'];

// Translate whatever the backend calls a match's severity into one of the
// three luxury badge tones. Anything that reads as a firm, live conflict is
// red; a softer "potential / review" match is amber; an explicit all-clear
// is green. Unknown labels fall back to amber so nothing dangerous is ever
// shown as safe by omission.
function toneForStatus(status) {
  const s = String(status || '').toLowerCase();
  if (/(high|direct|hard|actual|disqualif)/.test(s)) return 'risk';
  if (/(clear|none|no conflict|safe)/.test(s)) return 'ok';
  return 'warn';
}

// A debounced autocomplete field that suggests parties and matters already
// on record, so a name is checked in the exact form the practice stored it.
function PartyField({ label, value, onChange, placeholder, autoFocus }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) { setItems([]); setBusy(false); return; }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/cases/autocomplete?q=${encodeURIComponent(q)}`, { credentials: 'include' });
        const data = res.ok ? await res.json() : [];
        setItems(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch {
        setItems([]);
      } finally {
        setBusy(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const showMenu = open && value.trim().length >= 2;

  return (
    <div style={{ position: 'relative' }} ref={boxRef}>
      <label className="lbl">{label}</label>
      <input
        className="inp"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {showMenu && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20,
          background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 10,
          boxShadow: 'var(--lx-shadow-2)', overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
        }}>
          {busy ? (
            <div style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--muted)' }}>Searching records…</div>
          ) : items.length ? (
            items.map((it) => (
              <button
                key={it.id ?? it.title}
                type="button"
                onMouseDown={() => { onChange(it.title || it.name || ''); setOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', border: 0,
                  borderBottom: '1px solid var(--rule)', background: 'transparent', cursor: 'pointer',
                  padding: '10px 14px', fontSize: 13.5, color: 'var(--ink)', fontFamily: 'var(--font-sans)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 6%, transparent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {it.title || it.name}
              </button>
            ))
          ) : (
            <div style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--muted)' }}>No matching record on file.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConflictEngine() {
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const [client, setClient] = useState('');
  const [opponent, setOpponent] = useState('');
  const [matterType, setMatterType] = useState('Civil');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [checkedName, setCheckedName] = useState('');

  const matches = useMemo(() => (result && Array.isArray(result.results) ? result.results : []), [result]);

  // Normalize the three terminal states the backend can report, whatever
  // field it carries them in, so the result view below never has to guess.
  const outcome = useMemo(() => {
    if (!result) return null;
    const status = String(result.status || '').toLowerCase();
    if (matches.length > 0) return 'conflicts';
    if (status.includes('no record') || result.status === 'No Records') return 'no-records';
    return 'clear';
  }, [result, matches]);

  const searched = result?.searched || {};
  const searchedLine = useMemo(() => {
    const parts = [];
    if (searched.clients != null) parts.push(`${searched.clients} client${searched.clients === 1 ? '' : 's'}`);
    if (searched.cases != null) parts.push(`${searched.cases} matter${searched.cases === 1 ? '' : 's'}`);
    if (searched.parties != null) parts.push(`${searched.parties} part${searched.parties === 1 ? 'y' : 'ies'}`);
    return parts.join(' · ');
  }, [searched]);

  const canRun = client.trim().length > 0 && !loading;

  const run = useCallback(async () => {
    if (!client.trim() || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    const name = client.trim();
    try {
      const res = await fetch(`${API_BASE}/api/conflict/check`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({
          entity_name: name,
          opposing_party: opponent.trim(),
          matter_type: matterType,
        }),
      });
      if (!res.ok) {
        throw new Error(res.status === 401
          ? 'Your session has expired. Please sign in again.'
          : 'We could not complete the conflict check. Please try again.');
      }
      const data = await res.json();
      if (!mounted.current) return;
      setCheckedName(name);
      setResult(data || {});
    } catch (e) {
      if (!mounted.current) return;
      setError(e.message || 'We could not complete the conflict check. Please try again.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [client, opponent, matterType, loading]);

  const onSubmit = (e) => { e.preventDefault(); run(); };

  const reset = () => {
    setClient(''); setOpponent(''); setMatterType('Civil');
    setResult(null); setError(''); setCheckedName('');
  };

  return (
    <div className="lx-page lx-rise">
      <div className="ph">
        <span className="ph__eyebrow">Risk &amp; Compliance</span>
        <h1 className="ph__title">Conflict Engine</h1>
        <p className="ph__sub">
          Before you take on a matter, clear the parties against every client, adversary and
          case already on your record — in one pass.
        </p>
      </div>

      {/* Intake */}
      <form className="lx-card lx-card--pad" onSubmit={onSubmit}>
        <div className="lx-section-head" style={{ marginBottom: 20 }}>
          <h3><Ic.Shield size={17} style={{ verticalAlign: '-3px', marginRight: 8, color: 'var(--accent-ink)' }} />Clearance check</h3>
          {result && !loading && (
            <a onClick={reset} style={{ cursor: 'pointer' }}>Start over</a>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="lx-ce-grid">
          <PartyField
            label="Proposed client / party"
            value={client}
            onChange={setClient}
            placeholder="e.g. Mehta Industries Pvt. Ltd."
            autoFocus
          />
          <PartyField
            label="Opposing party"
            value={opponent}
            onChange={setOpponent}
            placeholder="Known adversary or counter-party (optional)"
          />
        </div>

        <div style={{ marginTop: 20 }}>
          <label className="lbl">Matter type</label>
          <div className="chip-row">
            {MATTER_TYPES.map((t) => (
              <span
                key={t}
                className={`chip${matterType === t ? ' is-on' : ''}`}
                onClick={() => setMatterType(t)}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="lx-between" style={{ marginTop: 24, gap: 14, flexWrap: 'wrap' }}>
          <p className="lx-muted" style={{ maxWidth: 440, margin: 0 }}>
            Only names recorded in your practice are searched. A clear result is a check, not a legal clearance.
          </p>
          <button type="submit" className="lx-btn lx-btn--gold" disabled={!canRun}>
            <Ic.Search size={15} /> {loading ? 'Scanning records…' : 'Run conflict check'}
          </button>
        </div>
      </form>

      {/* Results */}
      <div style={{ marginTop: 28 }}>
        {loading ? (
          <div className="lx-card lx-card--pad">
            <div className="lx-empty"><p>Scanning your practice records for a match…</p></div>
          </div>
        ) : error ? (
          <div className="lx-card lx-card--pad">
            <div className="lx-empty">
              <div className="lx-empty__ico"><Ic.Shield size={22} /></div>
              <h4>Check didn’t run</h4>
              <p>{error}</p>
              <button className="lx-btn lx-btn--sm" onClick={run}>Try again</button>
            </div>
          </div>
        ) : !result ? (
          <div className="lx-card lx-card--pad">
            <div className="lx-empty">
              <div className="lx-empty__ico"><Ic.Scale size={22} /></div>
              <h4>No check run yet</h4>
              <p>Enter a proposed client above and run a check to screen it against your records.</p>
            </div>
          </div>
        ) : outcome === 'conflicts' ? (
          <section>
            <div className="lx-section-head">
              <h3>
                {matches.length} possible conflict{matches.length === 1 ? '' : 's'} for “{checkedName}”
              </h3>
              {searchedLine && <span className="lx-muted">Searched {searchedLine}</span>}
            </div>
            {result.summary && (
              <p className="lx-muted" style={{ marginBottom: 16, maxWidth: 680 }}>{result.summary}</p>
            )}
            <div className="lx-card lx-card--pad">
              <div className="lx-list">
                {matches.map((m, i) => {
                  const tone = toneForStatus(m.conflict_status);
                  const sides = [m.client, m.opponent].filter(Boolean).join('  v.  ');
                  return (
                    <div className="lx-item" key={m.id ?? `${m.case_title}-${i}`} style={{ padding: '16px 4px' }}>
                      <div className="lx-item__ico"><Ic.Scale size={18} /></div>
                      <div className="lx-item__body" style={{ flex: 2 }}>
                        <div className="lx-item__title">{m.case_title || 'Matter on record'}</div>
                        <div className="lx-item__meta">{sides || '—'}</div>
                      </div>
                      {m.match_type && (
                        <div style={{ minWidth: 0 }} className="hide-sm">
                          <div className="lx-item__meta" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10 }}>Matched on</div>
                          <div style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>{m.match_type}</div>
                        </div>
                      )}
                      <span className={`lx-badge lx-badge--${tone}`} style={{ minWidth: 120, justifyContent: 'center' }}>
                        <span className="dot" />{m.conflict_status || 'Review'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="lx-muted" style={{ marginTop: 14 }}>
              Each match is a name overlap for you to weigh — not an automatic bar. The decision to accept the matter remains yours.
            </p>
          </section>
        ) : outcome === 'no-records' ? (
          <div className="lx-card lx-card--pad">
            <div className="lx-empty">
              <div className="lx-empty__ico"><Ic.Matters size={22} /></div>
              <h4>Nothing to check against yet</h4>
              <p>Your practice has no clients or matters on record, so there was nothing to search. Add them first, then run the check again.</p>
            </div>
          </div>
        ) : (
          <section>
            <div className="lx-card lx-card--pad">
              <div className="lx-empty">
                <div className="lx-empty__ico" style={{ background: 'color-mix(in srgb, var(--accent-success) 14%, transparent)', color: 'var(--accent-success)' }}>
                  <Ic.Check size={24} />
                </div>
                <h4>No conflicts found</h4>
                <p>
                  No record matching “{checkedName}”{opponent.trim() ? ` or “${opponent.trim()}”` : ''} was found
                  {searchedLine ? ` across ${searchedLine}` : ' in your practice records'}.
                </p>
              </div>
              <div style={{
                marginTop: 4, padding: '14px 16px', borderRadius: 12,
                background: 'var(--paper-2)', border: '1px solid var(--rule)',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <span style={{ color: 'var(--accent-ink)', flexShrink: 0, marginTop: 1 }}><Ic.Shield size={16} /></span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>This is a check, not a clearance</div>
                  <div className="lx-muted" style={{ marginTop: 3 }}>
                    Only names recorded in your practice were searched. The advocate remains responsible for deciding whether to accept the matter.
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <style>{`
        @media (max-width: 560px) { .lx-ce-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
