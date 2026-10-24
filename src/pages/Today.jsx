import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const QUICK = [
  { Icon: Ic.Draft, label: 'Draft a document', to: '/draft' },
  { Icon: Ic.Research, label: 'Research the law', to: '/research' },
  { Icon: Ic.Contracts, label: 'Review a contract', to: '/contracts' },
  { Icon: Ic.Plus, label: 'Add a matter', to: '/matters?new=1' },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}
function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
const toneFor = (du) => (du != null && du <= 2 ? 'risk' : du != null && du <= 7 ? 'warn' : 'muted');

export default function Today() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ask, setAsk] = useState('');
  const [cases, setCases] = useState([]);
  const [draftCount, setDraftCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const firstName = (user?.name || user?.full_name || '').trim().split(' ')[0] || 'Counsel';

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cRes, dRes] = await Promise.all([
          fetch(`${API_BASE}/api/practice/cases?per_page=100&sort=next_hearing`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : { cases: [] })).catch(() => ({ cases: [] })),
          fetch(`${API_BASE}/api/drafts/sessions`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (!alive) return;
        setCases(Array.isArray(cRes.cases) ? cRes.cases : []);
        const sessions = dRes?.sessions || dRes?.items || (Array.isArray(dRes) ? dRes : []);
        setDraftCount(Array.isArray(sessions) ? sessions.length : null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const open = cases.filter((c) => !c.closed);
  const withHearing = open.filter((c) => c.next_hearing && daysUntil(c.next_hearing) != null && daysUntil(c.next_hearing) >= 0)
    .sort((a, b) => String(a.next_hearing).localeCompare(String(b.next_hearing)));
  const hearingsToday = withHearing.filter((c) => daysUntil(c.next_hearing) === 0);
  const thisWeek = withHearing.filter((c) => daysUntil(c.next_hearing) <= 7);
  const upcoming = withHearing.slice(0, 4);

  const STATS = [
    { Icon: Ic.Gavel, num: hearingsToday.length, label: 'Hearings today', sub: 'Cause list' },
    { Icon: Ic.Clock, num: thisWeek.length, label: 'Hearings this week', sub: '7-day watch' },
    { Icon: Ic.Draft, num: draftCount == null ? '—' : draftCount, label: 'Drafts in progress', sub: 'Your sessions' },
    { Icon: Ic.Matters, num: open.length, label: 'Open matters', sub: 'On record' },
  ];

  const subline = loading ? 'Pulling your day together…'
    : `${hearingsToday.length} hearing${hearingsToday.length === 1 ? '' : 's'} today, ${thisWeek.length} this week and ${open.length} open matter${open.length === 1 ? '' : 's'}.`;

  return (
    <div className="lx-page lx-rise">
      <div className="ph">
        <span className="ph__eyebrow">{date}</span>
        <h1 className="ph__title">{greeting()}, {firstName}</h1>
        <p className="ph__sub">{subline}</p>
      </div>

      {/* Command bar */}
      <form className="lx-field" style={{ height: 62 }}
        onSubmit={(e) => { e.preventDefault(); navigate('/draft', { state: ask ? { prompt: ask } : undefined }); }}>
        <Ic.Sparkle size={18} />
        <input value={ask} onChange={(e) => setAsk(e.target.value)}
          placeholder="Ask Lexamplify, or begin a draft — “Draft a legal notice for recovery of dues”" />
        <button type="submit" className="lx-btn lx-btn--primary lx-btn--sm"><Ic.Arrow size={15} /> Begin</button>
      </form>

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

      {/* Body */}
      <div className="lx-dash-grid lx-mt-xl">
        <div className="lx-stack" style={{ gap: 34 }}>
          {/* Upcoming hearings */}
          <section>
            <div className="lx-section-head">
              <h3>Upcoming hearings</h3>
              <a onClick={() => navigate('/calendar')}>Full calendar →</a>
            </div>
            <div className="lx-card lx-card--pad">
              <div className="lx-list">
                {loading ? <div className="lx-empty"><p>Loading…</p></div>
                  : upcoming.length === 0 ? <div className="lx-empty"><p>No upcoming hearings on record.</p></div>
                  : upcoming.map((c) => {
                    const du = daysUntil(c.next_hearing);
                    return (
                      <div className="lx-item" key={c.id} onClick={() => navigate('/matters/' + c.id)}>
                        <div style={{ textAlign: 'center', width: 56, flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{shortDate(c.next_hearing)}</div>
                          <div style={{ fontSize: 10, letterSpacing: '.06em', color: 'var(--muted)' }}>{du === 0 ? 'TODAY' : du === 1 ? 'TOMORROW' : `IN ${du}D`}</div>
                        </div>
                        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--rule)', margin: '2px 4px' }} />
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

          {/* Active matters */}
          <section>
            <div className="lx-section-head">
              <h3>Active matters</h3>
              <a onClick={() => navigate('/matters')}>All matters →</a>
            </div>
            <div className="lx-card lx-card--pad">
              <div className="lx-list">
                {loading ? <div className="lx-empty"><p>Loading…</p></div>
                  : open.length === 0 ? <div className="lx-empty"><p>No open matters yet. Add one from Matters.</p></div>
                  : open.slice(0, 5).map((c) => (
                    <div className="lx-item" key={c.id} onClick={() => navigate('/matters/' + c.id)}>
                      <div className="lx-item__ico"><Ic.Scale size={18} /></div>
                      <div className="lx-item__body">
                        <div className="lx-item__title">{c.title || 'Matter'}</div>
                        <div className="lx-item__meta">{[c.court, c.case_no].filter(Boolean).join(' · ') || '—'}</div>
                      </div>
                      <span className="lx-badge lx-badge--ok">{c.status || 'Active'}</span>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        </div>

        {/* Rail */}
        <aside className="lx-stack" style={{ gap: 24 }}>
          <section className="lx-card lx-card--pad">
            <div className="lx-section-head" style={{ marginBottom: 16 }}><h3>Quick actions</h3></div>
            <div className="lx-stack" style={{ gap: 10 }}>
              {QUICK.map((q) => (
                <button key={q.label} className="lx-btn lx-btn--ghost" style={{ justifyContent: 'flex-start', width: '100%', height: 46 }} onClick={() => navigate(q.to)}>
                  <span style={{ color: 'var(--accent-ink)', display: 'grid', placeItems: 'center' }}><q.Icon size={17} /></span>
                  {q.label}
                </button>
              ))}
            </div>
          </section>

          <section className="lx-card lx-card--pad">
            <div className="lx-section-head" style={{ marginBottom: 14 }}>
              <h3>Deadlines</h3>
              {thisWeek.length > 0 && <span className="lx-badge lx-badge--risk">{thisWeek.length} near</span>}
            </div>
            <div className="lx-list">
              {loading ? <div className="lx-empty"><p>Loading…</p></div>
                : thisWeek.length === 0 ? <div className="lx-empty"><p>Nothing due in the next 7 days.</p></div>
                : thisWeek.slice(0, 6).map((c) => {
                  const du = daysUntil(c.next_hearing);
                  const tone = toneFor(du);
                  return (
                    <div className="lx-item" key={c.id} style={{ padding: '13px 2px' }} onClick={() => navigate('/matters/' + c.id)}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: tone === 'risk' ? 'var(--risk)' : tone === 'warn' ? 'var(--warn)' : 'var(--muted-2)' }} />
                      <div className="lx-item__title" style={{ flex: 1, fontSize: 13.5, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{c.title || 'Matter'}</div>
                      <span className="lx-muted" style={{ fontWeight: 600, color: tone === 'risk' ? 'var(--risk)' : 'var(--ink-soft)' }}>{du === 0 ? 'today' : `${du} day${du === 1 ? '' : 's'}`}</span>
                    </div>
                  );
                })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
