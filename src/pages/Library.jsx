import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import Modal from '../components/Modal.jsx';

const CATS = [
  { id: 'notices', name: 'Notices & demands', Icon: Ic.Doc, templates: ['Legal notice — recovery of dues', 'Legal notice — cheque dishonour (S.138)', 'Notice to vacate', 'Reply to legal notice'] },
  { id: 'pleadings', name: 'Petitions & pleadings', Icon: Ic.Gavel, templates: ['Writ petition (Art. 226)', 'Civil suit — plaint', 'Written statement', 'Rejoinder', 'Interim application'] },
  { id: 'agreements', name: 'Agreements & contracts', Icon: Ic.Contracts, templates: ['Mutual NDA', 'Master services agreement', 'Leave & licence agreement', 'Share purchase agreement'] },
  { id: 'criminal', name: 'Bail & criminal', Icon: Ic.Shield, templates: ['Anticipatory bail (S.438)', 'Regular bail (S.439)', 'Quashing petition (S.482)', 'Complaint (S.200)'] },
  { id: 'property', name: 'Property & conveyancing', Icon: Ic.Matters, templates: ['Sale deed', 'Gift deed', 'Relinquishment deed', 'Rent agreement'] },
  { id: 'corporate', name: 'Corporate & advisory', Icon: Ic.Users, templates: ['Board resolution', 'Shareholders agreement', 'Employment agreement', 'Founders agreement'] },
];

export default function Library() {
  const navigate = useNavigate();
  const [cat, setCat] = useState(null);
  const [preview, setPreview] = useState(null);
  const current = CATS.find((c) => c.id === cat);

  return (
    <div className="lx-page lx-rise">
      <div className="lx-between ph" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
        <div>
          <span className="ph__eyebrow">Firm knowledge</span>
          <h1 className="ph__title">{current ? current.name : 'Library'}</h1>
          <p className="ph__sub">Vetted templates and your chambers&apos; own precedents — ready to draft from.</p>
        </div>
        <div className="lx-field" style={{ height: 42, maxWidth: 260 }}>
          <Ic.Search size={15} /><input placeholder="Search templates…" style={{ fontSize: 14 }} />
        </div>
      </div>

      {!current ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
            {CATS.map((c) => (
              <div className="lx-card lx-card--pad lx-card--hover" key={c.id} style={{ cursor: 'pointer' }} onClick={() => setCat(c.id)}>
                <div className="lx-between" style={{ alignItems: 'flex-start' }}>
                  <div className="lx-stat__ico" style={{ margin: 0 }}><c.Icon size={18} /></div>
                  <Ic.Arrow size={16} />
                </div>
                <div className="lx-title lx-mt-m" style={{ fontSize: 17 }}>{c.name}</div>
                <div className="lx-muted" style={{ marginTop: 4 }}>{c.templates.length} templates</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button className="dh__back" style={{ marginBottom: 18 }} onClick={() => setCat(null)}><Ic.Arrow size={14} style={{ transform: 'rotate(180deg)' }} /> All categories</button>
          <div className="lx-card lx-card--pad">
            <div className="lx-list">
              {current.templates.map((t, i) => (
                <div className="lx-item" key={i}>
                  <div className="lx-item__ico" style={{ width: 34, height: 34 }}><Ic.Doc size={15} /></div>
                  <div className="lx-item__title" style={{ flex: 1, fontSize: 15 }}>{t}</div>
                  <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => setPreview(t)}>Preview</button>
                  <button className="lx-btn lx-btn--primary lx-btn--sm" onClick={() => navigate('/draft')}>Use</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {preview && (
        <Modal title={preview} onClose={() => setPreview(null)} wide
          footer={<><button className="lx-btn lx-btn--ghost" onClick={() => setPreview(null)}>Close</button><button className="lx-btn lx-btn--gold" onClick={() => navigate('/draft')}><Ic.Sparkle size={14} /> Use template</button></>}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 12, padding: '28px 32px', fontFamily: 'var(--font-serif)', lineHeight: 1.85, fontSize: 14, color: 'var(--ink)', maxHeight: '48vh', overflowY: 'auto' }}>
            <p style={{ textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 18 }}>{preview}</p>
            <p style={{ marginBottom: 12 }}>To,<br />[Name and address of the addressee]</p>
            <p style={{ marginBottom: 12 }}>Under instructions from and on behalf of my client, [client name], I hereby serve upon you the following notice:</p>
            <p style={{ color: 'var(--muted)', marginBottom: 12 }}>1. That [statement of facts giving rise to the cause of action] …</p>
            <p style={{ color: 'var(--muted)' }}>2. That you are hereby called upon to [relief sought] within [period] of receipt hereof, failing which my client shall be constrained to initiate appropriate proceedings at your risk as to costs and consequences.</p>
          </div>
          <div className="lx-muted" style={{ fontSize: 12.5 }}>Placeholders in [brackets] are filled automatically from your matter and the brief you provide.</div>
        </Modal>
      )}
    </div>
  );
}
