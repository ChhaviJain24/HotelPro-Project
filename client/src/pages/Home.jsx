import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import RoomCard from '../components/RoomCard';
import { iso } from '../utils';

export default function Home() {
  const nav = useNavigate();
  const [f, setF] = useState({ checkIn: iso(1), checkOut: iso(3), guests: 2, category: '' });
  const [featured, setFeatured] = useState([]);
  useEffect(() => { api.get('/rooms').then((r) => setFeatured(r.data.filter((x) => x.status !== 'Maintenance').slice(0, 4))).catch(() => {}); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = (e) => { e.preventDefault(); nav('/rooms?' + new URLSearchParams(Object.entries(f).filter(([, v]) => v))); };
  return (<>
    <section className="hero"><div className="container"><div className="row align-items-center g-4">
      <div className="col-lg-7">
        <h1>Run every room, booking and guest from one place.</h1>
        <p className="lead text-white-50 mt-3" style={{ maxWidth: '38em' }}>HotelPro is a hotel management system for guests, front-desk staff and administrators, from boutique stays to large chains.</p>
      </div>
      <div className="col-lg-5 d-none d-lg-block"><img src="/images/hero.svg" alt="HotelPro hotel building at dusk" className="img-fluid rounded-3" /></div>
    </div></div></section>
    <div className="container">
      <form className="card search-card p-3" onSubmit={go}>
        <div className="row g-3 align-items-end">
          <div className="col-6 col-md-3"><label className="form-label small">Check-in<input type="date" className="form-control" min={iso()} value={f.checkIn} onChange={set('checkIn')} required /></label></div>
          <div className="col-6 col-md-3"><label className="form-label small">Check-out<input type="date" className="form-control" min={f.checkIn} value={f.checkOut} onChange={set('checkOut')} required /></label></div>
          <div className="col-4 col-md-2"><label className="form-label small">Guests<input type="number" min="1" max="6" className="form-control" value={f.guests} onChange={set('guests')} /></label></div>
          <div className="col-8 col-md-2"><label className="form-label small">Room type<select className="form-select" value={f.category} onChange={set('category')}><option value="">All types</option>{['Standard', 'Deluxe', 'Suite', 'Family'].map((c) => <option key={c}>{c}</option>)}</select></label></div>
          <div className="col-12 col-md-2"><button className="btn btn-primary w-100">Search rooms</button></div>
        </div>
      </form>
      <h2 className="mt-5 mb-3">Choose your room type</h2>
      <div className="row g-3">{[['Standard', 'Comfortable essentials'], ['Deluxe', 'More space and comfort'], ['Suite', 'Lounge area and city views'], ['Family', 'Room for the whole family']].map(([c, d]) => (
        <div className="col-6 col-lg-3" key={c}><Link to={'/rooms?category=' + c} className="cat-tile" style={{ backgroundImage: `url(/images/rooms/${c.toLowerCase()}.svg)` }}><span><b>{c}</b><small>{d}</small></span></Link></div>))}</div>
      <h2 className="mt-5 mb-3">Popular rooms</h2>
      <div className="row g-3">{featured.map((r) => <div className="col-sm-6 col-lg-3" key={r._id}><RoomCard room={r} /></div>)}
        {!featured.length && <p className="text-body-secondary">No rooms yet. Run <code>npm run seed</code> in the server folder.</p>}</div>
      <h2 className="mt-5 mb-3">Built for three kinds of users</h2>
      <div className="row g-3 mb-5">
        {[['Guests', 'Search, book, pay online, cancel and review stays.'], ['Staff', 'Check guests in and out, update room status and handle service requests.'],
          ['Admins', 'Manage rooms and prices, staff, payments, refunds, reports and security.']].map(([t, d]) =>
          <div className="col-md-4" key={t}><div className="card h-100 p-3 border-start border-4" style={{ borderColor: 'var(--brass)' }}><h5>{t}</h5><p className="mb-0">{d}</p></div></div>)}
      </div>
    </div>
  </>);
}
