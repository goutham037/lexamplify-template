import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import { getMatter, DOCUMENTS, HEARINGS, TIMELINE } from '../data/sample.js';

const TABS = ['Overview', 'Documents', 'Hearings', 'Timeline', 'Parties', 'Notes'];

export default function MatterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const m = getMatter(id);
  const [tab, setTab] = useState('Overview');

  return (
    <div className="lx-page lx-rise">
      <div className="dh">
        <button className="dh__back" onClick={() => navigate('/matters')}><Ic.Arrow size={14} style={{ transform: 'rotate(180deg)' }} /> All matters</button>
        <div className="dh__row">
          <div>
            <h1 className="dh__title font-display">{m.title}</h1>
            <div className="dh__meta">
              <span><b>{m.court}</b></span>
              <span>{m.num !== '—' ? m.num : m.type}</span>
              <span>Filed <b>{m.filed}</b></span>
              <span>Lead <b>{m.lead}</b></span>
            </div>
          </div>
          <div className="lx-row" style={{ gap: 10 }}>
            <span className={`lx-badge lx-badge--${m.tone}`} style={{ height: 32 }}>{m.status}</span>
            <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => navigate('/draft')}><Ic.Draft size={14} /> Draft</button>
            <button className="lx-btn lx-btn--gold lx-btn--sm"><Ic.Sparkle size={14} /> Ask about this matter</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="lx-dash-grid">
          <div className="lx-stack" style={{ gap: 24 }}>
            <div className="lx-card lx-card--pad">
              <div className="lx-section-head" style={{ marginBottom: 14 }}><h3>Summary</h3></div>
              <p className="lx-lead" style={{ fontSize: 15 }}>{m.summary}</p>
            </div>
            <div className="lx-card lx-card--pad">
              <div className="lx-section-head" style={{ marginBottom: 18 }}><h3>Case details</h3></div>
              <div className="kv">
                <div><div className="kv__k">Bench</div><div className="kv__v">{m.bench}</div></div>
                <div><div className="kv__k">Stage</div><div className="kv__v">{m.stage}</div></div>
                <div><div className="kv__k">Next listing</div><div className="kv__v">{m.nextFull}</div></div>
                <div><div className="kv__k">Client</div><div className="kv__v">{m.client}</div></div>
                <div><div className="kv__k">Matter value</div><div className="kv__v">{m.value}</div></div>
                <div><div className="kv__k">Type</div><div className="kv__v">{m.type}</div></div>
              </div>
            </div>
            <div className="lx-card lx-card--pad" style={{ background: 'var(--accent-soft)', borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}>
              <div className="lx-row" style={{ gap: 8, marginBottom: 10 }}><span className="lx-badge"><Ic.Sparkle size={13} /> AI brief</span></div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--ink)' }}>
                The strongest line is limitation — the demand notice issued beyond the four-year window under the amended Section 149 is vulnerable. Lead with <i>Mehta</i> and <i>Rajeev Bansal</i>; keep change-of-opinion as the alternative.
              </p>
            </div>
          </div>
          <aside className="lx-stack" style={{ gap: 24 }}>
            <div className="lx-card lx-card--pad">
              <div className="lx-section-head" style={{ marginBottom: 14 }}><h3>Next hearing</h3></div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--ink)' }}>{m.next}</div>
              <div className="lx-muted" style={{ marginTop: 4 }}>{m.nextFull}</div>
              <button className="lx-btn lx-btn--ghost lx-btn--sm lx-mt-m" style={{ width: '100%' }} onClick={() => navigate('/calendar')}>Open calendar</button>
            </div>
            <div className="lx-card lx-card--pad">
              <div className="lx-section-head" style={{ marginBottom: 12 }}><h3>Quick actions</h3></div>
              <div className="lx-stack" style={{ gap: 8 }}>
                {[['Draft a document', Ic.Draft], ['Research a point', Ic.Research], ['Add a note', Ic.Doc], ['Upload a file', Ic.Upload]].map(([l, I]) => (
                  <button key={l} className="lx-btn lx-btn--ghost" style={{ justifyContent: 'flex-start', width: '100%' }}><span style={{ color: 'var(--accent-ink)' }}><I size={16} /></span>{l}</button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === 'Documents' && (
        <div className="lx-card lx-card--pad">
          <div className="lx-between" style={{ marginBottom: 6 }}>
            <div className="lx-muted">{DOCUMENTS.length} documents</div>
            <button className="lx-btn lx-btn--gold lx-btn--sm"><Ic.Upload size={14} /> Upload</button>
          </div>
          <div className="lx-list">
            {DOCUMENTS.map((d) => (
              <div className="lx-item" key={d.id} onClick={() => navigate('/draft/' + d.id)}>
                <div className="lx-item__ico"><Ic.Doc size={16} /></div>
                <div className="lx-item__body">
                  <div className="lx-item__title">{d.name}</div>
                  <div className="lx-item__meta">{d.kind} · {d.size} · {d.by} · {d.updated}</div>
                </div>
                <span className={`lx-badge lx-badge--${d.tag === 'Filed' ? 'ok' : 'warn'}`}>{d.tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Hearings' && (
        <div className="lx-card lx-card--pad">
          <div className="lx-list">
            {HEARINGS.map((h, i) => (
              <div className="lx-item" key={i}>
                <div style={{ width: 92, flexShrink: 0 }}><div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{h.date}</div></div>
                <div className="lx-item__body">
                  <div className="lx-item__title" style={{ fontSize: 15 }}>{h.title}</div>
                  <div className="lx-item__meta">{h.court}</div>
                </div>
                <span className={`lx-badge lx-badge--${h.tone}`}>{h.outcome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Timeline' && (
        <div className="lx-card lx-card--pad">
          <div className="tl">
            {TIMELINE.map((t, i) => (
              <div className="tl__item" key={i}>
                <span className={`tl__dot ${t.tone === 'accent' ? 'tl__dot--accent' : t.tone === 'ok' ? 'tl__dot--ok' : ''}`} />
                <div className="tl__when">{t.when}</div>
                <div className="tl__text">{t.text}</div>
                <div className="tl__who">{t.who}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Parties' && (
        <div className="lx-card lx-card--pad">
          <div className="lx-list">
            {[
              { r: 'Petitioner', n: m.client, c: 'Represented by Aarav Advocate' },
              { r: 'Respondent', n: 'Union of India', c: 'Through Standing Counsel' },
              { r: 'Intervenor', n: '—', c: 'None on record' },
            ].map((p, i) => (
              <div className="lx-item" key={i}>
                <div className="lx-item__ico"><Ic.Users size={16} /></div>
                <div className="lx-item__body"><div className="lx-item__title">{p.n}</div><div className="lx-item__meta">{p.c}</div></div>
                <span className="lx-badge lx-badge--muted">{p.r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Notes' && (
        <div className="lx-card lx-card--pad">
          <textarea className="inp" placeholder="Add a private note for this matter…" style={{ minHeight: 120, marginBottom: 14 }} />
          <div className="lx-between"><div className="lx-muted">Notes are visible to your chambers only.</div><button className="lx-btn lx-btn--primary lx-btn--sm">Save note</button></div>
          <hr className="lx-rule" style={{ margin: '20px 0' }} />
          <div className="lx-list">
            {[['Aarav Advocate · 2 days ago', 'Confirm the exact date of the demand notice before arguments — limitation turns on it.'], ['Priya (Assoc.) · 5 days ago', 'Counter-affidavit does not deny the dates. Good for us.']].map(([h, t], i) => (
              <div className="lx-item" key={i} style={{ alignItems: 'flex-start' }}>
                <div className="lx-item__ico" style={{ width: 32, height: 32 }}><Ic.Doc size={14} /></div>
                <div className="lx-item__body"><div className="lx-item__meta" style={{ marginBottom: 3 }}>{h}</div><div style={{ fontSize: 14, color: 'var(--ink)' }}>{t}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
