import { useState, useEffect } from 'react';
import * as Ic from '../icons.jsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const ICON = { gavel: Ic.Gavel, clock: Ic.Clock, draft: Ic.Draft, contract: Ic.Contracts, check: Ic.Check, hearing: Ic.Gavel, deadline: Ic.Clock };

// Map a backend notification to the shape this drawer renders. The practice
// notifications endpoint returns items with varying fields across versions, so
// read defensively and never invent anything.
function toItem(n) {
  return {
    title: n.title || n.message || n.text || 'Notification',
    meta: n.meta || n.detail || n.body || n.case_title || '',
    time: n.time || n.when || (n.created_at ? new Date(String(n.created_at).replace(' ', 'T')).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''),
    icon: n.icon || n.type || 'check',
    unread: n.unread ?? !n.read,
  };
}

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setLoading(true);
      fetch(`${API_BASE}/api/practice/notifications`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const list = d?.notifications || d?.items || (Array.isArray(d) ? d : []);
          setItems(Array.isArray(list) ? list.map(toItem) : []);
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    };
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
          {loading && <div style={{ padding: '24px 18px', color: 'var(--muted)', fontSize: 13.5 }}>Loading…</div>}
          {!loading && items.length === 0 && (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 8 }}><Ic.Bell size={22} /></div>
              You’re all caught up.
            </div>
          )}
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
