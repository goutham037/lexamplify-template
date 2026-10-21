import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import Modal from '../components/Modal.jsx';
import { CONTRACTS } from '../data/sample.js';

export default function Contracts() {
  const navigate = useNavigate();
  const [upload, setUpload] = useState(false);

  return (
    <div className="lx-page lx-rise">
      <div className="lx-between ph" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
        <div>
          <span className="ph__eyebrow">Contract review</span>
          <h1 className="ph__title">Contracts</h1>
          <p className="ph__sub">Clauses read, risks surfaced and terms benchmarked against the market — in minutes.</p>
        </div>
        <button className="lx-btn lx-btn--gold" onClick={() => setUpload(true)}><Ic.Upload size={15} /> Upload contract</button>
      </div>

      <section className="lx-stats lx-mt-l" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[['4', 'In the library', 'Reviewed'], ['1', 'Need attention', 'Flagged clauses'], ['79', 'Avg. risk score', 'Out of 100']].map(([n, l, s], i) => (
          <div className="lx-stat" key={i}><div className="lx-stat__num">{n}</div><div className="lx-stat__label">{l}</div><div className="lx-stat__sub">{s}</div></div>
        ))}
      </section>

      <div className="lx-section-head lx-mt-xl"><h3>Your contracts</h3><a>Filter →</a></div>
      <div className="lx-card lx-card--pad">
        <div className="lx-list">
          {CONTRACTS.map((c) => (
            <div className="lx-item" key={c.id} onClick={() => navigate('/contracts/' + c.id)} style={{ padding: '16px 4px' }}>
              <div className="lx-item__ico"><Ic.Contracts size={17} /></div>
              <div className="lx-item__body" style={{ flex: 2 }}>
                <div className="lx-item__title">{c.name}</div>
                <div className="lx-item__meta">{c.party} · {c.pages} pages</div>
              </div>
              <div style={{ width: 90, textAlign: 'right' }} className="hide-sm">
                <div className="lx-item__meta" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Risk</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: c.tone === 'risk' ? 'var(--risk)' : c.tone === 'warn' ? 'var(--warn)' : 'var(--ok)' }}>{c.risk}</div>
              </div>
              <span className={`lx-badge lx-badge--${c.tone}`} style={{ minWidth: 110, justifyContent: 'center' }}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>

      {upload && (
        <Modal title="Upload a contract" onClose={() => setUpload(false)}
          footer={<><button className="lx-btn lx-btn--ghost" onClick={() => setUpload(false)}>Cancel</button><button className="lx-btn lx-btn--primary" onClick={() => { setUpload(false); navigate('/contracts/c1'); }}>Upload & review</button></>}>
          <div style={{ border: '1.5px dashed var(--rule)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', background: 'var(--paper-2)' }}>
            <div className="lx-empty__ico" style={{ margin: '0 auto 14px' }}><Ic.Upload size={22} /></div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--ink)' }}>Drop a PDF or Word file</div>
            <div className="lx-muted" style={{ marginTop: 6 }}>or click to browse — reviewed in under a minute</div>
          </div>
          <div><label className="lbl">Attach to matter (optional)</label><input className="inp" placeholder="Search matters…" /></div>
        </Modal>
      )}
    </div>
  );
}
