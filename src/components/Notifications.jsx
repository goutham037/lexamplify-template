import { useState, useEffect } from 'react';
import * as Ic from '../icons.jsx';
import { NOTIFICATIONS } from '../data/sample.js';

const ICON = { gavel: Ic.Gavel, clock: Ic.Clock, draft: Ic.Draft, contract: Ic.Contracts, check: Ic.Check };

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(NOTIFICATIONS);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('lx:notifications', onOpen);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('lx:notifications', onOpen); window.removeEventListener('keydown', onKey); };
  }, []);

  const unread = items.filter((i) => i.unread).length;
  if (!open) return null;

  return (
    <div className="studio-overlay" onClick={() => setOpen(false)}>
      <aside className="nd" onClick={(e) => e.stopPropagation()}>
        <div className="nd__head">
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>Notifications</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>{unread} unread</p>
          </div>
          <div className="lx-row" style={{ gap: 8 }}>
            <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => setItems((xs) => xs.map((x) => ({ ...x, unread: false })))}>Mark all read</button>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><Ic.X size={17} /></button>
          </div>
        </div>
        <div className="nd__list">
          {items.map((n, i) => {
            const I = ICON[n.icon] || Ic.Bell;
            return (
              <div className="nd__it" key={i}>
                {n.unread && <span className="nd__unread" />}
                <div className="nd__ico"><I size={17} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{n.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{n.meta}</div>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--muted)', flexShrink: 0 }}>{n.time}</span>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
