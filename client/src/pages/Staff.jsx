import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { msg } from '../api';
import Modal from '../components/Modal';
import { inr, fdate, iso, Badge } from '../utils';

const act = (p, ok, reload) => p.then(() => { toast.success(ok); reload(); }).catch((e) => toast.error(msg(e)));

function Reservations() {
  const [list, setList] = useState(null), [flt, setFlt] = useState('Confirmed,Checked-in'), [inv, setInv] = useState(null);
  const load = () => api.get('/bookings', { params: { status: flt } }).then((r) => setList(r.data));
  useEffect(() => { setList(null); load(); }, [flt]); // eslint-disable-line
  const invoice = async (b) => setInv((await api.get(`/bookings/${b._id}/invoice`)).data);
  return (<>
    <select className="form-select w-auto mb-3" value={flt} onChange={(e) => setFlt(e.target.value)} aria-label="Filter reservations">
      <option value="Confirmed,Checked-in">Active (arriving and in-house)</option><option value="Pending">Awaiting payment</option>
      <option value="Checked-out">Checked out</option><option value="Cancelled">Cancelled</option></select>
    {!list ? <div className="spinner-border" role="status" /> : <div className="card"><div className="table-wrap"><table className="table align-middle mb-0">
      <thead><tr><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Status</th><th /></tr></thead>
      <tbody>{list.map((b) => (<tr key={b._id}>
        <td>{b.guest?.name}{b.source === 'front-desk' && <span className="badge text-bg-info ms-1">Walk-in</span>}<div className="small text-body-secondary">{b.guest?.phone}</div></td><td>{b.room?.number}</td><td>{fdate(b.checkIn)} to {fdate(b.checkOut)}</td><td>{inr(b.amount)}</td><td><Badge s={b.status} /></td>
        <td className="text-end text-nowrap">
          {b.status === 'Confirmed' && <button className="btn btn-sm btn-primary me-1" onClick={() => act(api.put(`/bookings/${b._id}/checkin`), 'Guest checked in', load)}>Check in</button>}
          {b.status === 'Checked-in' && <button className="btn btn-sm btn-outline-primary me-1" onClick={() => act(api.put(`/bookings/${b._id}/checkout`), 'Checked out. Invoice emailed.', load)}>Check out</button>}
          {b.paymentStatus !== 'Unpaid' && <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => invoice(b)}>Invoice</button>}
          {b.status === 'Confirmed' && <button className="btn btn-sm btn-outline-danger" onClick={() => window.confirm('Cancel this booking? A paid booking becomes a refund request for the admin.') && act(api.put(`/bookings/${b._id}/cancel`), 'Booking cancelled', load)}>Cancel</button>}
        </td></tr>))}
        {!list.length && <tr><td colSpan="6" className="text-center py-4">Nothing here right now.</td></tr>}</tbody></table></div></div>}
    {inv && <Modal title={'Invoice ' + inv.invoiceNo} onClose={() => setInv(null)}>
      <p><b>{inv.hotel?.name}</b><br />{inv.hotel?.address}, {inv.hotel?.city}</p>
      <p>Guest: {inv.booking.guest.name}<br />Room: {inv.booking.room.category} {inv.booking.room.number}<br />Stay: {fdate(inv.booking.checkIn)} to {fdate(inv.booking.checkOut)} ({inv.booking.nights} nights)</p>
      <table className="table table-sm"><tbody><tr><td>Room charges</td><td className="text-end">{inr(inv.booking.subtotal)}</td></tr><tr><td>GST</td><td className="text-end">{inr(inv.booking.tax)}</td></tr><tr className="fw-bold"><td>Total</td><td className="text-end">{inr(inv.booking.amount)}</td></tr></tbody></table>
      <p>Payment: <Badge s={inv.booking.paymentStatus} /></p>
      <button className="btn btn-primary no-print" onClick={() => window.print()}>Print or save as PDF</button>
    </Modal>}
  </>);
}

function NewBooking({ done }) {
  const [g, setG] = useState({ id: '', name: '', phone: '', email: '' }), [q, setQ] = useState(''), [found, setFound] = useState([]);
  const [d, setD] = useState({ checkIn: iso(0), checkOut: iso(1), guests: 1, category: '' });
  const [rooms, setRooms] = useState(null), [room, setRoom] = useState(null), [qt, setQt] = useState(null);
  const [method, setMethod] = useState('Cash'), [now, setNow] = useState(true), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) return setFound([]);
    const t = setTimeout(() => api.get('/bookings/guest-search', { params: { q } }).then((r) => setFound(r.data)).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [q]);
  const realEmail = (e) => (e && !e.endsWith('@hotelpro.local') ? e : '');
  const pick = (u) => { setG({ id: u._id, name: u.name, phone: u.phone || '', email: realEmail(u.email) }); setQ(''); setFound([]); };
  const setDate = (k) => (e) => { setD({ ...d, [k]: e.target.value }); setRooms(null); setRoom(null); setQt(null); };
  const find = async (e) => {
    e.preventDefault(); setRoom(null); setQt(null);
    try { const r = await api.get('/rooms', { params: { ...d, category: d.category || undefined } }); setRooms(r.data.filter((x) => x.available)); }
    catch (x) { toast.error(msg(x)); }
  };
  const choose = async (r) => {
    setRoom(r); setQt(null);
    try { setQt((await api.get('/bookings/quote', { params: { roomId: r._id, checkIn: d.checkIn, checkOut: d.checkOut } })).data); } catch (x) { toast.error(msg(x)); }
  };
  const startsToday = d.checkIn === iso(0);
  const ready = (g.id || (g.name.trim() && g.phone.trim())) && room;
  const submit = async () => {
    setBusy(true);
    try { await api.post('/bookings/walk-in', { guest: g, roomId: room._id, ...d, method, checkInNow: startsToday && now }); toast.success('Booking created'); done(); }
    catch (x) { toast.error(msg(x)); } finally { setBusy(false); }
  };
  return (<div className="row g-3">
    <div className="col-lg-5"><div className="card p-3 h-100">
      <h5>1. Guest</h5>
      {g.id ? <div className="alert alert-success py-2 d-flex justify-content-between align-items-center mb-2"><span>Existing guest: <b>{g.name}</b> {g.phone}</span>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setG({ id: '', name: '', phone: '', email: '' })}>Change</button></div> : <>
        <label className="form-label small">Find a returning guest<input className="form-control" placeholder="Name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        {found.length > 0 && <div className="list-group mb-2">{found.map((u) => <button key={u._id} type="button" className="list-group-item list-group-item-action" onClick={() => pick(u)}>{u.name} <span className="text-body-secondary small">{u.phone} {realEmail(u.email)}</span></button>)}</div>}
        <p className="small text-body-secondary mb-2">Or enter a new guest:</p>
        <label className="form-label small">Full name<input className="form-control" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} /></label>
        <label className="form-label small">Phone<input className="form-control" value={g.phone} onChange={(e) => setG({ ...g, phone: e.target.value })} /></label>
        <label className="form-label small">Email (optional, for confirmation and invoice)<input type="email" className="form-control" value={g.email} onChange={(e) => setG({ ...g, email: e.target.value })} /></label></>}
    </div></div>
    <div className="col-lg-7"><div className="card p-3 h-100">
      <h5>2. Stay and room</h5>
      <form onSubmit={find}><div className="row g-2 align-items-end">
        <div className="col-6 col-md-3"><label className="form-label small">Check-in<input type="date" className="form-control" min={iso(-1)} value={d.checkIn} onChange={setDate('checkIn')} required /></label></div>
        <div className="col-6 col-md-3"><label className="form-label small">Check-out<input type="date" className="form-control" min={d.checkIn} value={d.checkOut} onChange={setDate('checkOut')} required /></label></div>
        <div className="col-4 col-md-2"><label className="form-label small">Guests<input type="number" min="1" max="6" className="form-control" value={d.guests} onChange={setDate('guests')} /></label></div>
        <div className="col-8 col-md-4"><label className="form-label small">Type<select className="form-select" value={d.category} onChange={setDate('category')}><option value="">Any</option>{['Standard', 'Deluxe', 'Suite', 'Family'].map((c) => <option key={c}>{c}</option>)}</select></label></div>
        <div className="col-12"><button className="btn btn-primary">Find available rooms</button></div></div></form>
      {rooms && (rooms.length === 0 ? <p className="mt-3 mb-0">No rooms are free for those dates. Try other dates or another type.</p> :
        <div className="d-flex flex-wrap gap-2 mt-3">{rooms.map((r) => <button key={r._id} type="button" className={'btn ' + (room?._id === r._id ? 'btn-primary' : 'btn-outline-secondary')} onClick={() => choose(r)}>
          {r.number} · {r.category} · {inr(r.price)}{r.status !== 'Available' && <span className="small"> ({r.status})</span>}</button>)}</div>)}
    </div></div>
    {room && <div className="col-12"><div className="card p-3">
      <h5>3. Payment at the desk</h5>
      <div className="row g-3 align-items-end">
        <div className="col-md-4">{qt ? <table className="table table-sm mb-0"><tbody><tr><td>{qt.nights} night(s)</td><td className="text-end">{inr(qt.subtotal)}</td></tr><tr><td>GST</td><td className="text-end">{inr(qt.tax)}</td></tr><tr className="fw-bold"><td>Total to collect</td><td className="text-end">{inr(qt.total)}</td></tr></tbody></table> : <div className="spinner-border spinner-border-sm" role="status" />}</div>
        <div className="col-md-3"><label className="form-label small">Payment received by<select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}><option>Cash</option><option>Card</option><option>UPI</option></select></label></div>
        <div className="col-md-3"><div className="form-check"><input id="cin" type="checkbox" className="form-check-input" disabled={!startsToday} checked={startsToday && now} onChange={(e) => setNow(e.target.checked)} /><label htmlFor="cin" className="form-check-label">Check in now</label></div>
          {!startsToday && <div className="small text-body-secondary">Only for stays starting today</div>}</div>
        <div className="col-md-2"><button className="btn btn-primary w-100" disabled={busy || !ready || !qt} onClick={submit}>{busy ? 'Saving...' : 'Confirm booking'}</button></div>
      </div>
      <p className="small text-body-secondary mt-2 mb-0">Confirming records that you have received the payment.</p>
    </div></div>}
  </div>);
}

function RoomStatus() {
  const [rooms, setRooms] = useState(null);
  const load = () => api.get('/rooms').then((r) => setRooms(r.data));
  useEffect(() => { load(); }, []);
  if (!rooms) return <div className="spinner-border" role="status" />;
  return <div className="card"><div className="table-wrap"><table className="table align-middle mb-0"><thead><tr><th>Room</th><th>Type</th><th>Rate</th><th>Status</th><th>Update</th></tr></thead>
    <tbody>{rooms.map((r) => (<tr key={r._id}><td>{r.number}</td><td>{r.category}</td><td>{inr(r.price)}</td><td><Badge s={r.status} /></td>
      <td><select className="form-select form-select-sm w-auto" value={r.status} aria-label={'Status for room ' + r.number}
        onChange={(e) => act(api.put(`/rooms/${r._id}/status`, { status: e.target.value }), 'Room status updated', load)}>
        {['Available', 'Occupied', 'Cleaning', 'Maintenance'].map((s) => <option key={s}>{s}</option>)}</select></td></tr>))}</tbody></table></div></div>;
}

function Services() {
  const [list, setList] = useState(null), [f, setF] = useState({ type: 'Housekeeping', description: '', roomId: '' }), [rooms, setRooms] = useState([]);
  const load = () => api.get('/services').then((r) => setList(r.data));
  useEffect(() => { load(); api.get('/rooms').then((r) => setRooms(r.data)); }, []);
  const add = (e) => { e.preventDefault(); act(api.post('/services', f), 'Task added', () => { setF({ ...f, description: '' }); load(); }); };
  return (<>
    <form className="card p-3 mb-3" onSubmit={add}><div className="row g-2 align-items-end">
      <div className="col-md-2"><label className="form-label small">Type<select className="form-select" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{['Housekeeping', 'Maintenance', 'Room service', 'Support'].map((t) => <option key={t}>{t}</option>)}</select></label></div>
      <div className="col-md-2"><label className="form-label small">Room<select className="form-select" value={f.roomId} onChange={(e) => setF({ ...f, roomId: e.target.value })}><option value="">None</option>{rooms.map((r) => <option key={r._id} value={r._id}>{r.number}</option>)}</select></label></div>
      <div className="col-md-6"><label className="form-label small">Details<input className="form-control" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required /></label></div>
      <div className="col-md-2"><button className="btn btn-primary w-100">Add task</button></div></div></form>
    {!list ? <div className="spinner-border" role="status" /> : <div className="card"><div className="table-wrap"><table className="table align-middle mb-0"><thead><tr><th>Request</th><th>Room</th><th>From</th><th>Assigned</th><th>Status</th><th /></tr></thead>
      <tbody>{list.map((s) => (<tr key={s._id}><td><b>{s.type}</b><div className="small">{s.description}</div></td><td>{s.room?.number || '-'}</td><td>{s.requestedBy?.name}</td><td>{s.assignedTo?.name || '-'}</td><td><Badge s={s.status} /></td>
        <td className="text-end text-nowrap">
          {s.status === 'Open' && <button className="btn btn-sm btn-outline-primary me-1" onClick={() => act(api.put('/services/' + s._id, { status: 'In progress', assignedTo: JSON.parse(localStorage.getItem('user'))._id }), 'Task assigned to you', load)}>Take it</button>}
          {s.status !== 'Done' && <button className="btn btn-sm btn-primary" onClick={() => act(api.put('/services/' + s._id, { status: 'Done' }), 'Marked done', load)}>Mark done</button>}
        </td></tr>))}
        {!list.length && <tr><td colSpan="6" className="text-center py-4">No service requests.</td></tr>}</tbody></table></div></div>}
  </>);
}

export default function Staff() {
  const [tab, setTab] = useState('res');
  const tabs = [['res', 'Reservations'], ['new', 'New walk-in booking'], ['rooms', 'Room status'], ['svc', 'Housekeeping and requests']];
  return (
    <div className="container py-4">
      <h2>Front desk</h2>
      <ul className="nav nav-tabs my-3">{tabs.map(([k, l]) => <li className="nav-item" key={k}><button className={'nav-link ' + (tab === k ? 'active' : '')} onClick={() => setTab(k)}>{l}</button></li>)}</ul>
      {tab === 'res' && <Reservations />}{tab === 'new' && <NewBooking done={() => setTab('res')} />}{tab === 'rooms' && <RoomStatus />}{tab === 'svc' && <Services />}
    </div>
  );
}
