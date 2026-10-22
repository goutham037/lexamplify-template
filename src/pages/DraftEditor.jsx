import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';

const TOOLS = ['H', 'B', 'I', 'U', '“”', '•', '1.', '⎌'];
// WordCraft (open-source Rust/WASM MS-Word engine, MIT/Apache-2.0) static bundle, served under the app.
const WORDCRAFT_SRC = `${import.meta.env.BASE_URL}wordcraft/index.html`;

export default function DraftEditor() {
  const navigate = useNavigate();
  const [full, setFull] = useState(false); // WordCraft editor open full-window

  return (
    <div className="lx-page lx-rise" style={{ maxWidth: 1240 }}>
      <div className="dh">
        <button className="dh__back" onClick={() => navigate(-1)}><Ic.Arrow size={14} style={{ transform: 'rotate(180deg)' }} /> Back</button>
        <div className="dh__row">
          <div>
            <h1 className="dh__title font-display">Rejoinder to counter-affidavit</h1>
            <div className="dh__meta"><span><b>Mehta Industries v. Union of India</b></span><span>Draft · autosaved 2m ago</span></div>
          </div>
          <div className="lx-row" style={{ gap: 10 }}>
            <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => setFull(true)}><Ic.Draft size={14} /> Open editor</button>
            <button className="lx-btn lx-btn--gold lx-btn--sm"><Ic.Check size={14} /> Finalise & file</button>
          </div>
        </div>
      </div>

      <div className="ed">
        <div className="ed__main">
          <div className="ed__bar">
            {TOOLS.map((t) => <button className="ed__tool" key={t}>{t}</button>)}
            <span style={{ flex: 1 }} />
            <button className="lx-btn lx-btn--primary lx-btn--sm" onClick={() => setFull(true)}><Ic.Draft size={14} /> Edit in full editor</button>
          </div>
          <div className="ed__paper">
            <h2>In the High Court of Delhi at New Delhi</h2>
            <div className="sub">W.P.(C) 8842 of 2025</div>
            <p style={{ textAlign: 'center', marginBottom: 24 }}><b>Rejoinder on behalf of the Petitioner</b></p>
            <p>MOST RESPECTFULLY SHOWETH:</p>
            <p>1. That the present rejoinder is being filed in answer to the counter-affidavit dated 18.09.2026 filed on behalf of the Respondent. The contents of the writ petition are reiterated and not repeated herein for the sake of brevity.</p>
            <p>2. That the preliminary objection as to maintainability is misconceived. The impugned demand notice dated 12.08.2025 was issued beyond the period of limitation prescribed under the amended Section 149 of the Act, as held in <i>Union of India v. Rajeev Bansal</i>, (2024) and <i>Ashish Agarwal</i> (2022).</p>
            <p style={{ color: 'var(--muted)' }}>3. That without prejudice to the above, the reassessment is also vitiated by a mere change of opinion, no new tangible material having been disclosed…<span style={{ color: 'var(--accent-ink)' }}> ▍</span></p>
          </div>
        </div>

        <div className="ed__side">
          <div className="lx-card lx-card--pad">
            <div className="lx-row" style={{ gap: 8, marginBottom: 14 }}><span className="lx-badge"><Ic.Sparkle size={13} /> Lexamplify</span></div>
            <div className="lx-stack" style={{ gap: 10 }}>
              <div className="ai-msg ai-msg--you">Strengthen paragraph 2 with the latest Supreme Court authority on limitation.</div>
              <div className="ai-msg ai-msg--bot">Added <i>Union of India v. Rajeev Bansal</i> (2024) alongside <i>Ashish Agarwal</i>. Both go directly to the extended-limitation question. Want me to add the paragraph numbers from the judgments?</div>
            </div>
            <div className="lx-field" style={{ height: 44, marginTop: 14, background: 'var(--bg-card)' }}>
              <Ic.Sparkle size={15} />
              <input placeholder="Ask to edit, cite or rephrase…" style={{ fontSize: 13.5 }} />
            </div>
          </div>
          <div className="lx-card lx-card--pad">
            <div className="lx-section-head" style={{ marginBottom: 12 }}><h3>Authorities</h3></div>
            <div className="lx-list">
              {['Union of India v. Rajeev Bansal (2024)', 'Union of India v. Ashish Agarwal (2022)', 'GKN Driveshafts v. ITO (2003)'].map((a, i) => (
                <div className="lx-item" key={i} style={{ padding: '11px 2px' }}>
                  <div className="lx-item__ico" style={{ width: 30, height: 30 }}><Ic.Scale size={14} /></div>
                  <div className="lx-item__title" style={{ flex: 1, fontSize: 13.5, whiteSpace: 'normal' }}>{a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full-window WordCraft editor with a Lexamplify-themed toolbar (follows Theme Studio).
          Portaled to <body> so position:fixed resolves against the viewport, not the
          transformed .lx-page ancestor (.lx-rise keeps a translateY, which would otherwise
          make the overlay a child containing-block and shrink/stretch the iframe). */}
      {full && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          <header style={{ height: 58, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: '1px solid var(--rule)', background: 'var(--paper)' }}>
            <div className="lx-row" style={{ gap: 12, minWidth: 0 }}>
              <div className="rail__mono" style={{ width: 34, height: 34, fontSize: 17, flexShrink: 0 }}>L</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Rejoinder to counter-affidavit</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Mehta Industries v. Union of India · Draft</div>
              </div>
            </div>
            <div className="lx-row" style={{ gap: 10, flexShrink: 0 }}>
              <button className="lx-btn lx-btn--ghost lx-btn--sm"><Ic.Sparkle size={14} /> Ask AI</button>
              <button className="lx-btn lx-btn--ghost lx-btn--sm"><Ic.Upload size={14} /> Export .docx</button>
              <button className="lx-btn lx-btn--gold lx-btn--sm"><Ic.Check size={14} /> Finalise & file</button>
              <button className="icon-btn" aria-label="Close editor" onClick={() => setFull(false)}><Ic.X size={17} /></button>
            </div>
          </header>
          <iframe
            title="Lexamplify Draft editor"
            src={WORDCRAFT_SRC}
            allow="fullscreen; clipboard-read; clipboard-write"
            style={{ flex: 1, width: '100%', border: 0, display: 'block' }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
