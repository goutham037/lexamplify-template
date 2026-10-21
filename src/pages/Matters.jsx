import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import Modal from '../components/Modal.jsx';
import { MATTERS } from '../data/sample.js';

const TABS = ['All', 'Active', 'Hearing soon', 'Drafting', 'Disposed'];

export default function Matters() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const showNew = params.get('new') === '1';
  const closeNew = () => setParams({}, { replace: true });

  const rows = MATTERS.filter((m) =>
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
        <div className="lx-list">
          {rows.map((m) => (
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
          {rows.length === 0 && (
            <div className="lx-empty"><div className="lx-empty__ico"><Ic.Matters size={22} /></div><h4>No matters here</h4><p>Nothing matches this filter yet.</p></div>
          )}
        </div>
      </div>

      {showNew && (
        <Modal title="New matter" onClose={closeNew}
          footer={<><button className="lx-btn lx-btn--ghost" onClick={closeNew}>Cancel</button><button className="lx-btn lx-btn--primary" onClick={() => navigate('/matters/m-8842')}>Create matter</button></>}>
          <div><label className="lbl">Matter title</label><input className="inp" placeholder="e.g. Mehta Industries v. Union of India" /></div>
          <div className="lx-row" style={{ gap: 14 }}>
            <div style={{ flex: 1 }}><label className="lbl">Court</label><input className="inp" placeholder="Delhi High Court" /></div>
            <div style={{ flex: 1 }}><label className="lbl">Case / CNR no.</label><input className="inp" placeholder="W.P.(C) …" /></div>
          </div>
          <div><label className="lbl">Client</label><input className="inp" placeholder="Client name" /></div>
          <div className="lx-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {['Writ', 'Civil', 'Criminal', 'Advisory', 'Consumer'].map((t) => <span key={t} className="chip">{t}</span>)}
          </div>
        </Modal>
      )}
    </div>
  );
}
