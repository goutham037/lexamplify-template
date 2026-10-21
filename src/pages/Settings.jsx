import { useState } from 'react';
import * as Ic from '../icons.jsx';

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
function Toggle({ on = true }) {
  const [v, setV] = useState(on);
  return <button onClick={() => setV(!v)} style={{ width: 44, height: 26, borderRadius: 999, border: 0, background: v ? 'var(--accent)' : 'var(--rule)', position: 'relative', transition: 'background .2s' }}>
    <span style={{ position: 'absolute', top: 3, left: v ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /></button>;
}

const TEAM = [
  { n: 'Aarav Advocate', r: 'Owner · Senior Partner', i: 'A' },
  { n: 'Priya Sharma', r: 'Associate', i: 'P' },
  { n: 'Rohit Nair', r: 'Associate', i: 'R' },
  { n: 'Clerk Desk', r: 'Support · read-only', i: 'C' },
];
const INVOICES = [['Oct 2026', '₹2,999', 'Paid'], ['Sep 2026', '₹2,999', 'Paid'], ['Aug 2026', '₹2,999', 'Paid']];
const INTEGRATIONS = [['eCourts', 'Live case sync from eCourts', true], ['Google Drive', 'Save drafts to Drive', true], ['Outlook Calendar', 'Push hearings to your calendar', false], ['WhatsApp', 'Hearing reminders on WhatsApp', false]];

export default function Settings() {
  const [tab, setTab] = useState('Profile');

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
          <Row label="Full name" hint="As it appears on drafts and filings."><input style={field} defaultValue="Aarav Advocate" /></Row>
          <Row label="Enrolment" hint="Bar Council of Delhi."><input style={field} defaultValue="D/1123/2014" /></Row>
          <Row label="Email"><input style={field} defaultValue="aarav@advocatechambers.in" /></Row>
          <Row label="Signature block" hint="Appended to generated documents."><textarea style={{ ...field, height: 90, padding: 14, resize: 'vertical' }} defaultValue={'Aarav Advocate\nAdvocate, Delhi High Court'} /></Row>
        </>)}

        {tab === 'Chambers' && (<>
          <Row label="Chambers name"><input style={field} defaultValue="Advocate Chambers" /></Row>
          <Row label="Primary court"><input style={field} defaultValue="Delhi High Court" /></Row>
          <Row label="Address"><textarea style={{ ...field, height: 70, padding: 14 }} defaultValue={'Chamber 214, Delhi High Court, New Delhi'} /></Row>
          <Row label="Practice areas"><div className="chip-row">{['Taxation', 'Criminal', 'Corporate', 'Property'].map((c) => <span key={c} className="chip is-on">{c}</span>)}<span className="chip">+ Add</span></div></Row>
        </>)}

        {tab === 'Team' && (<>
          <div className="lx-between" style={{ padding: '4px 0 14px' }}><div className="lx-muted">{TEAM.length} members</div><button className="lx-btn lx-btn--gold lx-btn--sm"><Ic.Plus size={14} /> Invite</button></div>
          <div className="lx-list">
            {TEAM.map((m, i) => (
              <div className="lx-item" key={i}>
                <div className="rail__avatar" style={{ width: 38, height: 38 }}>{m.i}</div>
                <div className="lx-item__body"><div className="lx-item__title" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14.5 }}>{m.n}</div><div className="lx-item__meta">{m.r}</div></div>
                <button className="lx-btn lx-btn--ghost lx-btn--sm">Manage</button>
              </div>
            ))}
          </div>
        </>)}

        {tab === 'Billing' && (<>
          <div className="lx-card lx-card--pad" style={{ background: 'var(--accent-soft)', borderColor: 'color-mix(in srgb,var(--accent) 30%,transparent)', marginBottom: 20 }}>
            <div className="lx-between">
              <div><div className="lx-title" style={{ fontSize: 18 }}>Practice plan</div><div className="lx-muted" style={{ marginTop: 3 }}>₹2,999 / month · renews 01 Nov 2026</div></div>
              <button className="lx-btn lx-btn--ghost lx-btn--sm">Change plan</button>
            </div>
          </div>
          <div className="lx-section-head" style={{ marginBottom: 10 }}><h3>Invoices</h3></div>
          <div className="lx-list">
            {INVOICES.map(([m, a, s], i) => (
              <div className="lx-item" key={i}><div className="lx-item__ico" style={{ width: 32, height: 32 }}><Ic.Doc size={14} /></div>
                <div className="lx-item__title" style={{ flex: 1, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14 }}>{m}</div>
                <span style={{ color: 'var(--ink-soft)', fontWeight: 600, fontSize: 14 }}>{a}</span>
                <span className="lx-badge lx-badge--ok">{s}</span></div>
            ))}
          </div>
        </>)}

        {tab === 'Notifications' && (<>
          {[['Hearing reminders', 'The evening before and morning of a hearing'], ['Limitation alerts', 'When a deadline is within 7 days'], ['Draft ready', 'When the AI finishes a draft'], ['Weekly digest', 'A Monday summary of your week']].map(([l, h], i) => (
            <Row key={i} label={l} hint={h}><div style={{ display: 'flex', justifyContent: 'flex-end' }}><Toggle on={i < 3} /></div></Row>
          ))}
        </>)}

        {tab === 'Integrations' && (<>
          <div className="lx-list">
            {INTEGRATIONS.map(([n, d, on], i) => (
              <div className="lx-item" key={i}><div className="lx-item__ico"><Ic.Sliders size={16} /></div>
                <div className="lx-item__body"><div className="lx-item__title" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14.5 }}>{n}</div><div className="lx-item__meta">{d}</div></div>
                {on ? <span className="lx-badge lx-badge--ok"><Ic.Check size={12} /> Connected</span> : <button className="lx-btn lx-btn--ghost lx-btn--sm">Connect</button>}</div>
            ))}
          </div>
        </>)}

        {tab === 'Security' && (<>
          <Row label="Two-factor authentication" hint="Required for all privileged matters."><span className="lx-badge lx-badge--ok"><Ic.Shield size={12} /> Enabled</span></Row>
          <Row label="Data residency" hint="Where your matters are stored."><span className="lx-badge">India · AES-256</span></Row>
          <Row label="Model training" hint="Your data is never used to train models."><span className="lx-badge lx-badge--ok"><Ic.Check size={12} /> Excluded</span></Row>
          <Row label="Active sessions"><button className="lx-btn lx-btn--ghost lx-btn--sm">Sign out other devices</button></Row>
        </>)}

        {tab === 'Appearance' && (<>
          <Row label="Theme & layout" hint="Open Theme Studio (bottom-right) for the full set."><span className="lx-badge">Warm Luxury · Side rail</span></Row>
          <Row label="Density" hint="Spacing of lists and tables."><div className="lx-row" style={{ gap: 8 }}><button className="lx-btn lx-btn--sm" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>Comfortable</button><button className="lx-btn lx-btn--sm" style={{ background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink-soft)' }}>Compact</button></div></Row>
        </>)}

        {tab !== 'Team' && tab !== 'Billing' && tab !== 'Integrations' && tab !== 'Notifications' && (
          <div className="lx-row" style={{ gap: 10, marginTop: 24 }}>
            <button className="lx-btn lx-btn--primary">Save changes</button>
            <button className="lx-btn lx-btn--ghost">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
