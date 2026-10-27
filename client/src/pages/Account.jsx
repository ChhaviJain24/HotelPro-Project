import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api, { msg } from '../api';
import { setUser } from '../store/authSlice';
import { fdate } from '../utils';

export function Profile() {
  const { user } = useSelector((s) => s.auth), dispatch = useDispatch();
  const [f, setF] = useState({ name: user.name, phone: user.phone || '', currentPassword: '', newPassword: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try { const { data } = await api.put('/auth/me', f); const { token, ...updated } = data; dispatch(setUser(updated)); if (token) localStorage.setItem('token', token); setF({ ...f, currentPassword: '', newPassword: '' }); toast.success('Profile saved'); }
    catch (err) { toast.error(msg(err)); }
  };
  return (
    <div className="container py-4" style={{ maxWidth: 520 }}>
      <h2>My profile</h2>
      <form className="card p-4 mt-3" onSubmit={save}>
        <p className="text-body-secondary mb-2">{user.email} · {user.role}</p>
        <label className="form-label">Name<input className="form-control" value={f.name} onChange={set('name')} required /></label>
        <label className="form-label">Phone<input className="form-control" value={f.phone} onChange={set('phone')} /></label>
        <h5 className="mt-2">Change password</h5>
        <label className="form-label">Current password<input type="password" className="form-control" value={f.currentPassword} onChange={set('currentPassword')} /></label>
        <label className="form-label">New password<input type="password" minLength={6} className="form-control" value={f.newPassword} onChange={set('newPassword')} /></label>
        <button className="btn btn-primary">Save changes</button>
      </form>
    </div>
  );
}

export function Notifications() {
  const [list, setList] = useState(null);
  const load = () => api.get('/notifications').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const read = (id) => api.put(`/notifications/${id}/read`).then(load);
  const all = () => api.put('/notifications/read-all').then(load);
  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <div className="d-flex justify-content-between align-items-center"><h2>Notifications</h2><button className="btn btn-outline-secondary btn-sm" onClick={all}>Mark all read</button></div>
      {!list ? <div className="spinner-border mt-3" role="status" /> : list.length === 0 ? <p className="mt-3">You are all caught up. Booking and stay updates appear here.</p> :
        <div className="list-group mt-3">{list.map((n) => (
          <button key={n._id} className={'list-group-item list-group-item-action text-start ' + (n.read ? '' : 'fw-semibold')} onClick={() => !n.read && read(n._id)}>
            <div className="d-flex justify-content-between"><span>{!n.read && <span className="badge text-bg-warning me-2">New</span>}{n.title}</span><small className="text-body-secondary">{fdate(n.createdAt)}</small></div>
            <div className="small fw-normal">{n.message}</div>
          </button>))}</div>}
    </div>
  );
}
