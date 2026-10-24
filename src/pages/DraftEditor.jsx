import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import { blocksToHtml } from '../services/draftApi.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export default function DraftEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);   // { id, type, facts, versions, step, updated_at, ... }
  const [doc, setDoc] = useState(null);            // { blocks, title, unresolved, warnings, review }
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('saved');     // saved | saving | error
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState('');            // '' | 'export' | 'finalise'
  const wsRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const sRes = await fetch(`${API_BASE}/api/drafts/sessions/${id}`, { credentials: 'include' });
      if (!sRes.ok) throw new Error(sRes.status === 401 ? 'Your session has expired. Please sign in again.' : (sRes.status === 404 ? 'That draft could not be found.' : 'load'));
      const s = await sRes.json();
      setSession(s);
      setTitle(s.title || '');

      const versions = Array.isArray(s.versions) ? s.versions : [];
      if (versions.length) {
        // Latest saved version (versions[0] is the current one) carries the rendered document.
        const vid = versions[0].id;
        const vRes = await fetch(`${API_BASE}/api/drafts/sessions/${id}/versions/${vid}`, { credentials: 'include' });
        if (!vRes.ok) throw new Error(vRes.status === 401 ? 'Your session has expired. Please sign in again.' : 'load');
        const v = await vRes.json();
        setDoc(v.document || null);
        if (!s.title && v.document?.title) setTitle(v.document.title);
      } else if (s.type) {
        // No saved version yet — render a live preview from the facts entered so far.
        const rRes = await fetch(`${API_BASE}/api/drafts/render`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
          body: JSON.stringify({ type: s.type, facts: s.facts || {} }),
        });
        if (!rRes.ok) throw new Error(rRes.status === 401 ? 'Your session has expired. Please sign in again.' : 'load');
        setDoc(await rRes.json());
      } else {
        setDoc(null);
      }
    } catch (e) {
      setError(e.message === 'load' ? 'Could not open this draft. Please try again.' : e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback(async (patch) => {
    setSaved('saving'); setActionError('');
    try {
      const res = await fetch(`${API_BASE}/api/drafts/sessions/${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session has expired. Please sign in again.' : (data.error || data.message || 'Could not save.'));
      setSaved('saved');
      return data;
    } catch (e) {
      setSaved('error'); setActionError(e.message);
      throw e;
    }
  }, [id]);

  const saveTimer = useRef(null);
  function onTitle(v) {
    setTitle(v);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { persist({ title: v }).catch(() => {}); }, 700);
  }
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  function fullscreen() {
    const el = wsRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }

  async function exportDocx() {
    if (!doc || busy) return;
    setBusy('export'); setActionError('');
    try {
      const res = await fetch(`${API_BASE}/api/drafts/export`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ document: doc, format: 'docx' }),
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session has expired. Please sign in again.' : 'Could not export the document.');
      const blob = await res.blob();
      const name = (/filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '') || [])[1]
        || `${(title || doc.title || 'draft').replace(/[^\w.-]+/g, '_')}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function finalise() {
    if (!doc || busy) return;
    setBusy('finalise');
    try {
      await persist({ document: doc, status: 'done', step: 'download', note: 'Finalised', title: title || undefined });
    } catch { /* actionError already set */ } finally {
      setBusy('');
    }
  }

  return (
    <div className="dez" ref={wsRef}>
      <header className="dez-head">
        <div className="dez-head-l">
          <button className="dez-back" onClick={() => navigate('/draft')} aria-label="Back"><Ic.Arrow size={15} style={{ transform: 'rotate(180deg)' }} /></button>
          <div className="dez-mono">L</div>
          <div className="dez-title-wrap">
            <input className="dez-title" value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Untitled draft" spellCheck={false} />
            <div className="dez-sub">
              {session?.type && <span>{session.type}</span>}
              <span className={`dez-save dez-save--${saved}`}>{saved === 'saving' ? 'Saving…' : saved === 'error' ? 'Not saved' : 'All changes saved'}</span>
            </div>
          </div>
        </div>

        <div className="dez-head-r">
          <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={fullscreen} title="Full screen"><Ic.Draft size={14} /> Focus</button>
          <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={exportDocx} disabled={!doc || Boolean(busy)} title="Export .docx"><Ic.Upload size={14} /> {busy === 'export' ? 'Exporting…' : 'Export'}</button>
          <button className="lx-btn lx-btn--gold lx-btn--sm" onClick={finalise} disabled={!doc || Boolean(busy)}><Ic.Check size={14} /> {busy === 'finalise' ? 'Saving…' : 'Finalise'}</button>
        </div>
      </header>

      <div className="dez-body">
        <div className="dez-editor">
          {loading ? (
            <div className="lx-empty" style={{ padding: '60px 0' }}><p>Opening your draft…</p></div>
          ) : error ? (
            <div className="lx-empty" style={{ padding: '60px 0' }}>
              <div className="lx-empty__ico"><Ic.Doc size={22} /></div>
              <h4>Couldn’t open this draft</h4><p>{error}</p>
              <div className="lx-row" style={{ gap: 10, marginTop: 12, justifyContent: 'center' }}>
                <button className="lx-btn lx-btn--sm" onClick={load}>Try again</button>
                <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => navigate('/draft')}>Back to drafts</button>
              </div>
            </div>
          ) : !doc || !Array.isArray(doc.blocks) || doc.blocks.length === 0 ? (
            <div className="lx-empty" style={{ padding: '60px 0' }}>
              <div className="lx-empty__ico"><Ic.Doc size={22} /></div>
              <h4>Nothing to show yet</h4>
              <p>This draft has no content yet. Add the matter’s details to generate the document.</p>
            </div>
          ) : (
            <>
              {actionError && <div role="alert" style={{ color: 'var(--risk)', fontSize: 13, marginBottom: 14 }}>{actionError}</div>}
              {Array.isArray(doc.unresolved) && doc.unresolved.length > 0 && (
                <div className="lx-badge lx-badge--warn" style={{ marginBottom: 16 }}>
                  {doc.unresolved.length} highlighted blank{doc.unresolved.length === 1 ? '' : 's'} to fill before use
                </div>
              )}
              <article
                className="dez-paper"
                aria-label="Draft document"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 6, padding: 'clamp(28px, 5vw, 56px)', fontFamily: 'var(--font-serif)', color: 'var(--ink)', lineHeight: 1.85, fontSize: 14.5, maxWidth: 820, margin: '0 auto', overflowWrap: 'anywhere' }}
                dangerouslySetInnerHTML={{ __html: blocksToHtml(doc.blocks) }}
              />
              {Array.isArray(doc.warnings) && doc.warnings.length > 0 && (
                <div className="lx-card lx-card--pad" style={{ marginTop: 18 }}>
                  <div className="lx-muted" style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Please check</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: 'var(--ink-soft)' }}>
                    {doc.warnings.map((w, i) => <li key={i}>{w.message || String(w)}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
