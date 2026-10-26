import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SESSION_EXPIRED = 'Your session has expired. Please sign in again.';

/* ── date helpers ─────────────────────────────────────────── */
function toDate(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function daysUntil(iso) {
  const d = toDate(iso);
  if (!d) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}
function shortDate(iso) {
  const d = toDate(iso);
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
}
function ago(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days}d ago` : shortDate(iso);
}
const toneFor = (du) => (du != null && du <= 2 ? 'risk' : du != null && du <= 7 ? 'warn' : 'muted');

/* Normalise the eCourts-synced tracked-case shape (/api/causelist/list)
   into one predictable row, since that payload is loosely typed. */
function normTracked(c) {
  const next = c.next_hearing || c.nextHearing || c.nextHearingDate || c.nextDate || c.next_date || null;
  return {
    id: c.id || c.caseId || c.cnr || c.cnr_number || c.case_no,
    title: c.title || c.caseTitle || c.case_title || c.name || 'Tracked matter',
    sub: c.court || c.courtName || c.cnr || c.cnr_number || '—',
    next,
  };
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [tracked, setTracked] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const firstName = (user?.name || user?.full_name || '').trim().split(' ')[0] || 'Counsel';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const get = async (path) => {
          const r = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
          if (r.status === 401) { const e = new Error(SESSION_EXPIRED); e.auth = true; throw e; }
          if (!r.ok) return null;
          return r.json().catch(() => null);
        };
        const [cRes, tRes, dRes] = await Promise.all([
          get('/api/practice/cases?per_page=100&sort=next_hearing'),
          get('/api/causelist/list').catch((e) => { if (e.auth) throw e; return null; }),
          get('/api/drafts/sessions').catch((e) => { if (e.auth) throw e; return null; }),
        ]);
        if (!alive) return;
        setCases(Array.isArray(cRes?.cases) ? cRes.cases : []);
        const tList = Array.isArray(tRes) ? tRes : tRes?.cases || tRes?.items || [];
        setTracked(tList.map(normTracked));
        const sList = dRes?.sessions || dRes?.items || (Array.isArray(dRes) ? dRes : []);
        setSessions(Array.isArray(sList) ? sList : []);
      } catch (e) {
        if (alive) setError(e.auth ? SESSION_EXPIRED : 'We could not load your chambers just now. Please try again.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ── derived analytics ─────────────────────────────────── */
  const open = useMemo(() => cases.filter((c) => !c.closed), [cases]);

  const hearings = useMemo(() =>
    open
      .filter((c) => c.next_hearing && daysUntil(c.next_hearing) != null && daysUntil(c.next_hearing) >= 0)
      .sort((a, b) => String(a.next_hearing).localeCompare(String(b.next_hearing))),
    [open]);
  const thisWeek = useMemo(() => hearings.filter((c) => daysUntil(c.next_hearing) <= 7), [hearings]);

  const draftsInProgress = useMemo(
    () => sessions.filter((s) => s.status !== 'done').length,
    [sessions]);

  const trackedDeadlines = useMemo(
    () => tracked
      .filter((t) => t.next && daysUntil(t.next) != null && daysUntil(t.next) >= 0)
      .sort((a, b) => String(a.next).localeCompare(String(b.next))),
    [tracked]);

  /* Caseload mix by matter type — an original at-a-glance breakdown. */
  const caseload = useMemo(() => {
    const by = new Map();
    open.forEach((c) => {
      const k = (c.case_type || 'Other').trim() || 'Other';
      by.set(k, (by.get(k) || 0) + 1);
    });
    const rows = [...by.entries()].map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
    const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
    return { rows: rows.slice(0, 6), max };
  }, [open]);

  const recentDrafts = useMemo(() =>
    [...sessions]
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
      .slice(0, 5),
    [sessions]);

  const STATS = [
    { Icon: Ic.Scale, num: open.length, label: 'Open matters', sub: 'On record' },
    { Icon: Ic.Gavel, num: thisWeek.length, label: 'Hearings this week', sub: 'Next 7 days' },
    { Icon: Ic.Draft, num: loading ? '—' : draftsInProgress, label: 'Drafts in progress', sub: 'Awaiting finalisation' },
    { Icon: Ic.Bell, num: trackedDeadlines.length, label: 'Tracked deadlines', sub: 'eCourts watch' },
  ];

  const subline = loading
    ? 'Gathering your chambers…'
    : error
      ? 'A quiet moment — your chambers will be back shortly.'
      : `${open.length} open matter${open.length === 1 ? '' : 's'}, ${thisWeek.length} hearing${thisWeek.length === 1 ? '' : 's'} this week, and ${draftsInProgress} draft${draftsInProgress === 1 ? '' : 's'} in hand.`;

  return (
    <div className="lx-page lx-rise">
      <div className="lx-between ph" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
        <div>
          <span className="ph__eyebrow">{today}</span>
          <h1 className="ph__title">{greeting()}, {firstName}</h1>
          <p className="ph__sub">{subline}</p>
        </div>
        <div className="lx-row" style={{ gap: 12 }}>
          <button className="lx-btn lx-btn--ghost" onClick={() => navigate('/calendar')}><Ic.Clock size={16} /> This week</button>
          <button className="lx-btn lx-btn--gold" onClick={() => navigate('/draft')}><Ic.Plus size={15} /> New draft</button>
        </div>
      </div>

      {error && (
        <div className="lx-card lx-card--pad lx-mt-l" role="alert">
          <div className="lx-empty">
            <div className="lx-empty__ico"><Ic.Shield size={22} /></div>
            <h4>{error === SESSION_EXPIRED ? 'Session expired' : 'Couldn’t load your dashboard'}</h4>
            <p>{error}</p>
            {error === SESSION_EXPIRED
              ? <button className="lx-btn lx-btn--primary" style={{ marginTop: 10 }} onClick={() => navigate('/login')}>Sign in</button>
              : <button className="lx-btn lx-btn--sm" style={{ marginTop: 10 }} onClick={() => window.location.reload()}>Try again</button>}
          </div>
        </div>
      )}

      {!error && (
        <>
          {/* Stats */}
          <section className="lx-stats lx-mt-l">
            {STATS.map((s) => (
              <div className="lx-stat" key={s.label}>
                <div className="lx-stat__ico"><s.Icon size={18} /></div>
                <div className="lx-stat__num">{s.num}</div>
                <div className="lx-stat__label">{s.label}</div>
                <div className="lx-stat__sub">{s.sub}</div>
              </div>
            ))}
          </section>

          <div className="lx-dash-grid lx-mt-xl">
            {/* Main column */}
            <div className="lx-stack" style={{ gap: 34 }}>
              {/* Upcoming hearings */}
              <section>
                <div className="lx-section-head">
                  <h3>Upcoming hearings</h3>
                  <a onClick={() => navigate('/matters')} style={{ cursor: 'pointer' }}>All matters →</a>
                </div>
                <div className="lx-card lx-card--pad">
                  <div className="lx-list">
                    {loading ? (
                      <div className="lx-empty"><p>Loading your hearings…</p></div>
                    ) : hearings.length === 0 ? (
                      <div className="lx-empty">
                        <div className="lx-empty__ico"><Ic.Gavel size={22} /></div>
                        <h4>No hearings on the horizon</h4>
                        <p>When a matter has a listed date, it will surface here first.</p>
                      </div>
                    ) : hearings.slice(0, 5).map((c) => {
                      const du = daysUntil(c.next_hearing);
                      return (
                        <div className="lx-item" key={c.id} onClick={() => navigate('/matters/' + c.id)}>
                          <div style={{ textAlign: 'center', width: 58, flexShrink: 0 }}>
                            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{shortDate(c.next_hearing)}</div>
                            <div style={{ fontSize: 10, letterSpacing: '.07em', color: 'var(--muted)' }}>
                              {du === 0 ? 'TODAY' : du === 1 ? 'TMRW' : `IN ${du}D`}
                            </div>
                          </div>
                          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--rule)', margin: '2px 2px' }} />
                          <div className="lx-item__body">
                            <div className="lx-item__title">{c.title || 'Matter'}</div>
                            <div className="lx-item__meta">{[c.court, c.case_no].filter(Boolean).join(' · ') || '—'}</div>
                          </div>
                          <span className={`lx-badge lx-badge--${toneFor(du)}`}>{du === 0 ? 'Today' : `${du}d`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Caseload at a glance */}
              <section>
                <div className="lx-section-head">
                  <h3>Caseload at a glance</h3>
                  <a onClick={() => navigate('/matters')} style={{ cursor: 'pointer' }}>Open matters →</a>
                </div>
                <div className="lx-card lx-card--pad">
                  {loading ? (
                    <div className="lx-empty"><p>Measuring your caseload…</p></div>
                  ) : open.length === 0 ? (
                    <div className="lx-empty">
                      <div className="lx-empty__ico"><Ic.Scale size={22} /></div>
                      <h4>No open matters yet</h4>
                      <p>Add a matter and your practice mix will chart itself here.</p>
                      <button className="lx-btn lx-btn--primary" style={{ marginTop: 12 }} onClick={() => navigate('/matters?new=1')}>
                        <Ic.Plus size={15} /> Add a matter
                      </button>
                    </div>
                  ) : (
                    <div className="lx-stack" style={{ gap: 16 }}>
                      {caseload.rows.map((r) => {
                        const pct = Math.round((r.count / caseload.max) * 100);
                        return (
                          <div key={r.label}>
                            <div className="lx-between" style={{ marginBottom: 7 }}>
                              <span style={{ fontSize: 13.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{r.label}</span>
                              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{r.count}</span>
                            </div>
                            <div style={{ height: 7, borderRadius: 99, background: 'var(--rule)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: 'var(--accent-ink)', transition: 'width .5s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Rail */}
            <aside className="lx-stack" style={{ gap: 24 }}>
              {/* Recent drafts */}
              <section className="lx-card lx-card--pad">
                <div className="lx-section-head" style={{ marginBottom: 14 }}>
                  <h3>Recent drafts</h3>
                  <a onClick={() => navigate('/draft')} style={{ cursor: 'pointer' }}>Studio →</a>
                </div>
                <div className="lx-list">
                  {loading ? (
                    <div className="lx-empty"><p>Loading…</p></div>
                  ) : recentDrafts.length === 0 ? (
                    <div className="lx-empty" style={{ padding: '22px 8px' }}>
                      <div className="lx-empty__ico" style={{ width: 44, height: 44 }}><Ic.Draft size={20} /></div>
                      <p style={{ marginBottom: 12 }}>No drafts yet. Begin one in the studio.</p>
                      <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => navigate('/draft')}>Start a draft</button>
                    </div>
                  ) : recentDrafts.map((s) => (
                    <div className="lx-item" key={s.id} style={{ padding: '13px 2px' }} onClick={() => navigate('/draft/' + s.id)}>
                      <div className="lx-item__ico" style={{ width: 34, height: 34 }}><Ic.Doc size={16} /></div>
                      <div className="lx-item__body">
                        <div className="lx-item__title" style={{ fontSize: 14 }}>{s.title || 'Untitled draft'}</div>
                        <div className="lx-item__meta">{s.updated_at ? `Edited ${ago(s.updated_at)}` : (s.type || 'Draft')}</div>
                      </div>
                      <span className={`lx-badge lx-badge--${s.status === 'done' ? 'ok' : 'warn'}`}>
                        {s.status === 'done' ? 'Final' : 'Draft'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Tracked deadlines — eCourts */}
              <section className="lx-card lx-card--pad">
                <div className="lx-section-head" style={{ marginBottom: 14 }}>
                  <h3>Tracked deadlines</h3>
                  {trackedDeadlines.length > 0 && (
                    <span className="lx-badge lx-badge--risk">{trackedDeadlines.length} ahead</span>
                  )}
                </div>
                <div className="lx-list">
                  {loading ? (
                    <div className="lx-empty"><p>Loading…</p></div>
                  ) : trackedDeadlines.length === 0 ? (
                    <div className="lx-empty" style={{ padding: '22px 8px' }}>
                      <div className="lx-empty__ico" style={{ width: 44, height: 44 }}><Ic.Bell size={20} /></div>
                      <p>No synced dates in your watchlist. Track a case by CNR to see limitation and listings here.</p>
                    </div>
                  ) : trackedDeadlines.slice(0, 6).map((t) => {
                    const du = daysUntil(t.next);
                    const tone = toneFor(du);
                    return (
                      <div className="lx-item" key={t.id} style={{ padding: '13px 2px' }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: tone === 'risk' ? 'var(--risk)' : tone === 'warn' ? 'var(--warn)' : 'var(--muted-2)',
                        }} />
                        <div className="lx-item__body">
                          <div className="lx-item__title" style={{ fontSize: 13.5, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{t.title}</div>
                          <div className="lx-item__meta">{t.sub}</div>
                        </div>
                        <span className="lx-muted" style={{ fontWeight: 600, fontSize: 12.5, color: tone === 'risk' ? 'var(--risk)' : 'var(--ink-soft)' }}>
                          {du === 0 ? 'today' : `${du}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
