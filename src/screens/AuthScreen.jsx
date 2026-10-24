// Welcome: log in or sign up. The arched mirror, the app name and the tagline sit above a small
// form; switching between "Log in" and "Sign up" only adds the name field.
import { useState } from 'react';
import MirrorScene from '../components/MirrorScene';
import ThemeToggle from '../components/ThemeToggle';
import { TAGLINE } from '../config/app';
import { isDemoAuth } from '../services/authService';
import { useApp } from '../state/AppContext';

const MIN_PASSWORD = 8;
// Server errors from the http helper read like "POST /auth/login -> 401"; show something human instead.
const friendly = (error, mode) =>
  /^(GET|POST) /.test(error.message) || error.name === 'AbortError'
    ? `Couldn't ${mode === 'login' ? 'log in' : 'create your account'}. Check your details and try again.`
    : error.message;

export default function AuthScreen() {
  const { logIn, signUp } = useApp();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignUp = mode === 'signup';
  const [lineOne, lineTwo] = TAGLINE.split(/(?<=wall,)\s+/);

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const switchTo = (next) => {
    setMode(next);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (isSignUp && form.password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setBusy(true);
    try {
      await (isSignUp ? signUp(form) : logIn(form));
    } catch (failure) {
      setError(friendly(failure, mode));
      setBusy(false);
    }
  };

  const words = (line, offset) =>
    line.split(' ').map((word, index) => <span key={index} style={{ '--i': offset + index }}>{word} </span>);

  return (
    <div className="auth">
      <div className="auth-theme"><ThemeToggle /></div>

      <header className="auth-hero">
        <MirrorScene />
        <h1 className="auth-title">Wanderlust</h1>
        <p className="auth-tagline">
          <span className="auth-line">{words(lineOne, 0)}</span>
          <span className="auth-line">{words(lineTwo ?? '', lineOne.split(' ').length)}</span>
        </p>
      </header>

      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-tabs" role="tablist" aria-label="Account">
          <button type="button" role="tab" aria-selected={!isSignUp} className={!isSignUp ? 'active' : ''} onClick={() => switchTo('login')}>Log in</button>
          <button type="button" role="tab" aria-selected={isSignUp} className={isSignUp ? 'active' : ''} onClick={() => switchTo('signup')}>Sign up</button>
        </div>

        {isSignUp && (
          <label className="auth-field" htmlFor="auth-name">
            <span>Name</span>
            <input id="auth-name" value={form.name} onChange={set('name')} autoComplete="name" required />
          </label>
        )}
        <label className="auth-field" htmlFor="auth-email">
          <span>Email</span>
          <input id="auth-email" type="email" value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" required />
        </label>
        <label className="auth-field" htmlFor="auth-password">
          <span>Password</span>
          <input id="auth-password" type="password" value={form.password} onChange={set('password')} autoComplete={isSignUp ? 'new-password' : 'current-password'} required />
        </label>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="magic-btn auth-submit" disabled={busy || !form.email || !form.password || (isSignUp && !form.name.trim())}>
          <span>{busy ? 'One moment…' : isSignUp ? 'Create account' : 'Log in'}</span>
        </button>

        <p className="auth-switch">
          {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" onClick={() => switchTo(isSignUp ? 'login' : 'signup')}>{isSignUp ? 'Log in' : 'Create an account'}</button>
        </p>
      </form>

      {isDemoAuth() && <p className="auth-note mono">Demo mode · accounts are saved on this device</p>}
    </div>
  );
}
