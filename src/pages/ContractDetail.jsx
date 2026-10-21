import { useParams, useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import { CONTRACTS } from '../data/sample.js';

const CLAUSES = [
  { clause: 'Limitation of liability', note: 'Cap set at 1× fees — below market for a contract of this value. Recommend 2× with a carve-out for IP and confidentiality.', level: 'Review', tone: 'warn' },
  { clause: 'Termination for convenience', note: 'Counterparty may exit on 30 days with no exit fee. High commercial exposure; propose 90 days or a wind-down fee.', level: 'High risk', tone: 'risk' },
  { clause: 'Indemnification', note: 'Mutual and appropriately scoped to third-party IP claims. Consistent with market.', level: 'Standard', tone: 'ok' },
  { clause: 'Governing law & venue', note: 'Courts at New Delhi — aligned with client preference.', level: 'Standard', tone: 'ok' },
  { clause: 'Confidentiality survival', note: 'Survives 3 years post-termination. Market standard.', level: 'Standard', tone: 'ok' },
  { clause: 'Assignment', note: 'Permitted on change of control without consent. Consider a consent requirement.', level: 'Review', tone: 'warn' },
];

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const c = CONTRACTS.find((x) => x.id === id) || CONTRACTS[0];

  return (
    <div className="lx-page lx-rise">
      <div className="dh">
        <button className="dh__back" onClick={() => navigate('/contracts')}><Ic.Arrow size={14} style={{ transform: 'rotate(180deg)' }} /> All contracts</button>
        <div className="dh__row">
          <div>
            <h1 className="dh__title font-display">{c.name}</h1>
            <div className="dh__meta"><span><b>{c.party}</b></span><span>{c.pages} pages</span><span>Reviewed just now</span></div>
          </div>
          <div className="lx-row" style={{ gap: 10 }}>
            <button className="lx-btn lx-btn--ghost lx-btn--sm"><Ic.Upload size={14} /> Export report</button>
            <button className="lx-btn lx-btn--gold lx-btn--sm"><Ic.Sparkle size={14} /> Suggest redlines</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 0.9fr)', gap: 24, alignItems: 'start' }} className="draft-grid">
        <div className="lx-card lx-card--pad">
          <div className="lx-between" style={{ marginBottom: 14 }}>
            <div className="lx-title" style={{ fontSize: 16 }}>Clause-by-clause</div>
            <span className={`lx-badge lx-badge--${c.tone}`}>{c.flags} flag{c.flags === 1 ? '' : 's'}</span>
          </div>
          <div className="lx-list">
            {CLAUSES.map((x, i) => (
              <div className="lx-item" key={i} style={{ alignItems: 'flex-start', padding: '16px 4px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: x.tone === 'risk' ? 'var(--risk)' : x.tone === 'warn' ? 'var(--warn)' : 'var(--ok)' }} />
                <div className="lx-item__body">
                  <div className="lx-between" style={{ alignItems: 'baseline', gap: 10 }}>
                    <div className="lx-item__title" style={{ fontSize: 15 }}>{x.clause}</div>
                    <span className={`lx-badge lx-badge--${x.tone}`} style={{ flexShrink: 0 }}>{x.level}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, marginTop: 4 }}>{x.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="lx-stack" style={{ gap: 24 }}>
          <div className="lx-card lx-card--pad" style={{ textAlign: 'center' }}>
            <div className="lx-stat__num" style={{ fontSize: 56 }}>{c.risk}<span style={{ fontSize: 24, color: 'var(--muted)' }}>/100</span></div>
            <div className="lx-stat__label lx-mt-m">Overall risk posture</div>
            <div className="lx-stat__sub">{c.flags ? `${c.flags} clause${c.flags === 1 ? '' : 's'} need attention` : 'No material issues'}</div>
            <hr className="lx-rule" style={{ margin: '20px 0' }} />
            <button className="lx-btn lx-btn--primary" style={{ width: '100%' }}><Ic.Check size={15} /> Accept suggestions</button>
          </div>
          <div className="lx-card lx-card--pad">
            <div className="lx-section-head" style={{ marginBottom: 12 }}><h3>Benchmark</h3></div>
            <p className="lx-muted" style={{ lineHeight: 1.6 }}>Compared against 4,200 commercial agreements in the firm library. 4 of 6 key clauses sit at or above market.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
