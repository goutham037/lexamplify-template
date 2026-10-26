import { useState, useEffect, useCallback } from 'react';
import * as Ic from '../icons.jsx';
import Modal from '../components/Modal.jsx';

// The firm's document-management store. Everything is read over the app's
// cookie-authenticated fetch; writes carry the CSRF token the server set.
//   GET  /api/dms/config            → { classes, trash_days, ocr, encryption, storage, max_file_mb }
//   GET  /api/dms/stats             → { documents, pages, bytes, added_7d, review, problems, legal_hold, trash, processing }
//   GET  /api/dms/docs?q&class&status&needs_review&problems&legal_hold&sort&per_page&page
//                                   → { docs: [...], total, terms, facets }
//   GET  /api/dms/docs/:id          → { doc: {...full document...} }
//   POST /api/dms/docs/:id/reprocess → re-reads a document that came in unreadable
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const DMS = `${API_BASE}/api/dms`;

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtNum = (n) => (n ?? 0).toLocaleString('en-IN');

function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}
function fmtAgo(s) {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return '';
  const sec = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.round(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)} h ago`;
  if (sec < 86400 * 7) return `${Math.round(sec / 86400)} d ago`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtBytes(n) {
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(n < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

// Short tag shown in each row's badge tile, derived from the file extension.
function fileTag(ext) {
  const e = String(ext || '').toLowerCase();
  if (e === 'pdf') return 'PDF';
  if (['doc', 'docx', 'rtf'].includes(e)) return 'DOC';
  if (['xls', 'xlsx', 'csv'].includes(e)) return 'XLS';
  if (['ppt', 'pptx'].includes(e)) return 'PPT';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff'].includes(e)) return 'IMG';
  if (['eml', 'msg'].includes(e)) return 'MAIL';
  if (['txt', 'md', 'htm', 'html'].includes(e)) return 'TXT';
  return (e || 'FILE').slice(0, 4).toUpperCase();
}

// How the server's processing status reads to the user, and which badge tone it wears.
const STATUS = {
  queued: { label: 'Waiting', tone: 'muted' },
  processing: { label: 'Reading', tone: 'muted' },
  ready: { label: 'Ready', tone: 'ok' },
  ready_partial: { label: 'Partly read', tone: 'warn' },
  needs_ocr: { label: 'Needs OCR', tone: 'warn' },
  empty: { label: 'No text', tone: 'warn' },
  unsupported: { label: 'Unreadable', tone: 'warn' },
  failed: { label: 'Failed', tone: 'risk' },
};
const statusOf = (s) => STATUS[s] || STATUS.ready;

// The server understands these filter shapes; each chip contributes its own query params.
const STATUS_FILTERS = [
  { key: 'all', label: 'All documents', params: {} },
  { key: 'ready', label: 'Ready', params: { status: 'ready' } },
  { key: 'review', label: 'Needs a look', params: { needs_review: '1' } },
  { key: 'problems', label: 'Not fully read', params: { problems: '1' } },
  { key: 'hold', label: 'Legal hold', params: { legal_hold: '1' } },
];

function metaLine(d) {
  const cases = (d.case_numbers || []).slice(0, 2).join(' · ');
  const bits = [cases, d.parties, d.court, fmtDate(d.doc_date)].filter(Boolean);
  if (!bits.length && d.original_name && d.original_name !== d.title) bits.push(d.original_name);
  return bits.join('  ·  ') || '—';
}

export default function DocumentHub() {
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState(null);
  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusKey, setStatusKey] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [openId, setOpenId] = useState(null);

  // Config + overview numbers load once; neither blocks the document list.
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${DMS}/config`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${DMS}/stats`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([c, s]) => { if (alive) { setConfig(c); setStats(s); } });
    return () => { alive = false; };
  }, []);

  const load = useCallback(async (signal) => {
    setLoading(true); setError('');
    try {
      const sf = STATUS_FILTERS.find((s) => s.key === statusKey) || STATUS_FILTERS[0];
      const p = new URLSearchParams();
      if (q.trim()) p.set('q', q.trim());
      if (typeFilter) p.set('class', typeFilter);
      Object.entries(sf.params).forEach(([k, v]) => p.set(k, v));
      p.set('sort', q.trim() ? 'relevance' : 'newest');
      p.set('per_page', '60');
      const res = await fetch(`${DMS}/docs?${p.toString()}`, { credentials: 'include', signal });
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session has expired. Please sign in again.' : 'load');
      const data = await res.json();
      setDocs(Array.isArray(data.docs) ? data.docs : []);
      setTotal(data.total ?? (data.docs?.length || 0));
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e.message === 'load' ? 'Could not load your documents. Please try again.' : e.message);
    } finally {
      setLoading(false);
    }
  }, [q, typeFilter, statusKey]);

  // Debounce only the typed search; chip changes feel instant.
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => load(ctrl.signal), q.trim() ? 280 : 0);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [load, q]);

  const typeOptions = (config?.classes || [])
    .map((c) => (typeof c === 'string' ? c : (c?.name || c?.label || c?.id)))
    .filter((c) => c && c !== 'Unclassified');

  const STAT_CARDS = [
    { Icon: Ic.Library, num: stats ? fmtNum(stats.documents) : '—', label: 'Documents', sub: stats ? `${fmtNum(stats.pages)} pages · ${fmtBytes(stats.bytes)}` : 'In the store' },
    { Icon: Ic.Upload, num: stats ? fmtNum(stats.added_7d) : '—', label: 'Added this week', sub: 'Last 7 days' },
    { Icon: Ic.Eye, num: stats ? fmtNum(stats.review) : '—', label: 'Need a quick look', sub: 'Type is a guess' },
    { Icon: Ic.Shield, num: stats ? fmtNum(stats.legal_hold) : '—', label: 'On legal hold', sub: 'Cannot be deleted' },
  ];

  const countLabel = loading ? 'Searching…'
    : q.trim() ? `${fmtNum(total)} ${total === 1 ? 'match' : 'matches'} for “${q.trim().slice(0, 36)}”`
    : `${fmtNum(total)} ${total === 1 ? 'document' : 'documents'}`;

  return (
    <div className="lx-page lx-rise">
      <div className="lx-between ph" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
        <div>
          <span className="ph__eyebrow">Document management</span>
          <h1 className="ph__title">Document Hub</h1>
          <p className="ph__sub">Every file your chambers holds — read, filed by type and searchable inside the pages.</p>
        </div>
        <div className="lx-field" style={{ height: 46, maxWidth: 320, flex: '1 1 240px' }}>
          <Ic.Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search inside every document…" style={{ fontSize: 14 }} />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search" style={{ display: 'grid', placeItems: 'center', background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', padding: 0 }}>
              <Ic.X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Overview */}
      <section className="lx-stats">
        {STAT_CARDS.map((s) => (
          <div className="lx-stat" key={s.label}>
            <div className="lx-stat__ico"><s.Icon size={18} /></div>
            <div className="lx-stat__num">{s.num}</div>
            <div className="lx-stat__label">{s.label}</div>
            <div className="lx-stat__sub">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Filters */}
      <div className="lx-mt-l" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="lx-row" style={{ gap: 7, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((f) => (
            <button key={f.key} className={`chip${statusKey === f.key ? ' is-on' : ''}`} onClick={() => setStatusKey(f.key)}>{f.label}</button>
          ))}
        </div>
        {typeOptions.length > 0 && (
          <div className="lx-row" style={{ gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="lx-item__meta" style={{ textTransform: 'uppercase', letterSpacing: '.07em', fontSize: 10.5 }}>By type</span>
            <button className={`chip${!typeFilter ? ' is-on' : ''}`} onClick={() => setTypeFilter('')}>Any</button>
            {typeOptions.map((t) => (
              <button key={t} className={`chip${typeFilter === t ? ' is-on' : ''}`} onClick={() => setTypeFilter(typeFilter === t ? '' : t)}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="lx-card lx-card--pad lx-mt-l">
        <div className="lx-between" style={{ marginBottom: 14 }}>
          <span className="lx-item__meta" aria-live="polite" style={{ fontSize: 13 }}>{error ? ' ' : countLabel}</span>
          {stats?.processing > 0 && (
            <span className="lx-badge lx-badge--muted">Reading {fmtNum(stats.processing)} in the background</span>
          )}
        </div>

        {loading ? (
          <div className="lx-empty"><p>Loading your documents…</p></div>
        ) : error ? (
          <div className="lx-empty">
            <div className="lx-empty__ico"><Ic.Library size={22} /></div>
            <h4>Couldn&apos;t load documents</h4><p>{error}</p>
            <button className="lx-btn lx-btn--sm" style={{ marginTop: 10 }} onClick={() => load()}>Try again</button>
          </div>
        ) : docs.length === 0 ? (
          <div className="lx-empty">
            <div className="lx-empty__ico"><Ic.Doc size={22} /></div>
            <h4>{q.trim() || statusKey !== 'all' || typeFilter ? 'Nothing matches' : 'No documents yet'}</h4>
            <p>{q.trim() || statusKey !== 'all' || typeFilter
              ? 'Try a shorter search, or clear a filter — searching looks inside every page, not just titles.'
              : 'Once your firm imports files, every page is read so you can search and file them here.'}</p>
            {(q.trim() || statusKey !== 'all' || typeFilter) && (
              <button className="lx-btn lx-btn--sm" onClick={() => { setQ(''); setStatusKey('all'); setTypeFilter(''); }}>Clear search &amp; filters</button>
            )}
          </div>
        ) : (
          <div className="lx-list">
            {docs.map((d) => {
              const st = statusOf(d.status);
              return (
                <div className="lx-item" key={d.id} onClick={() => setOpenId(d.id)} style={{ padding: '15px 4px', cursor: 'pointer' }}>
                  <div className="lx-item__ico" style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.03em' }}>{fileTag(d.ext)}</div>
                  <div className="lx-item__body" style={{ flex: 2 }}>
                    <div className="lx-item__title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {d.title || d.original_name || 'Untitled document'}
                      {d.legal_hold ? <Ic.Shield size={13} style={{ color: 'var(--accent-ink)', flexShrink: 0 }} /> : null}
                    </div>
                    <div className="lx-item__meta">{metaLine(d)}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }} className="hide-sm">
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{d.doc_class || 'Unclassified'}</div>
                    <div className="lx-item__meta">{d.page_count ? `${fmtNum(d.page_count)} ${d.page_count === 1 ? 'page' : 'pages'}` : fmtBytes(d.size)}</div>
                  </div>
                  <div style={{ width: 86, textAlign: 'right' }} className="hide-sm">
                    <div className="lx-item__meta" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10 }}>Added</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{fmtAgo(d.created_at)}</div>
                  </div>
                  <span className={`lx-badge lx-badge--${st.tone}`} style={{ minWidth: 92, justifyContent: 'center' }}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {openId != null && <DocDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Field({ label, children }) {
  if (children == null || children === '' ) return null;
  return (
    <div>
      <div className="lx-item__meta" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>{children}</div>
    </div>
  );
}

function DocDetail({ id, onClose }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    fetch(`${DMS}/docs/${id}`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error('load'); return r.json(); })
      .then((data) => { if (alive) setDoc(data.doc || data); })
      .catch(() => { if (alive) setError('Could not load this document.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const reprocess = async () => {
    setBusy(true); setNote('');
    try {
      const res = await fetch(`${DMS}/docs/${id}/reprocess`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
      });
      if (!res.ok) throw new Error('x');
      setNote('Queued to be read again — it will refresh here once done.');
    } catch {
      setNote('Could not queue it just now. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const st = doc ? statusOf(doc.status) : null;
  const unread = doc && ['failed', 'needs_ocr', 'ready_partial', 'empty', 'unsupported'].includes(doc.status);
  const title = doc?.title || doc?.original_name || 'Document';

  return (
    <Modal title={loading ? 'Loading…' : title} onClose={onClose} wide
      footer={doc ? (
        <>
          <button className="lx-btn lx-btn--ghost" onClick={onClose}>Close</button>
          {unread && <button className="lx-btn lx-btn--ghost" onClick={reprocess} disabled={busy}>{busy ? 'Queuing…' : 'Read again'}</button>}
          <a className="lx-btn lx-btn--gold" href={`${DMS}/docs/${id}/download`}><Ic.Upload size={14} style={{ transform: 'rotate(180deg)' }} /> Download original</a>
        </>
      ) : null}>
      {loading ? (
        <div className="lx-empty"><p>Opening the document…</p></div>
      ) : error ? (
        <div className="lx-empty">
          <div className="lx-empty__ico"><Ic.Doc size={22} /></div>
          <h4>Couldn&apos;t open it</h4><p>{error}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="lx-row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="chip" style={{ cursor: 'default' }}>{fileTag(doc.ext)}</span>
            <span className="chip" style={{ cursor: 'default' }}>{doc.doc_class || 'Unclassified'}</span>
            <span className={`lx-badge lx-badge--${st.tone}`}>{st.label}</span>
            {doc.legal_hold ? <span className="lx-badge lx-badge--warn"><Ic.Shield size={12} /> Legal hold</span> : null}
            {doc.version > 1 ? <span className="lx-badge lx-badge--muted">v{doc.version}</span> : null}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 18 }}>
            <Field label="File type">{(doc.ext || '').toUpperCase() || '—'}</Field>
            <Field label="Size">{fmtBytes(doc.size)}</Field>
            <Field label="Pages">{doc.page_count ? fmtNum(doc.page_count) : '—'}</Field>
            <Field label="Document date">{fmtDate(doc.doc_date) || '—'}</Field>
            <Field label="Added">{fmtAgo(doc.created_at) || '—'}</Field>
            <Field label="Court">{doc.court}</Field>
            <Field label="Parties">{doc.parties}</Field>
            <Field label="Next hearing">{fmtDate(doc.next_hearing)}</Field>
          </div>

          {(doc.case_numbers || []).length > 0 && (
            <div>
              <div className="lx-item__meta" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, marginBottom: 8 }}>Case numbers</div>
              <div className="lx-row" style={{ gap: 7, flexWrap: 'wrap' }}>
                {doc.case_numbers.map((c) => <span key={c} className="chip" style={{ cursor: 'default' }}>{c}</span>)}
              </div>
            </div>
          )}

          {(doc.tags || []).length > 0 && (
            <div>
              <div className="lx-item__meta" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, marginBottom: 8 }}>Tags</div>
              <div className="lx-row" style={{ gap: 7, flexWrap: 'wrap' }}>
                {doc.tags.map((t) => <span key={t} className="chip" style={{ cursor: 'default' }}>{t}</span>)}
              </div>
            </div>
          )}

          {(doc.summary || doc.snippet || doc.preview) && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 24px', fontFamily: 'var(--font-serif)', lineHeight: 1.8, fontSize: 14, color: 'var(--ink)', maxHeight: '32vh', overflowY: 'auto' }}>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{doc.summary || doc.snippet || doc.preview}</p>
            </div>
          )}

          {note && <div role="status" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{note}</div>}
        </div>
      )}
    </Modal>
  );
}
