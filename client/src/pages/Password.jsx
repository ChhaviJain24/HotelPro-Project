import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { msg } from '../api';

export function ForgotPassword() {
  const [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/auth/forgot-password', { email }); setSent(true); } catch (x) { setErr(msg(x)); } finally { setBusy(false); }
  };
  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
      <h2>Forgot your password?</h2>
      {sent ? (
        <div className="card p-4 mt-3">
          <p>If <b>{email}</b> has an account, we have sent a reset link. It works for 30 minutes.</p>
          <p className="small text-body-secondary">Check your spam folder too. Running on your own computer without email set up? The link is printed in the server terminal.</p>
          <Link to="/login">Back to sign in</Link>
        </div>
      ) : (
        <form className="card p-4 mt-3" onSubmit={submit}>
          <p className="text-body-secondary">Enter your account email and we will send you a link to choose a new password.</p>
          <label className="form-label">Email<input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          {err && <div className="alert alert-danger py-2" role="alert">{err}</div>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
          <p className="mt-3 mb-0 small"><Link to="/login">Back to sign in</Link></p>
        </form>
      )}
    </div>
  );
}

export function ResetPassword() {
  const { token } = useParams(), nav = useNavigate();
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (pw !== pw2) return setErr('The two passwords do not match');
    setBusy(true);
    try { await api.post('/auth/reset-password/' + token, { password: pw }); toast.success('Password updated. Please sign in.'); nav('/login', { replace: true }); }
    catch (x) { setErr(msg(x)); } finally { setBusy(false); }
  };
  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
      <h2>Choose a new password</h2>
      <form className="card p-4 mt-3" onSubmit={submit}>
        <label className="form-label">New password<input type="password" minLength={6} className="form-control" value={pw} onChange={(e) => setPw(e.target.value)} required /></label>
        <label className="form-label">Confirm password<input type="password" minLength={6} className="form-control" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></label>
        {err && <div className="alert alert-danger py-2" role="alert">{err} {err.includes('expired') && <Link to="/forgot-password">Request a new link</Link>}</div>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save new password'}</button>
      </form>
    </div>
  );
}
