import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api, { msg } from '../api';
import { inr, iso, fdate, Stars, roomImage } from '../utils';

export default function RoomDetail() {
  const { id } = useParams(), [sp] = useSearchParams(), nav = useNavigate(), loc = useLocation();
  const { user } = useSelector((s) => s.auth);
  const [room, setRoom] = useState(null), [busy, setBusy] = useState(false), [pic, setPic] = useState(0);
  const [f, setF] = useState({ checkIn: sp.get('checkIn') || iso(1), checkOut: sp.get('checkOut') || iso(3), guests: +sp.get('guests') || 1, specialRequests: '' });
  useEffect(() => { api.get('/rooms/' + id).then((r) => setRoom(r.data)).catch((e) => toast.error(msg(e))); }, [id]);
  if (!room) return <div className="container py-5"><div className="spinner-border" role="status" /></div>;
  const nights = Math.max(0, Math.round((new Date(f.checkOut) - new Date(f.checkIn)) / 864e5));
  const reserve = async () => {
    if (!user) return nav('/login', { state: { from: loc.pathname + loc.search } });
    if (user.role !== 'guest') return toast.info('Sign in with a guest account to book');
    setBusy(true);
    try { const { data } = await api.post('/bookings', { roomId: room._id, ...f }); nav('/pay/' + data._id); }
    catch (e) { toast.error(msg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="container py-4"><div className="row g-4">
      <div className="col-lg-7">
        <div className="room-pic rounded" role="img" aria-label={`${room.category} room ${room.number}`} style={{ height: 320, backgroundImage: `linear-gradient(transparent 70%, rgba(0,0,0,.55)), url(${roomImage(room, pic)})` }}>Room {room.number}</div>
        {room.images?.length > 1 && <div className="d-flex gap-2 mt-2 flex-wrap">{room.images.map((_, i) => <button key={i} className={'p-0 border-0 bg-transparent ' + (i === pic ? '' : 'opacity-50')} onClick={() => setPic(i)} aria-label={`Show photo ${i + 1}`}><img src={roomImage(room, i)} alt="" width="84" height="56" className="rounded" style={{ objectFit: 'cover' }} /></button>)}</div>}
        <h2 className="mt-3">{room.category} room</h2><Stars value={room.avgRating} n={room.numReviews} />
        <p className="mt-2">{room.description}</p>
        <p><b>Sleeps</b> {room.capacity} · <b>Includes</b> {room.amenities.join(', ')}</p>
        {room.seasonalPrices?.length > 0 && <p className="small text-body-secondary">Seasonal rates: {room.seasonalPrices.map((s) => `${s.label} ${fdate(s.from)} to ${fdate(s.to)} ${inr(s.price)}`).join('; ')}</p>}
        <h4 className="mt-4">Guest reviews</h4>
        {room.reviews.length === 0 ? <p className="text-body-secondary">No reviews yet. Stay with us and be the first.</p> :
          room.reviews.map((r) => <div key={r._id} className="border-bottom py-2"><b>{r.user?.name}</b> <span className="text-warning">{'★'.repeat(r.rating)}</span><br />{r.comment}</div>)}
      </div>
      <div className="col-lg-5"><div className="card p-3 sticky-top" style={{ top: 80 }}>
        <div className="fs-4 fw-bold">{inr(room.price)} <span className="fs-6 fw-normal text-body-secondary">/ night</span></div>
        <div className="row g-2 my-1">
          <div className="col-6"><label className="form-label small">Check-in<input type="date" className="form-control" min={iso()} value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value })} /></label></div>
          <div className="col-6"><label className="form-label small">Check-out<input type="date" className="form-control" min={f.checkIn} value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></label></div>
          <div className="col-12"><label className="form-label small">Guests<input type="number" min="1" max={room.capacity} className="form-control" value={f.guests} onChange={(e) => setF({ ...f, guests: +e.target.value })} /></label></div>
          <div className="col-12"><label className="form-label small">Special requests<textarea className="form-control" rows="2" value={f.specialRequests} onChange={(e) => setF({ ...f, specialRequests: e.target.value })} /></label></div>
        </div>
        <p className="mb-2">{nights > 0 ? <>About {inr(room.price * nights)} for {nights} night{nights > 1 ? 's' : ''}. Seasonal rates and GST are added at payment.</> : 'Pick a check-out date after check-in.'}</p>
        <button className="btn btn-primary" disabled={busy || nights < 1 || room.status === 'Maintenance'} onClick={reserve}>{busy ? 'Reserving...' : user ? 'Reserve and pay' : 'Sign in to reserve'}</button>
        <small className="text-body-secondary mt-2">We hold the room for 15 minutes while you pay.</small>
      </div></div>
    </div></div>
  );
}
