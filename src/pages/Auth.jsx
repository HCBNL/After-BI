import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../lib/app.jsx';
import { signIn, signUp, resetPassword, LOCAL } from '../lib/store.js';
import { Logo, Art, LangMenu } from '../components/ui.jsx';

function Frame({ children }) {
  return (
    <div className="auth">
      <div className="auth-brand">
        <Link to="/"><Logo size={28} /></Link>
        <div className="auth-art" aria-hidden="true">
          <Art name="bloom" size={150} className="aa1" />
          <Art name="daisy" size={110} className="aa2" />
          <Art name="pinwheel" size={90} className="aa3" />
          <Art name="loop" size={100} className="aa4" />
        </div>
      </div>
      <div className="auth-form">
        <div className="auth-top"><Link to="/" className="auth-logo-sm"><Logo size={24} /></Link><LangMenu /></div>
        <div className="auth-inner">{children}</div>
      </div>
    </div>
  );
}

function errText(t, e) {
  const m = String(e?.code || e?.message || '');
  if (m.includes('email-already')) return t('auth.err.exists');
  if (m.includes('weak-password')) return t('auth.err.weak');
  if (m.includes('invalid-email')) return t('auth.err.email');
  return t('auth.err.wrong');
}

export function SignIn() {
  const { t, authUser } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (authUser) return <Navigate to="/app" replace />;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('');
    try { await signIn(email, pass); nav('/app'); } catch (err) { setMsg(errText(t, err)); }
    setBusy(false);
  };
  const forgot = async () => {
    if (!email) { setMsg(t('auth.forgot.need')); return; }
    try { await resetPassword(email); setMsg(LOCAL ? t('auth.forgot.local') : t('auth.forgot.sent')); } catch (err) { setMsg(errText(t, err)); }
  };

  return (
    <Frame>
      <h1 className="auth-title">{t('auth.signin')}</h1>
      <form onSubmit={submit} className="form">
        <label>{t('auth.email')}<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>{t('auth.password')}<input type="password" required value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" /></label>
        <button type="button" className="link-btn" onClick={forgot}>{t('auth.forgot')}</button>
        {msg && <p className="form-msg">{msg}</p>}
        <button className="btn dark full" disabled={busy}>{busy ? <span className="dots"><i /><i /><i /></span> : t('auth.signin')}</button>
      </form>
    </Frame>
  );
}

export function SignUp() {
  const { t, authUser } = useApp();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (authUser) return <Navigate to="/app" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (pass.length < 8) { setMsg(t('auth.err.weak')); return; }
    setBusy(true); setMsg('');
    try { await signUp(name.trim(), email, pass); nav('/app'); } catch (err) { setMsg(errText(t, err)); }
    setBusy(false);
  };

  return (
    <Frame>
      <h1 className="auth-title">{t('auth.create')}</h1>
      <form onSubmit={submit} className="form">
        <label>{t('auth.name')}<input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label>{t('auth.email')}<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>{t('auth.password')}<input type="password" required value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" /></label>
        {msg && <p className="form-msg">{msg}</p>}
        <button className="btn dark full" disabled={busy}>{busy ? <span className="dots"><i /><i /><i /></span> : t('auth.create')}</button>
      </form>
    </Frame>
  );
}
