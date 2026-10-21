import { useNavigate } from 'react-router-dom';
import * as Ic from '../icons.jsx';

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="auth">
      <div className="auth__brand">
        <div className="auth__glow" />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="rail__mono" style={{ borderColor: 'rgba(176,141,87,.55)' }}>L</div>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600 }}>Lexamplify</span>
        </div>
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 'clamp(28px, 3.2vw, 42px)', lineHeight: 1.12, marginBottom: 18 }}>
            The art of law,<br />the precision of AI.
          </h1>
          <p style={{ color: 'var(--rail-muted)', fontSize: 15, lineHeight: 1.7, maxWidth: 420 }}>
            Measured, citation-grounded intelligence for the chambers that set the standard. Research, draft, review and advise — in one calm workspace.
          </p>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 22, color: 'var(--rail-muted)', fontSize: 12.5 }}>
          <span>SOC 2 Type II</span><span>DPDP compliant</span><span>Data stays in India</span>
        </div>
      </div>

      <div className="auth__panel">
        <div className="auth__card">
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28 }}>Welcome back</h2>
          <p className="lx-muted" style={{ marginTop: 6, marginBottom: 28 }}>Sign in to your chambers.</p>

          <button className="lx-btn lx-btn--ghost" style={{ width: '100%', height: 48, marginBottom: 14 }}>
            <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
            Continue with Google
          </button>
          <div className="lx-row" style={{ gap: 12, margin: '18px 0' }}><hr className="lx-rule" style={{ flex: 1 }} /><span className="lx-muted" style={{ fontSize: 12 }}>or</span><hr className="lx-rule" style={{ flex: 1 }} /></div>

          <form onSubmit={(e) => { e.preventDefault(); navigate('/'); }}>
            <div style={{ marginBottom: 14 }}><label className="lbl">Email</label><input className="inp" type="email" placeholder="you@chambers.in" defaultValue="aarav@advocatechambers.in" /></div>
            <div style={{ marginBottom: 10 }}><label className="lbl">Password</label><input className="inp" type="password" placeholder="••••••••" defaultValue="password" /></div>
            <div className="lx-between" style={{ marginBottom: 22 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--ink-soft)' }}><input type="checkbox" defaultChecked /> Remember me</label>
              <a className="link-underline" style={{ fontSize: 13, color: 'var(--accent-ink)' }}>Forgot password?</a>
            </div>
            <button type="submit" className="lx-btn lx-btn--primary" style={{ width: '100%', height: 48 }}>Sign in <Ic.Arrow size={15} /></button>
          </form>
          <p className="lx-muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 13 }}>New to Lexamplify? <a className="link-underline" style={{ color: 'var(--accent-ink)' }}>Request access</a></p>
        </div>
      </div>
    </div>
  );
}
