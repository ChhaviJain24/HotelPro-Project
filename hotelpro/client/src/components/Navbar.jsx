import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import api from '../api';

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch(), nav = useNavigate(), loc = useLocation();
  const [unread, setUnread] = useState(0);
  useEffect(() => { if (user) api.get('/notifications/unread-count').then((r) => setUnread(r.data.count)).catch(() => {}); else setUnread(0); }, [user, loc.pathname]);
  const links = [['/', 'Home'], ['/rooms', 'Rooms']];
  if (user?.role === 'guest') links.push(['/bookings', 'My bookings']);
  if (user && user.role !== 'guest') links.push(['/staff', 'Front desk']);
  if (user?.role === 'admin') links.push(['/admin', 'Admin']);
  return (
    <nav className="navbar navbar-expand-lg navbar-hp navbar-dark sticky-top">
      <div className="container">
        <Link className="navbar-brand brand" to="/">HotelPro</Link>
        <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nv" aria-label="Menu"><span className="navbar-toggler-icon" /></button>
        <div className="collapse navbar-collapse" id="nv">
          <ul className="navbar-nav me-auto">
            {links.map(([to, label]) => <li className="nav-item" key={to}><NavLink end={to === '/'} className="nav-link" to={to}>{label}</NavLink></li>)}
          </ul>
          <div className="d-flex gap-2 align-items-center">
            {user ? (<>
              <Link to="/notifications" className="btn btn-sm btn-outline-light">Notifications {unread > 0 && <span className="badge text-bg-warning">{unread}</span>}</Link>
              <Link to="/profile" className="btn btn-sm btn-outline-light">{user.name.split(' ')[0]} ({user.role})</Link>
              <button className="btn btn-sm btn-accent" onClick={() => { dispatch(logout()); nav('/'); }}>Sign out</button>
            </>) : (<>
              <Link to="/login" className="btn btn-sm btn-outline-light">Sign in</Link>
              <Link to="/register" className="btn btn-sm btn-accent">Create account</Link>
            </>)}
          </div>
        </div>
      </div>
    </nav>
  );
}
