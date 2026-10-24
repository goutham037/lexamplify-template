import { useState, useEffect } from 'react';
import * as Ic from '../icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../store/useSettings.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

const TABS = ['Profile', 'Chambers', 'Team', 'Billing', 'Notifications', 'Integrations', 'Security', 'Appearance'];

function Row({ label, hint, children }) {
  return (
    <div className="lx-between" style={{ padding: '18px 0', borderBottom: '1px solid var(--rule)', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ maxWidth: 300 }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14.5 }}>{label}</div>
        {hint && <div className="lx-muted" style={{ marginTop: 3, lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ flex: 1, maxWidth: 380 }}>{children}</div>
    </div>
  );
}
const field = { width: '100%', height: 44, border: '1px solid var(--rule)', borderRadius: 10, padding: '0 14px', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none' };
const fieldRO = { ...field, background: 'var(--bg-soft, var(--bg-card))', color: 'var(--ink-soft)', opacity: .85 };
function Toggle({ on = true }) {
  const [v, setV] = useState(on);
  return <button onClick={() => setV(!v)} style={{ width: 44, height: 26, borderRadius: 999, border: 0, background: v ? 'var(--accent)' : 'var(--rule)', position: 'relative', transition: 'background .2s' }}>
    <span style={{ position: 'absolute', top: 3, left: v ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /></button>;
}

// Segmented control that reads/writes the shared useSettings store so
// appearance choices actually drive the live theme (same store Theme Studio uses).
function Seg({ options, value, onChange }) {
  return (
    <div className="lx-row" style={{ gap: 8 }}>
      {options.map(([id, name]) => {
        const on = value === id;
        return (
          <button key={id} className="lx-btn lx-btn--sm" onClick={() => onChange(id)}
            style={on
              ? { background: 'var(--ink)', color: 'var(--paper)' }
              : { background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink-soft)' }}>
            {name}
          </button>
        );
      })}
    </div>
  );
}

// Integration descriptions are static product information (not user data).
const INTEGRATIONS = [
  ['eCourts', 'Live case sync from eCourts'],
  ['Google Drive', 'Save drafts to Drive'],
  ['Outlook Calendar', 'Push hearings to your calendar'],
  ['WhatsApp', 'Hearing reminders on WhatsApp'],
];

export default function Settings() {
  const [tab, setTab] = useState('Profile');
  const { user, logout } = useAuth();
  const s = useSettings();

  // ── Account (GET /api/auth/me, falling back to the signed-in user) ──
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [meErr, setMeErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (!res.ok) {
          if (alive) setMeErr(res.status === 401 ? 'Your session has expired. Please sign in again.' : 'Could not load your account.');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (alive) setMe(data.user || data || null);
      } catch {
        if (alive) setMeErr('Could not reach the server.');
      } finally {
        if (alive) setLoadingMe(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const acct = me || user || null;
  const acctName = (acct?.name || acct?.full_name || '').trim();
  const acctEmail = acct?.email || '';
  const acctRole = acct?.role || '';
  const acctPhone = acct?.phone || '';
  const monogram = (acctName || acctEmail || 'L').trim().charAt(0).toUpperCase();
  const memberSince = acct?.created_at
    ? new Date(acct.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
    : null;

  // ── Change password (POST /api/auth/change-password) ──
  const [cur, setCur] = useState('');
  const [npw, setNpw] = useState('');
  const [cpw, setCpw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null); // { ok, text }

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (!cur || !npw) { setPwMsg({ ok: false, text: 'Fill in your current and new password.' }); return; }
    if (npw.length < 8) { setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return; }
    if (npw !== cpw) { setPwMsg({ ok: false, text: 'New password and confirmation do not match.' }); return; }
    setPwBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        body: JSON.stringify({ current_password: cur, new_password: npw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error('Your session has expired. Please sign in again.');
        throw new Error(data.error || 'Could not change your password.');
      }
      setPwMsg({ ok: true, text: 'Password changed successfully.' });
      setCur(''); setNpw(''); setCpw('');
    } catch (e2) {
      setPwMsg({ ok: false, text: e2.message || 'Something went wrong.' });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="lx-page lx-rise" style={{ maxWidth: 940 }}>
      <div className="ph">
        <span className="ph__eyebrow">Account</span>
        <h1 className="ph__title">Settings</h1>
        <p className="ph__sub">Manage your profile, chambers and how Lexamplify works for you.</p>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        {TABS.map((t) => <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      <div className="lx-card lx-card--pad">
        {tab === 'Profile' && (<>
          {meErr && <div className="lx-badge lx-badge--risk" style={{ marginBottom: 6 }}>{meErr}</div>}
          <Row label="Full name" hint="As it appears on drafts and filings.">
            <input style={fieldRO} value={loadingMe ? 'Loading…' : (acctName || '—')} readOnly />
          </Row>
          <Row label="Email" hint="Your sign-in ID.">
            <input style={fieldRO} value={loadingMe ? 'Loading…' : (acctEmail || '—')} readOnly />
          </Row>
          <Row label="Role" hint="Your access level in this workspace.">
            <span className="lx-badge">{loadingMe ? '…' : (acctRole || 'Lawyer')}</span>
          </Row>
          {acctPhone && (
            <Row label="Phone"><input style={fieldRO} value={acctPhone} readOnly /></Row>
          )}
          <Row label="Member since" hint="When your account was created.">
            <span className="lx-badge">{memberSince || '—'}</span>
          </Row>
          <div className="lx-row" style={{ gap: 10, marginTop: 24 }}>
            <button className="lx-btn lx-btn--ghost" onClick={() => logout()}><Ic.Arrow size={15} /> Sign out</button>
          </div>
        </>)}

        {tab === 'Chambers' && (<>
          <Row label="Chambers name"><input style={field} placeholder="Not set" defaultValue="" /></Row>
          <Row label="Primary court"><input style={field} placeholder="Not set" defaultValue="" /></Row>
          <Row label="Address"><textarea style={{ ...field, height: 70, padding: 14 }} placeholder="Not set" defaultValue="" /></Row>
          <Row label="Practice areas" hint="Chambers details aren't synced to your account yet.">
            <div className="chip-row"><span className="chip">+ Add</span></div>
          </Row>
        </>)}

        {tab === 'Team' && (<>
          <div className="lx-between" style={{ padding: '4px 0 14px' }}>
            <div className="lx-muted">{acct ? '1 member' : 'No members'}</div>
          </div>
          <div className="lx-list">
            {acct ? (
              <div className="lx-item">
                <div className="rail__avatar" style={{ width: 38, height: 38 }}>{monogram}</div>
                <div className="lx-item__body">
                  <div className="lx-item__title" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14.5 }}>{acctName || acctEmail || 'You'}</div>
                  <div className="lx-item__meta">Owner{acctRole ? ` · ${acctRole}` : ''}</div>
                </div>
                <span className="lx-badge lx-badge--ok">You</span>
              </div>
            ) : (
              <div className="lx-empty"><p>{loadingMe ? 'Loading…' : 'No team members to show.'}</p></div>
            )}
          </div>
          <div className="lx-muted" style={{ marginTop: 14 }}>Inviting teammates isn't available yet.</div>
        </>)}

        {tab === 'Billing' && (
          <div className="lx-empty" style={{ padding: '32px 0' }}>
            <p>No billing information is available for your account yet.</p>
          </div>
        )}

        {tab === 'Notifications' && (<>
          {[['Hearing reminders', 'The evening before and morning of a hearing'], ['Limitation alerts', 'When a deadline is within 7 days'], ['Draft ready', 'When the AI finishes a draft'], ['Weekly digest', 'A Monday summary of your week']].map(([l, h], i) => (
            <Row key={i} label={l} hint={h}><div style={{ display: 'flex', justifyContent: 'flex-end' }}><Toggle on={i < 3} /></div></Row>
          ))}
        </>)}

        {tab === 'Integrations' && (<>
          <div className="lx-list">
            {INTEGRATIONS.map(([n, d], i) => (
              <div className="lx-item" key={i}><div className="lx-item__ico"><Ic.Sliders size={16} /></div>
                <div className="lx-item__body"><div className="lx-item__title" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14.5 }}>{n}</div><div className="lx-item__meta">{d}</div></div>
                <button className="lx-btn lx-btn--ghost lx-btn--sm">Connect</button></div>
            ))}
          </div>
        </>)}

        {tab === 'Security' && (<>
          <form onSubmit={changePassword}>
            <Row label="Current password" hint="Required to confirm the change.">
              <input style={field} type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
            </Row>
            <Row label="New password" hint="At least 8 characters.">
              <input style={field} type="password" autoComplete="new-password" value={npw} onChange={(e) => setNpw(e.target.value)} />
            </Row>
            <Row label="Confirm new password">
              <input style={field} type="password" autoComplete="new-password" value={cpw} onChange={(e) => setCpw(e.target.value)} />
            </Row>
            <div className="lx-row" style={{ gap: 10, marginTop: 24, alignItems: 'center' }}>
              <button type="submit" className="lx-btn lx-btn--primary" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</button>
              {pwMsg && <span className={`lx-badge ${pwMsg.ok ? 'lx-badge--ok' : 'lx-badge--risk'}`}>{pwMsg.ok && <Ic.Check size={12} />} {pwMsg.text}</span>}
            </div>
          </form>

          <div style={{ marginTop: 10 }}>
            <Row label="Data residency" hint="Where your matters are stored."><span className="lx-badge">India · AES-256</span></Row>
            <Row label="Model training" hint="Your data is never used to train models."><span className="lx-badge lx-badge--ok"><Ic.Check size={12} /> Excluded</span></Row>
          </div>
        </>)}

        {tab === 'Appearance' && (<>
          <Row label="Theme & accent" hint="Open Theme Studio (bottom-right) for the full palette.">
            <span className="lx-badge">{s.theme} · {s.layout} layout</span>
          </Row>
          <Row label="Density" hint="Spacing of lists and tables.">
            <Seg options={[['comfortable', 'Comfortable'], ['compact', 'Compact']]} value={s.density} onChange={(v) => s.update({ density: v })} />
          </Row>
          <Row label="Text size" hint="Base reading size across the app.">
            <Seg options={[['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large']]} value={s.text} onChange={(v) => s.update({ text: v })} />
          </Row>
          <Row label="Motion" hint="Reduce animations if you prefer.">
            <Seg options={[['full', 'Full'], ['reduced', 'Reduced']]} value={s.motion} onChange={(v) => s.update({ motion: v })} />
          </Row>
        </>)}
      </div>
    </div>
  );
}
