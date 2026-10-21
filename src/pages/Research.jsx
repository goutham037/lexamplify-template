import { useState } from 'react';
import * as Ic from '../icons.jsx';

const RESULTS = [
  { name: 'Kesavananda Bharati v. State of Kerala', meta: 'Supreme Court · (1973) 4 SCC 225', match: 98, hold: 'Established the basic structure doctrine — Parliament cannot amend the Constitution so as to alter its essential framework.' },
  { name: 'Minerva Mills Ltd. v. Union of India', meta: 'Supreme Court · (1980) 3 SCC 625', match: 95, hold: 'Struck down clauses of the 42nd Amendment; reaffirmed limited amending power and judicial review as basic features.' },
  { name: 'I.R. Coelho v. State of Tamil Nadu', meta: 'Supreme Court · (2007) 2 SCC 1', match: 92, hold: 'Laws placed in the Ninth Schedule after 1973 are open to basic-structure review.' },
  { name: 'Indira Nehru Gandhi v. Raj Narain', meta: 'Supreme Court · 1975 Supp SCC 1', match: 88, hold: 'Applied the doctrine to strike down a constitutional amendment ousting judicial review of election disputes.' },
];
const SUGGESTED = ['Limitation under the amended Section 149 IT Act', 'Anticipatory bail — twin conditions', 'Specific performance after 2018 amendment', 'Cheque dishonour — vicarious liability of directors'];
const RECENT = ['Basic structure doctrine precedents', 'Change of opinion in reassessment', 'Grant of probate — testamentary capacity'];
const COURTS = ['All courts', 'Supreme Court', 'High Courts', 'Tribunals'];

export default function Research() {
  const [q, setQ] = useState('Precedents on the basic structure doctrine');
  const [done, setDone] = useState(true);
  const [court, setCourt] = useState('All courts');

  return (
    <div className="lx-page lx-rise">
      <div className="ph">
        <span className="ph__eyebrow">Legal research</span>
        <h1 className="ph__title">Research</h1>
        <p className="ph__sub">Ask in plain language. Every answer is grounded in verifiable authority — search 50M+ judgments, statutes and rules.</p>
      </div>

      <form className="lx-field" style={{ height: 60 }} onSubmit={(e) => { e.preventDefault(); setDone(true); }}>
        <Ic.Search size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question of law…" />
        <button type="submit" className="lx-btn lx-btn--primary lx-btn--sm"><Ic.Sparkle size={15} /> Research</button>
      </form>

      <div className="lx-row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {COURTS.map((c) => <span key={c} className={`chip ${court === c ? 'is-on' : ''}`} onClick={() => setCourt(c)}>{c}</span>)}
      </div>

      {!done ? (
        <div className="lx-dash-grid lx-mt-xl">
          <div className="lx-card lx-card--pad">
            <div className="lx-section-head" style={{ marginBottom: 14 }}><h3>Try asking</h3></div>
            <div className="lx-list">{SUGGESTED.map((s, i) => (
              <div className="lx-item" key={i} onClick={() => { setQ(s); setDone(true); }} style={{ padding: '12px 2px' }}>
                <div className="lx-item__ico" style={{ width: 32, height: 32 }}><Ic.Sparkle size={14} /></div>
                <div className="lx-item__title" style={{ flex: 1, fontSize: 14, whiteSpace: 'normal' }}>{s}</div><Ic.Arrow size={15} /></div>
            ))}</div>
          </div>
          <aside className="lx-card lx-card--pad">
            <div className="lx-section-head" style={{ marginBottom: 14 }}><h3>Recent</h3></div>
            <div className="lx-list">{RECENT.map((r, i) => (
              <div className="lx-item" key={i} onClick={() => { setQ(r); setDone(true); }} style={{ padding: '11px 2px' }}>
                <Ic.Clock size={15} /><div className="lx-item__title" style={{ flex: 1, fontSize: 13.5, whiteSpace: 'normal', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{r}</div></div>
            ))}</div>
          </aside>
        </div>
      ) : (
        <div className="lx-mt-l lx-stack" style={{ gap: 22 }}>
          <div className="lx-card lx-card--pad" style={{ borderColor: 'var(--accent)', background: 'linear-gradient(180deg, var(--accent-soft), var(--paper))' }}>
            <div className="lx-row" style={{ gap: 8, marginBottom: 12 }}><span className="lx-badge"><Ic.Sparkle size={13} /> Synthesis</span><span className="lx-muted">Grounded in 4 authorities</span></div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.6, color: 'var(--ink)' }}>
              The basic structure doctrine holds that Parliament&apos;s amending power under Article 368 does not extend to altering the essential framework of the Constitution. Laid down in <i>Kesavananda Bharati</i> (1973) and reaffirmed in <i>Minerva Mills</i> (1980), it remains the bedrock of judicial review.
            </p>
            <div className="lx-row" style={{ gap: 8, marginTop: 14 }}><button className="lx-btn lx-btn--ghost lx-btn--sm"><Ic.Doc size={13} /> Save to matter</button><button className="lx-btn lx-btn--ghost lx-btn--sm"><Ic.Upload size={13} /> Export</button></div>
          </div>

          <div className="lx-section-head"><h3>Authorities</h3><span className="lx-muted">{RESULTS.length} found</span></div>
          <div className="lx-card lx-card--pad">
            <div className="lx-list">
              {RESULTS.map((r, i) => (
                <div className="lx-item" key={i} style={{ alignItems: 'flex-start', padding: '18px 4px' }}>
                  <div className="lx-item__ico" style={{ marginTop: 2 }}><Ic.Scale size={18} /></div>
                  <div className="lx-item__body">
                    <div className="lx-between" style={{ gap: 12, alignItems: 'baseline' }}>
                      <div className="lx-item__title" style={{ whiteSpace: 'normal' }}>{r.name}</div>
                      <span className="lx-badge" style={{ flexShrink: 0 }}>{r.match}% match</span>
                    </div>
                    <div className="lx-item__meta" style={{ marginBottom: 6 }}>{r.meta}</div>
                    <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{r.hold}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
