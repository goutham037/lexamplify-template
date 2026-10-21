import { useState } from 'react';
import * as Ic from '../icons.jsx';

const DAYS = [
  { day: 'Today', date: 'Wed 22 Oct', items: [
    { time: '10:30', title: 'Mehta Industries v. Union of India', meta: 'Delhi HC · Court 12 · Arguments', tone: 'warn' },
    { time: '14:15', title: 'State v. R. Khanna', meta: 'Saket DC · Court 4 · Evidence', tone: 'muted' },
  ] },
  { day: 'Tomorrow', date: 'Thu 23 Oct', items: [
    { time: '11:00', title: 'Rao v. Sunrise Developers', meta: 'NCDRC · Final hearing', tone: 'ok' },
  ] },
  { day: 'Friday', date: 'Fri 24 Oct', items: [
    { time: '—', title: 'Written statement due — Verma Estate', meta: 'Filing deadline · limitation', tone: 'risk' },
    { time: '12:30', title: 'Verma Estate — Succession', meta: 'Saket DC · Probate hearing', tone: 'warn' },
  ] },
];

const EVENTS = { 22: 'warn', 23: 'ok', 24: 'risk', 29: 'ok', 31: 'muted', 6: 'ok' };

export default function Calendar() {
  const [view, setView] = useState('agenda');
  const first = 3; // 01 Oct 2026 is a Wednesday (Sun=0)
  const days = 31;
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <div className="lx-page lx-rise">
      <div className="lx-between ph" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 18 }}>
        <div>
          <span className="ph__eyebrow">This week</span>
          <h1 className="ph__title">Calendar</h1>
          <p className="ph__sub">Hearings, filings and limitation — synced live from eCourts.</p>
        </div>
        <div className="lx-row" style={{ gap: 10 }}>
          <div className="seg" style={{ width: 200 }}>
            {['agenda', 'month'].map((v) => <button key={v} className={view === v ? 'is-on' : ''} onClick={() => setView(v)} style={{ textTransform: 'capitalize' }}>{v}</button>)}
          </div>
          <button className="lx-btn lx-btn--ghost lx-btn--sm"><Ic.Plus size={14} /> Add</button>
        </div>
      </div>

      {view === 'agenda' ? (
        <div className="lx-stack" style={{ gap: 18 }}>
          {DAYS.map((d) => (
            <div className="lx-card lx-card--pad" key={d.day}>
              <div className="lx-between" style={{ marginBottom: 12 }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{d.day}</h3>
                <span className="lx-muted" style={{ letterSpacing: '.04em' }}>{d.date}</span>
              </div>
              <div className="lx-list">
                {d.items.map((it, i) => (
                  <div className="lx-item" key={i}>
                    <div style={{ width: 52, textAlign: 'center', flexShrink: 0, fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: it.time === '—' ? 'var(--risk)' : 'var(--ink)' }}>{it.time}</div>
                    <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--rule)', margin: '2px 4px' }} />
                    <div className="lx-item__body"><div className="lx-item__title">{it.title}</div><div className="lx-item__meta">{it.meta}</div></div>
                    <span className={`lx-badge lx-badge--${it.tone}`}>{it.tone === 'risk' ? 'Deadline' : it.tone === 'warn' ? 'Hearing' : 'Listed'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="lx-card lx-card--pad">
          <div className="lx-between" style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>October 2026</h3>
            <div className="lx-row" style={{ gap: 6 }}><button className="icon-btn" style={{ width: 34, height: 34 }}><Ic.Chevron size={16} style={{ transform: 'rotate(180deg)' }} /></button><button className="icon-btn" style={{ width: 34, height: 34 }}><Ic.Chevron size={16} /></button></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', padding: '4px 0', fontWeight: 600 }}>{d}</div>)}
            {cells.map((n, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 10, border: n ? '1px solid var(--rule)' : '0', padding: 7, position: 'relative', background: n === 22 ? 'var(--accent-soft)' : 'transparent' }}>
                {n && <span style={{ fontSize: 13, color: n === 22 ? 'var(--accent-ink)' : 'var(--ink)', fontWeight: n === 22 ? 700 : 400, fontFamily: 'var(--font-serif)' }}>{n}</span>}
                {n && EVENTS[n] && <span style={{ position: 'absolute', bottom: 8, left: 8, width: 6, height: 6, borderRadius: '50%', background: EVENTS[n] === 'risk' ? 'var(--risk)' : EVENTS[n] === 'warn' ? 'var(--warn)' : EVENTS[n] === 'ok' ? 'var(--ok)' : 'var(--muted-2)' }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
