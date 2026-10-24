import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import * as Ic from '../icons.jsx';
import ThemeStudio from '../components/ThemeStudio.jsx';
import CommandBar from '../components/CommandBar.jsx';
import Notifications from '../components/Notifications.jsx';
import { useSettings } from '../store/useSettings.js';
import { useAuth } from '../context/AuthContext.jsx';

const fire = (name) => window.dispatchEvent(new Event(name));

const GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Today', Icon: Ic.Today, end: true },
      { to: '/matters', label: 'Matters', Icon: Ic.Matters },
      { to: '/draft', label: 'Draft', Icon: Ic.Draft, badge: true },
      { to: '/research', label: 'Research', Icon: Ic.Research },
    ],
  },
  {
    label: 'Review',
    items: [
      { to: '/contracts', label: 'Contracts', Icon: Ic.Contracts },
      { to: '/calendar', label: 'Calendar', Icon: Ic.Calendar },
    ],
  },
  {
    label: 'Firm',
    items: [
      { to: '/library', label: 'Library', Icon: Ic.Library },
      { to: '/settings', label: 'Settings', Icon: Ic.Settings },
    ],
  },
];

const FLAT = GROUPS.flatMap((g) => g.items);

export default function Shell() {
  const [open, setOpen] = useState(false);
  const layout = useSettings((st) => st.layout);
  const mini = layout === 'focus';
  const { user, logout } = useAuth();

  const displayName = user?.name || user?.full_name || user?.email || 'Advocate';
  const role = user?.role || user?.designation || 'Advocate';
  const firm = user?.firm_name || user?.workspace_name || 'Advocate Chambers';
  const initial = (displayName || 'A').trim().charAt(0).toUpperCase();

  return (
    <div className="app">
      <aside className={`rail ${mini ? 'rail--mini' : ''} ${open ? 'is-open' : ''}`}>
        <div className="rail__brand">
          <div className="rail__mono">L</div>
          <div className="rail__word"><b>Lexamplify</b><span>Advocate Chambers</span></div>
        </div>

        <nav className="rail__nav">
          {GROUPS.map((g) => (
            <div className="rail__group" key={g.label}>
              <div className="rail__group-label">{g.label}</div>
              {g.items.map(({ to, label, Icon, end, badge }) => (
                <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `rail__link ${isActive ? 'is-active' : ''}`}>
                  <Icon /><span>{label}</span>{badge && <span className="rail__badge" />}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="rail__foot">
          <div className="rail__user">
            <div className="rail__avatar">{initial}</div>
            <div className="rail__user-meta" style={{ minWidth: 0 }}>
              <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</b>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--rail-muted)', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar__left">
            <button className="icon-btn rail-toggle" onClick={() => setOpen((v) => !v)} aria-label="Menu"><Ic.Menu size={18} /></button>
            <div className="rail__mono topbar__mono" style={{ width: 32, height: 32, fontSize: 16 }}>L</div>
            <div className="topbar__crumb"><b>{firm}</b></div>
          </div>

          <nav className="topnav">
            {FLAT.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'is-active' : '')}>{label}</NavLink>
            ))}
          </nav>

          <div className="topbar__right">
            <button className="cmdk" onClick={() => fire('lx:cmdk')}><Ic.Search size={16} /><span>Search or ask anything</span><kbd>⌘K</kbd></button>
            <button className="icon-btn" aria-label="Notifications" style={{ position: 'relative' }} onClick={() => fire('lx:notifications')}>
              <Ic.Bell size={18} />
              <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--paper)' }} />
            </button>
          </div>
        </header>

        <div className="main__scroll"><Outlet /></div>
      </div>

      {/* Theme Studio hidden for now — Slate Pro is the finalized default. Re-enable by rendering <ThemeStudio />. */}
      <CommandBar />
      <Notifications />
    </div>
  );
}
