import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import Modal from '../components/Modal.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Saved firm-library documents live on the server (filed from the editor's
// "Save a copy", Legal Forms and Auto-Draft Studio). GET /api/firm-library/saved
// returns a plain JSON array of { id, title, category, timestamp, text, html }.
function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(String(ts).replace(' ', 'T'));
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Library() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/firm-library/saved`, { credentials: 'include' });
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session has expired. Please sign in again.' : 'load');
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message === 'load' ? 'Could not load your library. Please try again.' : e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const term = q.trim().toLowerCase();
  const filtered = docs.filter((d) =>
    !term ||
    `${d.title || ''} ${d.category || ''} ${d.text || ''}`.toLowerCase().includes(term)
  );

  return (
    <div className="lx-page lx-rise">
      <div className="lx-between ph" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
        <div>
          <span className="ph__eyebrow">Firm knowledge</span>
          <h1 className="ph__title">Library</h1>
          <p className="ph__sub">Your chambers&apos; own saved documents and precedents — ready to draft from.</p>
        </div>
        <div className="lx-field" style={{ height: 42, maxWidth: 260 }}>
          <Ic.Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search library…" style={{ fontSize: 14 }} />
        </div>
      </div>

      <div className="lx-card lx-card--pad">
        {loading ? (
          <div className="lx-empty"><p>Loading your library…</p></div>
        ) : error ? (
          <div className="lx-empty">
            <div className="lx-empty__ico"><Ic.Library size={22} /></div>
            <h4>Couldn&apos;t load your library</h4><p>{error}</p>
            <button className="lx-btn lx-btn--sm" style={{ marginTop: 10 }} onClick={load}>Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="lx-empty">
            <div className="lx-empty__ico"><Ic.Library size={22} /></div>
            <h4>{docs.length === 0 ? 'Your library is empty' : 'Nothing matches'}</h4>
            <p>{docs.length === 0
              ? 'Save a document from the drafting editor to keep it here as a precedent.'
              : 'No saved documents match your search.'}</p>
          </div>
        ) : (
          <div className="lx-list">
            {filtered.map((d) => (
              <div className="lx-item" key={d.id}>
                <div className="lx-item__ico" style={{ width: 34, height: 34 }}><Ic.Doc size={15} /></div>
                <div className="lx-item__body" style={{ flex: 1, minWidth: 0 }}>
                  <div className="lx-item__title" style={{ fontSize: 15 }}>{d.title || 'Untitled document'}</div>
                  <div className="lx-item__meta">{[d.category || 'Draft', fmtDate(d.timestamp)].filter(Boolean).join(' · ')}</div>
                </div>
                <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => setPreview(d)}>Preview</button>
                <button className="lx-btn lx-btn--primary lx-btn--sm" onClick={() => navigate('/draft')}>Use</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <Modal title={preview.title || 'Document'} onClose={() => setPreview(null)} wide
          footer={<><button className="lx-btn lx-btn--ghost" onClick={() => setPreview(null)}>Close</button><button className="lx-btn lx-btn--gold" onClick={() => navigate('/draft')}><Ic.Sparkle size={14} /> Use as template</button></>}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 12, padding: '28px 32px', fontFamily: 'var(--font-serif)', lineHeight: 1.85, fontSize: 14, color: 'var(--ink)', maxHeight: '48vh', overflowY: 'auto' }}>
            {preview.text ? (
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{preview.text}</p>
            ) : preview.html ? (
              <div dangerouslySetInnerHTML={{ __html: preview.html }} />
            ) : (
              <p className="lx-muted" style={{ margin: 0 }}>No preview is available for this document.</p>
            )}
          </div>
          <div className="lx-muted" style={{ fontSize: 12.5 }}>
            {preview.category || 'Draft'} · saved {fmtDate(preview.timestamp)}
          </div>
        </Modal>
      )}
    </div>
  );
}
