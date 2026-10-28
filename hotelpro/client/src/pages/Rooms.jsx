import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import RoomCard from '../components/RoomCard';
import { iso } from '../utils';

export default function Rooms() {
  const [sp, setSp] = useSearchParams();
  const [rooms, setRooms] = useState(null);
  const f = { checkIn: sp.get('checkIn') || iso(1), checkOut: sp.get('checkOut') || iso(3), guests: sp.get('guests') || 1, category: sp.get('category') || '', maxPrice: sp.get('maxPrice') || '' };
  useEffect(() => { setRooms(null); api.get('/rooms', { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }).then((r) => setRooms(r.data)); }, [sp]); // eslint-disable-line
  const set = (k) => (e) => { const n = new URLSearchParams(sp); const v = e.target.value; v ? n.set(k, v) : n.delete(k); if (!n.get('checkIn')) n.set('checkIn', f.checkIn); if (!n.get('checkOut')) n.set('checkOut', f.checkOut); setSp(n, { replace: true }); };
  const qs = `?checkIn=${f.checkIn}&checkOut=${f.checkOut}&guests=${f.guests}`;
  return (
    <div className="container py-4">
      <h2>Find a room</h2>
      <div className="card p-3 my-3"><div className="row g-3">
        <div className="col-6 col-md-3"><label className="form-label small">Check-in<input type="date" className="form-control" min={iso()} value={f.checkIn} onChange={set('checkIn')} /></label></div>
        <div className="col-6 col-md-3"><label className="form-label small">Check-out<input type="date" className="form-control" min={f.checkIn} value={f.checkOut} onChange={set('checkOut')} /></label></div>
        <div className="col-4 col-md-2"><label className="form-label small">Guests<input type="number" min="1" max="6" className="form-control" value={f.guests} onChange={set('guests')} /></label></div>
        <div className="col-4 col-md-2"><label className="form-label small">Type<select className="form-select" value={f.category} onChange={set('category')}><option value="">All</option>{['Standard', 'Deluxe', 'Suite', 'Family'].map((c) => <option key={c}>{c}</option>)}</select></label></div>
        <div className="col-4 col-md-2"><label className="form-label small">Max price<input type="number" step="500" className="form-control" value={f.maxPrice} onChange={set('maxPrice')} placeholder="Any" /></label></div>
      </div></div>
      {rooms === null ? <div className="spinner-border" role="status" /> : rooms.length === 0 ? <p>No rooms match. Try fewer guests, a higher price limit, or another type.</p> :
        <div className="row g-3">{rooms.map((r) => <div className="col-sm-6 col-lg-4 col-xl-3" key={r._id}><RoomCard room={r} qs={qs} /></div>)}</div>}
    </div>
  );
}
