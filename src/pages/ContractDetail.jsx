import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Map the backend severity vocabulary onto the luxury badge tones/levels.
const SEV = {
  critical: { tone: 'risk', level: 'High risk' },
  caution: { tone: 'warn', level: 'Caution' },
  major: { tone: 'warn', level: 'Major' },
  minor: { tone: 'ok', level: 'Minor' },
};
function sevInfo(s) {
  const l = (s || '').toLowerCase();
  if (SEV[l]) return SEV[l];
  return { tone: 'muted', level: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Note' };
}
const plural = (n) => (n === 1 ? '' : 's');

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // phase: loading | running | complete | failed | gone | expired
  const [phase, setPhase] = useState('loading');
  const [stage, setStage] = useState('Preparing the review…');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [errMsg, setErrMsg] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    let alive = true;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/contract/analysis-status/${id}`, { credentials: 'include', cache: 'no-store' });
        if (!alive) return;
        if (res.status === 404) { setPhase('gone'); return; }
        if (res.status === 401 || res.status === 403) { setPhase('expired'); return; }
        if (!res.ok) throw new Error('status ' + res.status);

        const data = await res.json();
        if (!alive) return;

        if (data.status === 'complete') {
          if (!data.results) {
            setErrMsg('The analysis finished without a result. Please run it again.');
            setPhase('failed');
            return;
          }
          setResult(data.results);
          setProgress(100);
          setPhase('complete');
          return;
        }
        if (data.status === 'failed') {
          setErrMsg(data.error || 'The analysis could not be completed. Please try again.');
          setPhase('failed');
          return;
        }
        // still running
        setPhase('running');
        if (typeof data.progress === 'number') setProgress(Math.max(5, Math.min(95, data.progress)));
        if (data.stage) setStage(data.stage);
        timerRef.current = setTimeout(poll, 2000);
      } catch {
        if (!alive) return;
        // Transient network / cold-start: keep showing the running state and retry.
        setPhase((p) => (p === 'complete' || p === 'failed' || p === 'gone' || p === 'expired' ? p : 'running'));
        setStage('Reconnecting to the server…');
        timerRef.current = setTimeout(poll, 3000);
      }
    };

    poll();
    return () => { alive = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [id]);

  // ── Derive the real analysis shape ──────────────────────────────────────────
  const risks = result ? (result.risks || result.clauses || []) : [];
  const missing = result ? (result.missing || result.missing_clauses || []) : [];
  const citations = result ? (result.citations || []) : [];
  const warnings = (result && result.coverage && Array.isArray(result.coverage.warnings)) ? result.coverage.warnings : [];
  const pages = result ? (result.page_count || null) : null;
  const words = result ? (result.word_count || null) : null;
  const docName = (result && (result.document_name || result.name)) || 'Contract analysis';

  const metaBits = [];
  if (pages) metaBits.push(`${pages} page${plural(pages)}`);
  if (words) metaBits.push(`${words.toLocaleString()} words`);
  metaBits.push(phase === 'complete' ? 'Reviewed just now' : 'Review in progress');

  return (
    <div className="lx-page lx-rise">
      <div className="dh">
        <button className="dh__back" onClick={() => navigate('/contracts')}><Ic.Arrow size={14} style={{ transform: 'rotate(180deg)' }} /> All contracts</button>
        <div className="dh__row">
          <div>
            <h1 className="dh__title font-display">{phase === 'complete' ? docName : 'Contract review'}</h1>
            <div className="dh__meta">
              {metaBits.map((b, i) => <span key={i}>{i === 0 && phase === 'complete' ? <b>{b}</b> : b}</span>)}
            </div>
          </div>
          <div className="lx-row" style={{ gap: 10 }}>
            <button className="lx-btn lx-btn--ghost lx-btn--sm"><Ic.Upload size={14} /> Export report</button>
            <button className="lx-btn lx-btn--gold lx-btn--sm"><Ic.Sparkle size={14} /> Suggest redlines</button>
          </div>
        </div>
      </div>

      {phase === 'complete' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 0.9fr)', gap: 24, alignItems: 'start' }} className="draft-grid">
          <div className="lx-card lx-card--pad">
            <div className="lx-between" style={{ marginBottom: 14 }}>
              <div className="lx-title" style={{ fontSize: 16 }}>Clause-by-clause</div>
              <span className={`lx-badge lx-badge--${risks.length ? 'warn' : 'ok'}`}>{risks.length} flag{plural(risks.length)}</span>
            </div>
            {risks.length === 0 ? (
              <div className="lx-empty" style={{ padding: '28px 10px' }}>
                <div className="lx-empty__ico"><Ic.Check size={20} /></div>
                <h4>No material issues</h4>
                <p>The AI did not flag any high-risk clauses in this document.</p>
              </div>
            ) : (
              <div className="lx-list">
                {risks.map((x, i) => {
                  const info = sevInfo(x.severity);
                  const note = x.excerpt || x.original || x.original_text || x.text || x.recommendation || x.rationale || '';
                  return (
                    <div className="lx-item" key={x.id || i} style={{ alignItems: 'flex-start', padding: '16px 4px' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: info.tone === 'risk' ? 'var(--risk)' : info.tone === 'warn' ? 'var(--warn)' : info.tone === 'ok' ? 'var(--ok)' : 'var(--muted-2)' }} />
                      <div className="lx-item__body">
                        <div className="lx-between" style={{ alignItems: 'baseline', gap: 10 }}>
                          <div className="lx-item__title" style={{ fontSize: 15 }}>{x.title || x.location || `Clause ${i + 1}`}</div>
                          <span className={`lx-badge lx-badge--${info.tone}`} style={{ flexShrink: 0 }}>{info.level}</span>
                        </div>
                        {x.location && x.title && x.location !== x.title && (
                          <div className="lx-item__meta" style={{ marginTop: 2 }}>{x.location}</div>
                        )}
                        {note && <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, marginTop: 4 }}>{note}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {missing.length > 0 && (
              <>
                <hr className="lx-rule" style={{ margin: '22px 0 18px' }} />
                <div className="lx-title" style={{ fontSize: 16, marginBottom: 12 }}>Missing standard clauses</div>
                <div className="lx-list">
                  {missing.map((m, i) => (
                    <div className="lx-item" key={m.id || i} style={{ alignItems: 'flex-start', padding: '14px 4px' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: 'var(--warn)' }} />
                      <div className="lx-item__body">
                        <div className="lx-item__title" style={{ fontSize: 14.5 }}>{m.title}</div>
                        {(m.rationale || m.model || m.clause) && (
                          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, marginTop: 4 }}>{m.rationale || m.model || m.clause}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="lx-stack" style={{ gap: 24 }}>
            <div className="lx-card lx-card--pad" style={{ textAlign: 'center' }}>
              <div className="lx-stat__num" style={{ fontSize: 56 }}>{risks.length}</div>
              <div className="lx-stat__label lx-mt-m">{risks.length ? `Clause${plural(risks.length)} to review` : 'Clauses flagged'}</div>
              <div className="lx-stat__sub">{missing.length ? `${missing.length} missing standard clause${plural(missing.length)}` : 'No missing standard clauses'}</div>
              <hr className="lx-rule" style={{ margin: '20px 0' }} />
              <button className="lx-btn lx-btn--primary" style={{ width: '100%' }}><Ic.Check size={15} /> Accept suggestions</button>
            </div>
            <div className="lx-card lx-card--pad">
              <div className="lx-section-head" style={{ marginBottom: 12 }}><h3>Summary</h3></div>
              <p className="lx-muted" style={{ lineHeight: 1.6 }}>
                {risks.length} risk flag{plural(risks.length)}, {missing.length} missing standard clause{plural(missing.length)} and {citations.length} citation{plural(citations.length)} matched{pages ? ` across ${pages} page${plural(pages)}` : ''}.
              </p>
              {warnings.length > 0 && (
                <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: 'var(--ink-soft)', fontSize: 13, lineHeight: 1.6 }}>
                  {warnings.map((w, i) => <li key={i}>{typeof w === 'string' ? w : (w.message || w.text || '')}</li>)}
                </ul>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="lx-card lx-card--pad">
          {phase === 'gone' ? (
            <div className="lx-empty" style={{ padding: '44px 20px' }}>
              <div className="lx-empty__ico"><Ic.Contracts size={22} /></div>
              <h4>This review is no longer available</h4>
              <p>The server no longer has this analysis — it may have finished some time ago or the server restarted. Please start a new review.</p>
              <button className="lx-btn lx-btn--gold" style={{ marginTop: 14 }} onClick={() => navigate('/contracts')}><Ic.Upload size={15} /> New contract review</button>
            </div>
          ) : phase === 'expired' ? (
            <div className="lx-empty" style={{ padding: '44px 20px' }}>
              <div className="lx-empty__ico"><Ic.Contracts size={22} /></div>
              <h4>Your session has expired</h4>
              <p>Please sign in again, then reopen this review.</p>
            </div>
          ) : phase === 'failed' ? (
            <div className="lx-empty" style={{ padding: '44px 20px' }}>
              <div className="lx-empty__ico"><Ic.Contracts size={22} /></div>
              <h4>The review could not be completed</h4>
              <p>{errMsg || 'Please try again.'}</p>
              <button className="lx-btn lx-btn--gold" style={{ marginTop: 14 }} onClick={() => navigate('/contracts')}><Ic.Upload size={15} /> Start over</button>
            </div>
          ) : (
            <div className="lx-empty" style={{ padding: '44px 20px' }}>
              <div className="lx-empty__ico"><Ic.Sparkle size={22} /></div>
              <h4>Reading your contract…</h4>
              <p>{stage}</p>
              <div style={{ maxWidth: 320, margin: '18px auto 0', height: 6, borderRadius: 999, background: 'var(--rule)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(5, progress)}%`, height: '100%', background: 'var(--accent-ink, var(--ink))', transition: 'width .4s ease' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
