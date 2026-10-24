import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const TABS = ['Overview', 'Documents', 'Hearings', 'Timeline', 'Parties', 'Notes'];

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}
function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
function fullDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}
function whenLabel(raw) {
  if (!raw) return '—';
  const s = String(raw).includes('T') ? raw : String(raw).replace(' ', 'T');
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return shortDate(raw);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}
function titleCase(s) {
  return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// Real practice case -> the luxury detail view model (replaces the old sample lookup).
function caseToMatter(c) {
  const du = daysUntil(c.next_hearing);
  let tone = 'ok';
  if (c.closed) tone = 'muted';
  else if (du != null && du >= 0 && du <= 7) tone = 'warn';
  const num = c.case_no || '—';
  return {
    title: c.title || 'Untitled matter',
    court: c.court || '—',
    num,
    type: c.case_type || c.category || 'Matter',
    filed: fullDate(c.filing_date),
    lead: c.advocate_name || '—',
    status: c.closed ? 'Disposed' : (c.status || 'Active'),
    tone,
    stage: titleCase(c.next_action || c.status) || '—',
    next: shortDate(c.next_hearing),
    nextFull: fullDate(c.next_hearing),
    client: c.client_name || '—',
    judge: c.judge || '—',
    oppositeParty: c.opposite_party || '—',
    summary: (c.remarks || '').trim(),
  };
}

const PARTY_TONE = { petitioner: 'muted', respondent: 'muted', opposing_counsel: 'muted', witness: 'muted' };
const HEARING_TONE = (status) => (status === 'scheduled' ? 'warn' : status === 'adjourned' ? 'muted' : 'ok');
const TIMELINE_TONE = (kind) => (kind === 'note' ? 'accent' : (kind === 'status' || kind === 'hearing') ? 'ok' : 'muted');

export default function MatterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  // Timeline (lazy, loaded when the tab is opened)
  const [timeline, setTimeline] = useState([]);
  const [tlState, setTlState] = useState({ loading: false, error: '', loaded: false });

  // Notes (lazy)
  const [notes, setNotes] = useState([]);
  const [notesState, setNotesState] = useState({ loading: false, error: '', loaded: false });
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(''); setNotFound(false);
    try {
      const res = await fetch(`${API_BASE}/api/practice/cases/${id}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) { setNotFound(true); return; }
        throw new Error(res.status === 401 ? 'Your session has expired. Please sign in again.' : 'load');
      }
      const data = await res.json();
      setCaseData(data.case || null);
      if (!data.case) setNotFound(true);
    } catch (e) {
      setError(e.message === 'load' ? 'Could not load this matter. Please try again.' : e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const loadTimeline = useCallback(async () => {
    setTlState({ loading: true, error: '', loaded: false });
    try {
      const res = await fetch(`${API_BASE}/api/practice/cases/${id}/timeline`, { credentials: 'include' });
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session has expired. Please sign in again.' : 'load');
      const data = await res.json();
      setTimeline(Array.isArray(data.items) ? data.items : []);
      setTlState({ loading: false, error: '', loaded: true });
    } catch (e) {
      setTlState({ loading: false, error: e.message === 'load' ? 'Could not load the timeline.' : e.message, loaded: true });
    }
  }, [id]);

  const loadNotes = useCallback(async () => {
    setNotesState({ loading: true, error: '', loaded: false });
    try {
      const res = await fetch(`${API_BASE}/api/practice/cases/${id}/notes`, { credentials: 'include' });
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session has expired. Please sign in again.' : 'load');
      const data = await res.json();
      setNotes(Array.isArray(data.notes) ? data.notes : []);
      setNotesState({ loading: false, error: '', loaded: true });
    } catch (e) {
      setNotesState({ loading: false, error: e.message === 'load' ? 'Could not load notes.' : e.message, loaded: true });
    }
  }, [id]);

  useEffect(() => {
    if (tab === 'Timeline' && !tlState.loaded && !tlState.loading) loadTimeline();
    if (tab === 'Notes' && !notesState.loaded && !notesState.loading) loadNotes();
  }, [tab, tlState.loaded, tlState.loading, notesState.loaded, notesState.loading, loadTimeline, loadNotes]);

  const saveNote = async () => {
    const body = noteDraft.trim();
    if (!body) return;
    setSavingNote(true); setNoteError('');
    try {
      const res = await fetch(`${API_BASE}/api/practice/cases/${id}/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || (res.status === 401 ? 'Your session has expired. Please sign in again.' : 'Could not save the note.'));
      setNoteDraft('');
      if (data.note) setNotes((prev) => [data.note, ...prev]);
      else loadNotes();
    } catch (e) {
      setNoteError(e.message);
    } finally {
      setSavingNote(false);
    }
  };

  // ── Page-level loading / error / not-found states ──────────────────────────
  if (loading) {
    return (
      <div className="lx-page lx-rise">
        <div className="dh">
          <button className="dh__back" onClick={() => navigate('/matters')}><Ic.Arrow size={14} style={{ transform: 'rotate(180deg)' }} /> All matters</button>
        </div>
        <div className="lx-card lx-card--pad"><div className="lx-empty"><p>Loading this matter…</p></div></div>
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="lx-page lx-rise">
        <div className="dh">
          <button className="dh__back" onClick={() => navigate('/matters')}><Ic.Arrow size={14} style={{ transform: 'rotate(180deg)' }} /> All matters</button>
        </div>
        <div className="lx-card lx-card--pad">
          <div className="lx-empty">
            <div className="lx-empty__ico"><Ic.Matters size={22} /></div>
            <h4>Matter not found</h4>
            <p>This matter may have been removed, or you may not have access to it.</p>
            <button className="lx-btn lx-btn--sm" style={{ marginTop: 10 }} onClick={() => navigate('/matters')}>Back to matters</button>
          </div>
        </div>
      </div>
    );
  }
  if (error || !caseData) {
    return (
      <div className="lx-page lx-rise">
        <div className="dh">
          <button className="dh__back" onClick={() => navigate('/matters')}><Ic.Arrow size={14} style={{ transform: 'rotate(180deg)' }} /> All matters</button>
        </div>
        <div className="lx-card lx-card--pad">
          <div className="lx-empty">
            <div className="lx-empty__ico"><Ic.Matters size={22} /></div>
            <h4>Couldn’t load this matter</h4>
            <p>{error || 'Something went wrong.'}</p>
            <button className="lx-btn lx-btn--sm" style={{ marginTop: 10 }} onClick={load}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  const m = caseToMatter(caseData);
  const parties = Array.isArray(caseData.parties) ? caseData.parties : [];
  const hearings = Array.isArray(caseData.hearings) ? caseData.hearings : [];
  const docCount = caseData.counts?.documents ?? 0;

  // When no formal party records exist, derive a graceful view from the case itself.
  const partyRows = parties.length
    ? parties.map((p) => ({ r: titleCase(p.role), n: p.name || '—', c: p.contact || p.notes || '—', tone: PARTY_TONE[p.role] || 'muted' }))
    : [
        m.client !== '—' && { r: 'Client', n: m.client, c: 'On record', tone: 'muted' },
        m.oppositeParty !== '—' && { r: 'Opposite party', n: m.oppositeParty, c: '—', tone: 'muted' },
      ].filter(Boolean);

  return (
    <div className="lx-page lx-rise">
      <div className="dh">
        <button className="dh__back" onClick={() => navigate('/matters')}><Ic.Arrow size={14} style={{ transform: 'rotate(180deg)' }} /> All matters</button>
        <div className="dh__row">
          <div>
            <h1 className="dh__title font-display">{m.title}</h1>
            <div className="dh__meta">
              <span><b>{m.court}</b></span>
              <span>{m.num !== '—' ? m.num : m.type}</span>
              <span>Filed <b>{m.filed}</b></span>
              <span>Lead <b>{m.lead}</b></span>
            </div>
          </div>
          <div className="lx-row" style={{ gap: 10 }}>
            <span className={`lx-badge lx-badge--${m.tone}`} style={{ height: 32 }}>{m.status}</span>
            <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => navigate('/draft')}><Ic.Draft size={14} /> Draft</button>
            <button className="lx-btn lx-btn--gold lx-btn--sm"><Ic.Sparkle size={14} /> Ask about this matter</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="lx-dash-grid">
          <div className="lx-stack" style={{ gap: 24 }}>
            <div className="lx-card lx-card--pad">
              <div className="lx-section-head" style={{ marginBottom: 14 }}><h3>Summary</h3></div>
              {m.summary
                ? <p className="lx-lead" style={{ fontSize: 15, whiteSpace: 'pre-line' }}>{m.summary}</p>
                : <p className="lx-muted" style={{ fontSize: 14 }}>No summary recorded for this matter yet. Add remarks from your practice management to see them here.</p>}
            </div>
            <div className="lx-card lx-card--pad">
              <div className="lx-section-head" style={{ marginBottom: 18 }}><h3>Case details</h3></div>
              <div className="kv">
                <div><div className="kv__k">Bench</div><div className="kv__v">{m.judge}</div></div>
                <div><div className="kv__k">Stage</div><div className="kv__v">{m.stage}</div></div>
                <div><div className="kv__k">Next listing</div><div className="kv__v">{m.nextFull}</div></div>
                <div><div className="kv__k">Client</div><div className="kv__v">{m.client}</div></div>
                <div><div className="kv__k">Opposite party</div><div className="kv__v">{m.oppositeParty}</div></div>
                <div><div className="kv__k">Type</div><div className="kv__v">{m.type}</div></div>
              </div>
            </div>
            <div className="lx-card lx-card--pad" style={{ background: 'var(--accent-soft)', borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}>
              <div className="lx-row" style={{ gap: 8, marginBottom: 10 }}><span className="lx-badge"><Ic.Sparkle size={13} /> AI brief</span></div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--ink)' }}>
                An AI brief for this matter hasn’t been generated yet. Use <b>Ask about this matter</b> to build one from the case record, hearings and documents.
              </p>
            </div>
          </div>
          <aside className="lx-stack" style={{ gap: 24 }}>
            <div className="lx-card lx-card--pad">
              <div className="lx-section-head" style={{ marginBottom: 14 }}><h3>Next hearing</h3></div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--ink)' }}>{m.next}</div>
              <div className="lx-muted" style={{ marginTop: 4 }}>{m.nextFull}</div>
              <button className="lx-btn lx-btn--ghost lx-btn--sm lx-mt-m" style={{ width: '100%' }} onClick={() => navigate('/calendar')}>Open calendar</button>
            </div>
            <div className="lx-card lx-card--pad">
              <div className="lx-section-head" style={{ marginBottom: 12 }}><h3>Quick actions</h3></div>
              <div className="lx-stack" style={{ gap: 8 }}>
                {[['Draft a document', Ic.Draft], ['Research a point', Ic.Research], ['Add a note', Ic.Doc], ['Upload a file', Ic.Upload]].map(([l, I]) => (
                  <button key={l} className="lx-btn lx-btn--ghost" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => { if (l === 'Add a note') setTab('Notes'); }}><span style={{ color: 'var(--accent-ink)' }}><I size={16} /></span>{l}</button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === 'Documents' && (
        <div className="lx-card lx-card--pad">
          <div className="lx-between" style={{ marginBottom: 6 }}>
            <div className="lx-muted">{docCount} document{docCount === 1 ? '' : 's'}</div>
            <button className="lx-btn lx-btn--gold lx-btn--sm" onClick={() => navigate('/vault')}><Ic.Upload size={14} /> Open vault</button>
          </div>
          <div className="lx-empty">
            <div className="lx-empty__ico"><Ic.Doc size={22} /></div>
            <h4>{docCount ? 'Documents live in the vault' : 'No documents yet'}</h4>
            <p>{docCount
              ? `This matter has ${docCount} linked document${docCount === 1 ? '' : 's'}. Open the Document Vault to view, upload and share them.`
              : 'Upload or draft documents from the vault and they will be linked to this matter.'}</p>
          </div>
        </div>
      )}

      {tab === 'Hearings' && (
        <div className="lx-card lx-card--pad">
          {hearings.length === 0 ? (
            <div className="lx-empty">
              <div className="lx-empty__ico"><Ic.Gavel size={22} /></div>
              <h4>No hearings on record</h4>
              <p>Hearings added to this matter will appear here, most recent first.</p>
            </div>
          ) : (
            <div className="lx-list">
              {hearings.map((h) => (
                <div className="lx-item" key={h.id}>
                  <div style={{ width: 92, flexShrink: 0 }}><div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{shortDate(h.hearing_date)}</div></div>
                  <div className="lx-item__body">
                    <div className="lx-item__title" style={{ fontSize: 15 }}>{h.purpose || h.note || 'Hearing'}</div>
                    <div className="lx-item__meta">{[h.court || m.court, h.hall_no && `Hall ${h.hall_no}`, h.hearing_time].filter(Boolean).join(' · ') || '—'}</div>
                  </div>
                  <span className={`lx-badge lx-badge--${HEARING_TONE(h.status)}`}>{titleCase(h.status) || 'Listed'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Timeline' && (
        <div className="lx-card lx-card--pad">
          {tlState.loading ? (
            <div className="lx-empty"><p>Loading the timeline…</p></div>
          ) : tlState.error ? (
            <div className="lx-empty">
              <div className="lx-empty__ico"><Ic.Clock size={22} /></div>
              <h4>Couldn’t load the timeline</h4><p>{tlState.error}</p>
              <button className="lx-btn lx-btn--sm" style={{ marginTop: 10 }} onClick={loadTimeline}>Try again</button>
            </div>
          ) : timeline.length === 0 ? (
            <div className="lx-empty">
              <div className="lx-empty__ico"><Ic.Clock size={22} /></div>
              <h4>Nothing on the timeline yet</h4>
              <p>Filings, hearings, notes and updates on this matter will be logged here.</p>
            </div>
          ) : (
            <div className="tl">
              {timeline.map((t) => {
                const tone = TIMELINE_TONE(t.kind);
                return (
                  <div className="tl__item" key={t.id}>
                    <span className={`tl__dot ${tone === 'accent' ? 'tl__dot--accent' : tone === 'ok' ? 'tl__dot--ok' : ''}`} />
                    <div className="tl__when">{whenLabel(t.at)}</div>
                    <div className="tl__text">{t.title}</div>
                    <div className="tl__who">{t.actor || 'System'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'Parties' && (
        <div className="lx-card lx-card--pad">
          {partyRows.length === 0 ? (
            <div className="lx-empty">
              <div className="lx-empty__ico"><Ic.Users size={22} /></div>
              <h4>No parties on record</h4>
              <p>Parties added to this matter will appear here.</p>
            </div>
          ) : (
            <div className="lx-list">
              {partyRows.map((p, i) => (
                <div className="lx-item" key={i}>
                  <div className="lx-item__ico"><Ic.Users size={16} /></div>
                  <div className="lx-item__body"><div className="lx-item__title">{p.n}</div><div className="lx-item__meta">{p.c}</div></div>
                  <span className={`lx-badge lx-badge--${p.tone}`}>{p.r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Notes' && (
        <div className="lx-card lx-card--pad">
          <textarea className="inp" placeholder="Add a private note for this matter…" style={{ minHeight: 120, marginBottom: 14 }} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
          {noteError && <div role="alert" style={{ marginBottom: 10, color: 'var(--risk)', fontSize: 13 }}>{noteError}</div>}
          <div className="lx-between"><div className="lx-muted">Notes are visible to your chambers only.</div><button className="lx-btn lx-btn--primary lx-btn--sm" onClick={saveNote} disabled={savingNote || !noteDraft.trim()}>{savingNote ? 'Saving…' : 'Save note'}</button></div>
          <hr className="lx-rule" style={{ margin: '20px 0' }} />
          {notesState.loading ? (
            <div className="lx-empty"><p>Loading notes…</p></div>
          ) : notesState.error ? (
            <div className="lx-empty">
              <div className="lx-empty__ico"><Ic.Doc size={22} /></div>
              <h4>Couldn’t load notes</h4><p>{notesState.error}</p>
              <button className="lx-btn lx-btn--sm" style={{ marginTop: 10 }} onClick={loadNotes}>Try again</button>
            </div>
          ) : notes.length === 0 ? (
            <div className="lx-empty"><p>No notes yet. Add the first note above.</p></div>
          ) : (
            <div className="lx-list">
              {notes.map((n) => (
                <div className="lx-item" key={n.id} style={{ alignItems: 'flex-start' }}>
                  <div className="lx-item__ico" style={{ width: 32, height: 32 }}><Ic.Doc size={14} /></div>
                  <div className="lx-item__body"><div className="lx-item__meta" style={{ marginBottom: 3 }}>{(n.author || (n.mine ? 'You' : 'Team member'))} · {whenLabel(n.created_at)}</div><div style={{ fontSize: 14, color: 'var(--ink)', whiteSpace: 'pre-line' }}>{n.body}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
