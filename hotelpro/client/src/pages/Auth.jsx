import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, register, clearError } from '../store/authSlice';

function AuthForm({ mode }) {
  const isReg = mode === 'register';
  const dispatch = useDispatch(), nav = useNavigate(), loc = useLocation();
  const { loading, error, user } = useSelector((s) => s.auth);
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  useEffect(() => { dispatch(clearError()); }, [mode]); // eslint-disable-line
  useEffect(() => { if (user) nav(loc.state?.from || (user.role === 'admin' ? '/admin' : user.role === 'staff' ? '/staff' : '/bookings'), { replace: true }); }, [user]); // eslint-disable-line
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => { e.preventDefault(); dispatch(isReg ? register(f) : login({ email: f.email, password: f.password })); };
  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
      <h2>{isReg ? 'Create your account' : 'Sign in'}</h2>
      <form className="card p-4 mt-3" onSubmit={submit}>
        {isReg && <label className="form-label">Full name<input className="form-control" value={f.name} onChange={set('name')} required /></label>}
        <label className="form-label">Email<input type="email" className="form-control" value={f.email} onChange={set('email')} required /></label>
        {isReg && <label className="form-label">Phone<input className="form-control" value={f.phone} onChange={set('phone')} /></label>}
        <label className="form-label">Password<input type="password" minLength={6} className="form-control" value={f.password} onChange={set('password')} required /></label>
        {!isReg && <p className="small mb-2"><Link to="/forgot-password">Forgot password?</Link></p>}
        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Please wait...' : isReg ? 'Create account' : 'Sign in'}</button>
        <p className="mt-3 mb-0 small">{isReg ? <>Already registered? <Link to="/login">Sign in</Link></> : <>New here? <Link to="/register">Create an account</Link></>}</p>
      </form>
    </div>
  );
}
export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
