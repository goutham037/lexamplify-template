import { useState, useRef, useEffect } from 'react';
import * as Ic from '../icons.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

const SIDES = ['Appellant', 'Respondent', 'Petitioner', 'Defendant'];

const SESSION_EXPIRED = 'Your session has expired. Please sign in again.';

// The /api/ai/chat endpoint may append a machine-readable block of suggested
// follow-ups after a `|||REBUTTALS|||` delimiter. Split it off so the bench's
// prose reads cleanly and the suggestions can be offered as separate prompts.
function splitChatReply(raw) {
  const text = String(raw || '');
  const DELIM = '|||REBUTTALS|||';
  const idx = text.indexOf(DELIM);
  if (idx === -1) return { answer: text.trim(), followups: [] };

  const answer = text.slice(0, idx).trim();
  const tail = text.slice(idx + DELIM.length).trim();
  let followups = [];
  try {
    const arr = tail.match(/\[[\s\S]*\]/);
    if (arr) {
      const parsed = JSON.parse(arr[0]);
      if (Array.isArray(parsed)) {
        followups = parsed
          .map((r) => (typeof r === 'string' ? r : r?.text || ''))
          .filter((s) => s.length > 5);
      }
    }
  } catch {
    followups = tail
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter((l) => l.length > 10);
  }
  return { answer, followups };
}

// The simulation payload is wrapped under `simulationData` by the pipeline, but
// tolerate a flat shape too. Challenges come as red_team.opposing_counter_questions.
function readSimulation(data) {
  const sim = data?.simulationData || data || {};
  const challenges = Array.isArray(sim?.red_team?.opposing_counter_questions)
    ? sim.red_team.opposing_counter_questions
    : [];
  const authorities = Array.isArray(sim.precedents)
    ? sim.precedents
    : Array.isArray(sim.citations)
      ? sim.citations
      : [];
  return {
    issues: sim.extracted_issues || '',
    opening: sim.opening_argument || '',
    challenges: challenges.map((c) => ({
      question: c.question || '',
      rebuttal: c.suggested_rebuttal || c.rebuttal || '',
    })),
    authorities: authorities.map((a) => ({
      title: (a.title || 'Authority').replace(/\s+vs\s+/i, ' v. '),
      note: a.snippet || a.summary || a.hold || '',
      url: a.url || '',
    })),
    side: sim.client_side || '',
  };
}

export default function WarRoom() {
  // Hearing setup
  const [matter, setMatter] = useState('');
  const [issue, setIssue] = useState('');
  const [position, setPosition] = useState('');
  const [side, setSide] = useState('Appellant');

  // Simulation lifecycle
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState('');
  const [sim, setSim] = useState(null);

  // Save to vault
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Ask / prepare chat
  const [chat, setChat] = useState([]); // { role: 'you' | 'bench', text }
  const [ask, setAsk] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');

  const threadEnd = useRef(null);
  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat, chatBusy]);

  const canSimulate = issue.trim().length > 0 && !simulating;

  const runSimulation = async () => {
    if (!canSimulate) return;
    const documentContent = [
      matter.trim() && `Matter: ${matter.trim()}`,
      `Appearing for: ${side}`,
      issue.trim() && `Issue / facts:\n${issue.trim()}`,
      position.trim() && `Our position:\n${position.trim()}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    setSimulating(true);
    setSimError('');
    setSim(null);
    setSaved(false);
    setChat([]);
    setChatError('');

    try {
      const res = await fetch(`${API_BASE}/api/ai/simulate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({
          document_content: documentContent,
          client_side: side,
          document_reference: matter.trim(),
        }),
      });
      if (res.status === 401) { setSimError(SESSION_EXPIRED); return; }
      let data = {};
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok || data.error) {
        setSimError(data.message || data.error || 'The simulation could not be prepared. Please try again.');
        return;
      }
      const parsed = readSimulation(data);
      if (!parsed.issues && !parsed.opening && parsed.challenges.length === 0) {
        setSimError('The hearing returned no content. Try adding more detail to the issue.');
        return;
      }
      setSim(parsed);
    } catch {
      setSimError('Could not reach the courtroom service. Check your connection and try again.');
    } finally {
      setSimulating(false);
    }
  };

  const submitAsk = async (text) => {
    const q = (text ?? ask).trim();
    if (!q || chatBusy) return;
    setAsk('');
    setChatError('');
    setChat((prev) => [...prev, { role: 'you', text: q }]);
    setChatBusy(true);

    const context = sim?.issues ? sim.issues.slice(0, 1200) : '';
    const message = [
      '[Virtual Courtroom — hearing preparation]',
      matter.trim() && `Matter: ${matter.trim()}`,
      `Appearing for: ${side}.`,
      context && `Case context:\n${context}`,
      `Counsel asks: ${q}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ message }),
      });
      if (res.status === 401) {
        setChatError(SESSION_EXPIRED);
        setChat((prev) => prev.slice(0, -1));
        return;
      }
      let data = {};
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok || data.error) {
        setChatError(data.message || data.error || 'The bench did not respond. Please try again.');
        setChat((prev) => prev.slice(0, -1));
        return;
      }
      const { answer, followups } = splitChatReply(data.response || data.reply || data.answer || '');
      setChat((prev) => [...prev, { role: 'bench', text: answer || 'No response.', followups }]);
    } catch {
      setChatError('Could not reach the preparation service. Check your connection and try again.');
      setChat((prev) => prev.slice(0, -1));
    } finally {
      setChatBusy(false);
    }
  };

  const saveToVault = async () => {
    if (!sim || saving) return;
    setSaving(true);
    const lines = [
      'VIRTUAL COURTROOM — HEARING PREPARATION',
      matter.trim() ? `Matter: ${matter.trim()}` : '',
      `Appearing for: ${side}`,
      `Prepared: ${new Date().toLocaleString('en-IN')}`,
      '',
      'ISSUES & FACTS',
      sim.issues || '(none)',
      '',
      'OPENING ARGUMENT',
      sim.opening || '(none)',
      '',
      'SIMULATED EXCHANGE',
      ...sim.challenges.flatMap((c, i) => [
        `Q${i + 1}. ${c.question}`,
        c.rebuttal ? `Suggested response: ${c.rebuttal}` : '',
        '',
      ]),
      ...(chat.length
        ? ['PREPARATION NOTES', ...chat.map((m) => `${m.role === 'you' ? 'Counsel' : 'Bench'}: ${m.text}`)]
        : []),
    ].filter((l) => l !== undefined);

    try {
      const res = await fetch(`${API_BASE}/api/vault/save`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({
          case_id: 'WAR_ROOM',
          title: `${matter.trim() || 'Hearing'} — Courtroom preparation`,
          doc_type: 'Courtroom Simulation',
          content: lines.join('\n'),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3200);
      }
    } catch {
      /* non-blocking */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lx-page lx-rise">
      <div className="lx-between ph" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
        <div>
          <span className="ph__eyebrow">Hearing preparation</span>
          <h1 className="ph__title">Virtual Courtroom</h1>
          <p className="ph__sub">Set up the hearing, rehearse against the bench and opposing counsel, and sharpen your responses before you ever rise.</p>
        </div>
        {sim && (
          <button className="lx-btn lx-btn--ghost" onClick={saveToVault} disabled={saving}>
            {saved ? <><Ic.Check size={15} /> Saved to vault</> : <><Ic.Doc size={15} /> {saving ? 'Saving…' : 'Save to vault'}</>}
          </button>
        )}
      </div>

      {/* Hearing setup */}
      <section className="lx-card lx-card--pad">
        <div className="lx-section-head" style={{ marginBottom: 16 }}>
          <h3>Brief the hearing</h3>
          <span className="lx-muted">Grounds the simulation in your matter</span>
        </div>

        <div className="lx-stack" style={{ gap: 16 }}>
          <div>
            <label className="lbl">Matter / cause title</label>
            <input className="inp" value={matter} onChange={(e) => setMatter(e.target.value)}
              placeholder="e.g. Mehta Industries v. Union of India" disabled={simulating} />
          </div>

          <div>
            <label className="lbl">Issue & facts in play</label>
            <textarea className="inp" rows={4} value={issue} onChange={(e) => setIssue(e.target.value)}
              placeholder="State the question before the court and the facts that matter — the stronger the detail, the sharper the bench." disabled={simulating} />
          </div>

          <div>
            <label className="lbl">Your position <span className="lx-muted" style={{ fontWeight: 400 }}>— optional</span></label>
            <textarea className="inp" rows={2} value={position} onChange={(e) => setPosition(e.target.value)}
              placeholder="The relief you seek and the line you intend to take." disabled={simulating} />
          </div>

          <div>
            <label className="lbl">Appearing for</label>
            <div className="lx-row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {SIDES.map((s) => (
                <span key={s} className={`chip ${side === s ? 'is-on' : ''}`}
                  onClick={() => !simulating && setSide(s)}
                  style={side === s ? { background: 'var(--ink)', color: 'var(--paper)', cursor: 'pointer' } : { cursor: 'pointer' }}>{s}</span>
              ))}
            </div>
          </div>

          <div className="lx-row" style={{ justifyContent: 'flex-end' }}>
            <button className="lx-btn lx-btn--primary" onClick={runSimulation} disabled={!canSimulate}>
              <Ic.Gavel size={16} /> {simulating ? 'Preparing…' : 'Simulate hearing'}
            </button>
          </div>
        </div>
      </section>

      {/* Simulation results */}
      {simError ? (
        <div className="lx-mt-l">
          <div className="lx-card lx-card--pad" style={{ borderColor: 'var(--risk)' }}>
            <div className="lx-row" style={{ gap: 8, marginBottom: 6 }}>
              <span className="lx-badge lx-badge--risk">Error</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{simError}</p>
          </div>
        </div>
      ) : simulating ? (
        <div className="lx-mt-l">
          <div className="lx-card lx-card--pad">
            <div className="lx-empty">
              <div className="lx-empty__ico"><Ic.Gavel size={22} /></div>
              <p>Preparing your hearing — extracting the issues, rehearsing the bench and drafting your opening…</p>
            </div>
          </div>
        </div>
      ) : sim ? (
        <div className="lx-mt-l lx-stack" style={{ gap: 24 }}>
          {/* Issues & opening */}
          {sim.issues && (
            <section>
              <div className="lx-section-head"><h3>Issues on the record</h3></div>
              <div className="lx-card lx-card--pad" style={{ borderLeft: '3px solid var(--accent)' }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15.5, lineHeight: 1.7, color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>{sim.issues}</p>
              </div>
            </section>
          )}

          {sim.opening && (
            <section>
              <div className="lx-section-head"><h3>Your opening argument</h3></div>
              <div className="lx-card lx-card--pad" style={{ background: 'linear-gradient(180deg, var(--accent-soft), var(--paper))', borderColor: 'var(--accent)' }}>
                <div className="lx-row" style={{ gap: 8, marginBottom: 12 }}>
                  <span className="lx-badge"><Ic.Sparkle size={13} /> Drafted for the {sim.side || side}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.75, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{sim.opening}</p>
              </div>
            </section>
          )}

          {/* Simulated exchange */}
          <section>
            <div className="lx-section-head">
              <h3>The bench & opposing counsel</h3>
              {sim.challenges.length > 0 && <span className="lx-muted">{sim.challenges.length} challenge{sim.challenges.length === 1 ? '' : 's'}</span>}
            </div>
            <div className="lx-card lx-card--pad">
              {sim.challenges.length === 0 ? (
                <div className="lx-empty"><p>No opposition challenges were raised against this brief.</p></div>
              ) : (
                <div className="lx-stack" style={{ gap: 18 }}>
                  {sim.challenges.map((c, i) => (
                    <div key={i} style={{ paddingBottom: i < sim.challenges.length - 1 ? 18 : 0, borderBottom: i < sim.challenges.length - 1 ? '1px solid var(--rule)' : 'none' }}>
                      <div className="lx-row" style={{ gap: 10, alignItems: 'flex-start', marginBottom: c.rebuttal ? 12 : 0 }}>
                        <div className="lx-item__ico" style={{ marginTop: 2, flexShrink: 0 }}><Ic.Users size={17} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="lx-item__meta" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, marginBottom: 4 }}>Put to you</div>
                          <p style={{ fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>{c.question}</p>
                        </div>
                      </div>
                      {c.rebuttal && (
                        <div style={{ marginLeft: 44, borderLeft: '3px solid var(--accent)', background: 'var(--accent-soft)', padding: '12px 16px', borderRadius: '0 8px 8px 0' }}>
                          <div className="lx-item__meta" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, marginBottom: 4, color: 'var(--accent-ink)' }}>Suggested response</div>
                          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, margin: 0 }}>{c.rebuttal}</p>
                          <button className="lx-btn lx-btn--ghost lx-btn--sm" style={{ marginTop: 10 }}
                            onClick={() => submitAsk(c.rebuttal)} disabled={chatBusy}>
                            <Ic.Arrow size={13} /> Test this line
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Authorities, when the pipeline returns them */}
          {sim.authorities.length > 0 && (
            <section>
              <div className="lx-section-head"><h3>Authorities relied on</h3><span className="lx-muted">{sim.authorities.length} cited</span></div>
              <div className="lx-card lx-card--pad">
                <div className="lx-list">
                  {sim.authorities.map((a, i) => (
                    <div className="lx-item" key={i} style={{ alignItems: 'flex-start', padding: '16px 4px' }}>
                      <div className="lx-item__ico" style={{ marginTop: 2 }}><Ic.Scale size={18} /></div>
                      <div className="lx-item__body">
                        <div className="lx-item__title" style={{ whiteSpace: 'normal', fontStyle: 'italic' }}>{a.title}</div>
                        {a.note && <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, marginTop: 6 }}>{a.note}</p>}
                        {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="lx-muted" style={{ fontSize: 12, textDecoration: 'underline', textUnderlineOffset: 2, display: 'inline-block', marginTop: 6 }}>Open authority →</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Ask / prepare chat */}
          <section>
            <div className="lx-section-head"><h3>Rehearse with the bench</h3><span className="lx-muted">Ask, or answer a challenge</span></div>
            <div className="lx-card lx-card--pad">
              {chat.length === 0 && (
                <div className="lx-empty" style={{ paddingBottom: 18 }}>
                  <div className="lx-empty__ico"><Ic.Gavel size={20} /></div>
                  <p>State a line of argument, or rehearse your answer to a challenge above. The bench will press back.</p>
                </div>
              )}

              {chat.length > 0 && (
                <div className="lx-stack" style={{ gap: 14, marginBottom: 16 }}>
                  {chat.map((m, i) => (
                    <div key={i} style={{ maxWidth: '86%', alignSelf: m.role === 'you' ? 'flex-end' : 'flex-start' }}>
                      <div className="lx-item__meta" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10, marginBottom: 4, textAlign: m.role === 'you' ? 'right' : 'left', color: m.role === 'you' ? 'var(--muted)' : 'var(--accent-ink)' }}>
                        {m.role === 'you' ? 'You' : 'The bench'}
                      </div>
                      <div style={{
                        padding: '12px 15px', borderRadius: 12, fontSize: 14, lineHeight: 1.65,
                        background: m.role === 'you' ? 'var(--paper-2, var(--rule))' : 'var(--accent-soft)',
                        color: 'var(--ink-soft)', whiteSpace: 'pre-wrap',
                        borderBottomRightRadius: m.role === 'you' ? 3 : 12,
                        borderBottomLeftRadius: m.role === 'you' ? 12 : 3,
                      }}>{m.text}</div>
                      {m.role === 'bench' && m.followups?.length > 0 && (
                        <div className="lx-row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {m.followups.map((f, j) => (
                            <span key={j} className="chip" onClick={() => !chatBusy && submitAsk(f)} style={{ cursor: 'pointer' }}>↳ {f}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatBusy && (
                    <div style={{ alignSelf: 'flex-start', fontStyle: 'italic', color: 'var(--muted)', fontSize: 13.5 }}>The bench is considering your submission…</div>
                  )}
                  <div ref={threadEnd} />
                </div>
              )}

              {chatError && (
                <p style={{ color: 'var(--risk)', fontSize: 13, marginBottom: 12 }}>{chatError}</p>
              )}

              <form className="lx-field" style={{ height: 56 }} onSubmit={(e) => { e.preventDefault(); submitAsk(); }}>
                <Ic.Sparkle size={17} />
                <input value={ask} onChange={(e) => setAsk(e.target.value)}
                  placeholder="State your argument, or ask how to meet a challenge…" disabled={chatBusy} />
                <button type="submit" className="lx-btn lx-btn--primary lx-btn--sm" disabled={chatBusy || !ask.trim()}>
                  <Ic.Arrow size={15} /> {chatBusy ? 'Submitting…' : 'Submit'}
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
