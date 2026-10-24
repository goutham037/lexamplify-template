import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import Modal from '../components/Modal.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const TABS = ['All', 'Active', 'Hearing soon', 'Disposed'];

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}
function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}
function caseToRow(c) {
  const du = daysUntil(c.next_hearing);
  let status = 'Active', tone = 'ok';
  if (c.closed) { status = 'Disposed'; tone = 'muted'; }
  else if (du != null && du >= 0 && du <= 7) { status = 'Hearing soon'; tone = 'warn'; }
  return {
    id: c.id,
    title: c.title || 'Untitled matter',
    type: c.case_type || 'Matter',
    court: c.court || '—',
    num: c.case_no || '—',
    next: shortDate(c.next_hearing),
    status, tone,
  };
}

export default function Matters() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const showNew = params.get('new') === '1';
  const closeNew = () => setParams({}, { replace: true });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/practice/cases?per_page=100&sort=next_hearing`, { credentials: 'include' });
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session has expired. Please sign in again.' : 'load');
      const data = await res.json();
      setRows((data.cases || []).map(caseToRow));
    } catch (e) {
      setError(e.message === 'load' ? 'Could not load your matters. Please try again.' : e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((m) =>
    (tab === 'All' || m.status === tab) &&
    (m.title.toLowerCase().includes(q.toLowerCase()) || m.num.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="lx-page lx-rise">
      <div className="lx-between ph" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
        <div>
          <span className="ph__eyebrow">Workspace</span>
          <h1 className="ph__title">Matters</h1>
          <p className="ph__sub">Every case, brief and advisory in your chambers — in one place.</p>
        </div>
        <button className="lx-btn lx-btn--gold" onClick={() => setParams({ new: '1' })}><Ic.Plus size={15} /> New matter</button>
      </div>

      <div className="lx-between" style={{ marginBottom: 18, gap: 14, flexWrap: 'wrap' }}>
        <div className="lx-row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className="lx-btn lx-btn--sm"
              style={tab === t ? { background: 'var(--ink)', color: 'var(--paper)' } : { background: 'transparent', color: 'var(--ink-soft)', border: '1px solid var(--rule)' }}>{t}</button>
          ))}
        </div>
        <div className="lx-field" style={{ height: 40, maxWidth: 260 }}>
          <Ic.Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search matters…" style={{ fontSize: 14 }} />
        </div>
      </div>

      <div className="lx-card lx-card--pad">
        {loading ? (
          <div className="lx-empty"><p>Loading your matters…</p></div>
        ) : error ? (
          <div className="lx-empty">
            <div className="lx-empty__ico"><Ic.Matters size={22} /></div>
            <h4>Couldn’t load matters</h4><p>{error}</p>
            <button className="lx-btn lx-btn--sm" style={{ marginTop: 10 }} onClick={load}>Try again</button>
          </div>
        ) : (
          <div className="lx-list">
            {filtered.map((m) => (
              <div className="lx-item" key={m.id} onClick={() => navigate('/matters/' + m.id)} style={{ padding: '16px 4px' }}>
                <div className="lx-item__ico"><Ic.Scale size={18} /></div>
                <div className="lx-item__body" style={{ flex: 2 }}>
                  <div className="lx-item__title">{m.title}</div>
                  <div className="lx-item__meta">{m.type}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }} className="hide-sm">
                  <div style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>{m.court}</div>
                  <div className="lx-item__meta">{m.num}</div>
                </div>
                <div style={{ width: 70, textAlign: 'right' }} className="hide-sm">
                  <div className="lx-item__meta" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10 }}>Next</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{m.next}</div>
                </div>
                <span className={`lx-badge lx-badge--${m.tone}`} style={{ minWidth: 92, justifyContent: 'center' }}>{m.status}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="lx-empty">
                <div className="lx-empty__ico"><Ic.Matters size={22} /></div>
                <h4>{rows.length === 0 ? 'No matters yet' : 'No matters here'}</h4>
                <p>{rows.length === 0 ? 'Add your first matter to start tracking it.' : 'Nothing matches this filter yet.'}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showNew && <NewMatterModal onClose={closeNew} onCreated={(id) => { closeNew(); load(); if (id) navigate('/matters/' + id); }} />}
    </div>
  );
}

function NewMatterModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', court: '', case_no: '', client_name: '', case_type: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async () => {
    if (!form.title.trim()) { setErr('A matter title is required.'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch(`${API_BASE}/api/practice/cases`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ ...form, title: form.title.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Could not create the matter.');
      onCreated(data.case?.id || data.id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="New matter" onClose={onClose}
      footer={<><button className="lx-btn lx-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="lx-btn lx-btn--primary" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create matter'}</button></>}>
      {err && <div role="alert" style={{ marginBottom: 12, color: 'var(--risk)', fontSize: 13 }}>{err}</div>}
      <div><label className="lbl">Matter title</label><input className="inp" value={form.title} onChange={set('title')} placeholder="e.g. Mehta Industries v. Union of India" /></div>
      <div className="lx-row" style={{ gap: 14 }}>
        <div style={{ flex: 1 }}><label className="lbl">Court</label><input className="inp" value={form.court} onChange={set('court')} placeholder="Delhi High Court" /></div>
        <div style={{ flex: 1 }}><label className="lbl">Case / CNR no.</label><input className="inp" value={form.case_no} onChange={set('case_no')} placeholder="W.P.(C) …" /></div>
      </div>
      <div><label className="lbl">Client</label><input className="inp" value={form.client_name} onChange={set('client_name')} placeholder="Client name" /></div>
      <div className="lx-row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {['Writ', 'Civil', 'Criminal', 'Advisory', 'Consumer'].map((t) => (
          <span key={t} className="chip" onClick={() => setForm((f) => ({ ...f, case_type: t }))}
            style={form.case_type === t ? { background: 'var(--ink)', color: 'var(--paper)', cursor: 'pointer' } : { cursor: 'pointer' }}>{t}</span>
        ))}
      </div>
    </Modal>
  );
}
