import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api, { msg } from '../api';
import Modal from '../components/Modal';
import { inr, fdate, iso, Badge } from '../utils';

const act = (p, ok, reload) => p.then(() => { toast.success(ok); reload && reload(); }).catch((e) => toast.error(msg(e)));
const Spin = () => <div className="spinner-border" role="status" />;

function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/admin/stats').then((r) => setS(r.data)); }, []);
  if (!s) return <Spin />;
  const cards = [['Occupancy', s.occupancy + '%'], ['Revenue', inr(s.revenue)], ['Rooms', `${s.occupied} of ${s.rooms} occupied`], ['Guests', s.users.guest || 0], ['Staff', s.users.staff || 0]];
  return (<>
    <div className="row g-3 mb-3">{cards.map(([l, v]) => <div className="col-6 col-lg" key={l}><div className="card p-3 stat"><b>{v}</b>{l}</div></div>)}</div>
    <div className="row g-3">
      <div className="col-lg-7"><div className="card p-3"><h5>Revenue by month</h5><div style={{ height: 260 }}><ResponsiveContainer><BarChart data={s.monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(v) => inr(v)} /><Bar dataKey="revenue" fill="#1F7A6E" /></BarChart></ResponsiveContainer></div></div></div>
      <div className="col-lg-5"><div className="card p-3"><h5>Revenue by room type</h5><div style={{ height: 260 }}><ResponsiveContainer><BarChart data={s.byCategory} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="category" width={70} /><Tooltip formatter={(v) => inr(v)} /><Bar dataKey="revenue" fill="#B8860B" /></BarChart></ResponsiveContainer></div></div></div>
    </div>
    <div className="card p-3 mt-3"><h5>Bookings by status</h5><div className="d-flex gap-3 flex-wrap">{Object.entries(s.bookingsByStatus).map(([k, v]) => <span key={k}><Badge s={k} /> {v}</span>)}{!Object.keys(s.bookingsByStatus).length && <span>No bookings yet.</span>}</div></div>
  </>);
}

const blank = { number: '', category: 'Standard', price: 2500, capacity: 2, amenities: 'Wi-Fi, AC, TV', description: '', status: 'Available', seasonalPrices: [] };
function RoomsAdmin() {
  const [rooms, setRooms] = useState(null), [edit, setEdit] = useState(null);
  const load = () => api.get('/rooms').then((r) => setRooms(r.data));
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  const save = (e) => {
    e.preventDefault();
    const body = { ...edit, price: +edit.price, capacity: +edit.capacity, amenities: typeof edit.amenities === 'string' ? edit.amenities.split(',').map((s) => s.trim()).filter(Boolean) : edit.amenities,
      seasonalPrices: edit.seasonalPrices.map((p) => ({ ...p, price: +p.price })) };
    act(edit._id ? api.put('/rooms/' + edit._id, body) : api.post('/rooms', body), 'Room saved', () => { setEdit(null); load(); });
  };
  const upload = (e) => { const fd = new FormData(); [...e.target.files].forEach((f) => fd.append('images', f)); act(api.post(`/rooms/${edit._id}/images`, fd), 'Images uploaded', load); };
  const sp = (i, k) => (e) => { const a = [...edit.seasonalPrices]; a[i] = { ...a[i], [k]: e.target.value }; setEdit({ ...edit, seasonalPrices: a }); };
  if (!rooms) return <Spin />;
  return (<>
    <button className="btn btn-primary mb-3" onClick={() => setEdit({ ...blank })}>Add room</button>
    <div className="card"><div className="table-wrap"><table className="table align-middle mb-0"><thead><tr><th>Room</th><th>Type</th><th>Rate</th><th>Sleeps</th><th>Status</th><th /></tr></thead>
      <tbody>{rooms.map((r) => (<tr key={r._id}><td>{r.number}</td><td>{r.category}</td><td>{inr(r.price)}{r.seasonalPrices?.length > 0 && <span className="badge text-bg-info ms-1">seasonal</span>}</td><td>{r.capacity}</td><td><Badge s={r.status} /></td>
        <td className="text-end text-nowrap"><button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setEdit({ ...r, amenities: r.amenities.join(', '), seasonalPrices: r.seasonalPrices.map((p) => ({ ...p, from: p.from?.slice(0, 10), to: p.to?.slice(0, 10) })) })}>Edit</button>
          <button className="btn btn-sm btn-outline-danger" onClick={() => window.confirm(`Delete room ${r.number}?`) && act(api.delete('/rooms/' + r._id), 'Room deleted', load)}>Delete</button></td></tr>))}</tbody></table></div></div>
    {edit && <Modal wide title={edit._id ? 'Edit room ' + edit.number : 'Add room'} onClose={() => setEdit(null)}>
      <form onSubmit={save}><div className="row g-2">
        <div className="col-4"><label className="form-label small">Number<input className="form-control" value={edit.number} onChange={set('number')} required /></label></div>
        <div className="col-4"><label className="form-label small">Type<select className="form-select" value={edit.category} onChange={set('category')}>{['Standard', 'Deluxe', 'Suite', 'Family'].map((c) => <option key={c}>{c}</option>)}</select></label></div>
        <div className="col-4"><label className="form-label small">Status<select className="form-select" value={edit.status} onChange={set('status')}>{['Available', 'Occupied', 'Cleaning', 'Maintenance'].map((c) => <option key={c}>{c}</option>)}</select></label></div>
        <div className="col-6"><label className="form-label small">Base price per night<input type="number" min="0" className="form-control" value={edit.price} onChange={set('price')} required /></label></div>
        <div className="col-6"><label className="form-label small">Capacity<input type="number" min="1" className="form-control" value={edit.capacity} onChange={set('capacity')} /></label></div>
        <div className="col-12"><label className="form-label small">Amenities (comma separated)<input className="form-control" value={edit.amenities} onChange={set('amenities')} /></label></div>
        <div className="col-12"><label className="form-label small">Description<textarea className="form-control" rows="2" value={edit.description || ''} onChange={set('description')} /></label></div>
        <div className="col-12"><b className="small">Seasonal prices</b>
          {edit.seasonalPrices.map((p, i) => (<div className="row g-2 mt-1" key={i}>
            <div className="col-3"><input className="form-control form-control-sm" placeholder="Label" aria-label="Label" value={p.label || ''} onChange={sp(i, 'label')} /></div>
            <div className="col-3"><input type="date" className="form-control form-control-sm" aria-label="From" value={p.from || ''} onChange={sp(i, 'from')} required /></div>
            <div className="col-3"><input type="date" className="form-control form-control-sm" aria-label="To" value={p.to || ''} onChange={sp(i, 'to')} required /></div>
            <div className="col-2"><input type="number" className="form-control form-control-sm" aria-label="Price" value={p.price || ''} onChange={sp(i, 'price')} required /></div>
            <div className="col-1"><button type="button" className="btn btn-sm btn-outline-danger" aria-label="Remove" onClick={() => setEdit({ ...edit, seasonalPrices: edit.seasonalPrices.filter((_, j) => j !== i) })}>×</button></div></div>))}
          <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={() => setEdit({ ...edit, seasonalPrices: [...edit.seasonalPrices, { label: '', from: iso(), to: iso(7), price: edit.price }] })}>Add season</button></div>
        {edit._id && <div className="col-12"><label className="form-label small">Add photos<input type="file" accept="image/*" multiple className="form-control" onChange={upload} /></label></div>}
      </div><button className="btn btn-primary mt-3">Save room</button></form></Modal>}
  </>);
}

function Bookings() {
  const [list, setList] = useState(null), [pays, setPays] = useState([]), [mod, setMod] = useState(null);
  const load = () => { api.get('/bookings').then((r) => setList([...r.data].sort((a, b) => (b.paymentStatus === 'Refund-requested') - (a.paymentStatus === 'Refund-requested')))); api.get('/payments').then((r) => setPays(r.data)); };
  useEffect(() => { load(); }, []);
  if (!list) return <Spin />;
  return (<>
    <h5>Bookings</h5>
    <div className="card mb-4"><div className="table-wrap"><table className="table align-middle mb-0"><thead><tr><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Status</th><th>Payment</th><th /></tr></thead>
      <tbody>{list.map((b) => (<tr key={b._id}><td>{b.guest?.name}</td><td>{b.room?.number}</td><td>{fdate(b.checkIn)} to {fdate(b.checkOut)}</td><td>{inr(b.amount)}</td><td><Badge s={b.status} /></td><td><Badge s={b.paymentStatus} /></td>
        <td className="text-end text-nowrap">
          {b.paymentStatus === 'Refund-requested' && <button className="btn btn-sm btn-primary me-1" onClick={() => api.put(`/bookings/${b._id}/refund`).then((r) => { toast.success(r.data.message, { autoClose: 9000 }); load(); }).catch((e) => toast.error(msg(e), { autoClose: 12000 }))}>Approve refund</button>}
          {['Pending', 'Confirmed'].includes(b.status) && <><button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setMod({ id: b._id, checkIn: b.checkIn.slice(0, 10), checkOut: b.checkOut.slice(0, 10) })}>Change dates</button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => window.confirm('Cancel this booking?') && act(api.put(`/bookings/${b._id}/cancel`), 'Booking cancelled', load)}>Cancel</button></>}
        </td></tr>))}</tbody></table></div></div>
    <h5>Payments</h5>
    <div className="card"><div className="table-wrap"><table className="table mb-0"><thead><tr><th>Date</th><th>Guest</th><th>Room</th><th>Method</th><th>Transaction</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>{pays.map((p) => (<tr key={p._id}><td>{fdate(p.createdAt)}</td><td>{p.user?.name}</td><td>{p.booking?.room?.number}</td><td>{p.method}</td><td className="small">{p.transactionId}</td><td>{inr(p.amount)}</td><td><Badge s={p.status} />{p.refundId && <div className="small text-body-secondary">{p.refundId}</div>}</td></tr>))}
        {!pays.length && <tr><td colSpan="7" className="text-center py-3">No payments yet.</td></tr>}</tbody></table></div></div>
    {mod && <Modal title="Change booking dates" onClose={() => setMod(null)}>
      <label className="form-label">Check-in<input type="date" className="form-control" value={mod.checkIn} onChange={(e) => setMod({ ...mod, checkIn: e.target.value })} /></label>
      <label className="form-label">Check-out<input type="date" className="form-control" value={mod.checkOut} onChange={(e) => setMod({ ...mod, checkOut: e.target.value })} /></label>
      <button className="btn btn-primary" onClick={() => act(api.put('/bookings/' + mod.id, mod), 'Booking updated', () => { setMod(null); load(); })}>Save dates</button></Modal>}
  </>);
}

function Users() {
  const [list, setList] = useState(null), [f, setF] = useState(null);
  const load = () => api.get('/admin/users').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const me = JSON.parse(localStorage.getItem('user'))._id;
  if (!list) return <Spin />;
  return (<>
    <button className="btn btn-primary mb-3" onClick={() => setF({ name: '', email: '', password: '', phone: '' })}>Add staff member</button>
    <div className="card"><div className="table-wrap"><table className="table align-middle mb-0"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th></tr></thead>
      <tbody>{list.map((u) => (<tr key={u._id}><td>{u.name}</td><td>{u.email}</td>
        <td><select className="form-select form-select-sm w-auto" disabled={u._id === me} value={u.role} aria-label={'Role for ' + u.name} onChange={(e) => act(api.put('/admin/users/' + u._id, { role: e.target.value }), 'Role updated', load)}>{['guest', 'staff', 'admin'].map((r) => <option key={r}>{r}</option>)}</select></td>
        <td><div className="form-check form-switch"><input className="form-check-input" type="checkbox" role="switch" disabled={u._id === me} checked={u.isActive} aria-label={'Active: ' + u.name} onChange={(e) => act(api.put('/admin/users/' + u._id, { isActive: e.target.checked }), e.target.checked ? 'Account enabled' : 'Account disabled', load)} /></div></td></tr>))}</tbody></table></div></div>
    {f && <Modal title="New staff member" onClose={() => setF(null)}><form onSubmit={(e) => { e.preventDefault(); act(api.post('/admin/staff', f), 'Staff account created', () => { setF(null); load(); }); }}>
      {['name', 'email', 'phone', 'password'].map((k) => <label className="form-label text-capitalize" key={k}>{k}<input className="form-control" type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'} required={k !== 'phone'} minLength={k === 'password' ? 6 : undefined} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>)}
      <button className="btn btn-primary">Create account</button></form></Modal>}
  </>);
}

function Security() {
  const [logs, setLogs] = useState(null), [h, setH] = useState(null);
  useEffect(() => { api.get('/admin/logs').then((r) => setLogs(r.data)); api.get('/hotel').then((r) => setH(r.data)); }, []);
  if (!logs || !h) return <Spin />;
  const set = (k) => (e) => setH({ ...h, [k]: e.target.value });
  return (<>
    <h5>Hotel settings</h5>
    <form className="card p-3 mb-4" onSubmit={(e) => { e.preventDefault(); act(api.put('/hotel', { ...h, taxRate: +h.taxRate }), 'Settings saved'); }}><div className="row g-2">
      {[['name', 'Hotel name'], ['address', 'Address'], ['city', 'City'], ['phone', 'Phone'], ['email', 'Email']].map(([k, l]) => <div className="col-md-4" key={k}><label className="form-label small">{l}<input className="form-control" value={h[k] || ''} onChange={set(k)} /></label></div>)}
      <div className="col-md-4"><label className="form-label small">GST rate (0.12 = 12%)<input type="number" step="0.01" min="0" max="1" className="form-control" value={h.taxRate ?? 0.12} onChange={set('taxRate')} /></label></div>
      <div className="col-12"><button className="btn btn-primary">Save settings</button></div></div></form>
    <h5>Security and admin log</h5>
    <div className="card"><div className="table-wrap"><table className="table mb-0"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
      <tbody>{logs.map((l) => <tr key={l._id}><td>{new Date(l.createdAt).toLocaleString('en-IN')}</td><td>{l.user?.name}</td><td>{l.action}</td><td>{l.details}</td></tr>)}
        {!logs.length && <tr><td colSpan="4" className="text-center py-3">No admin actions logged yet.</td></tr>}</tbody></table></div></div>
  </>);
}

export default function Admin() {
  const [tab, setTab] = useState('ov');
  const [pending, setPending] = useState(0);
  useEffect(() => { api.get('/admin/stats').then((r) => setPending(r.data.refundsPending || 0)).catch(() => {}); }, [tab]);
  const tabs = [['ov', 'Overview'], ['rooms', 'Rooms and pricing'], ['bk', 'Bookings and payments'], ['us', 'Users and staff'], ['sec', 'Settings and logs']];
  const View = { ov: Overview, rooms: RoomsAdmin, bk: Bookings, us: Users, sec: Security }[tab];
  return (
    <div className="container py-4">
      <h2>Admin</h2>
      <ul className="nav nav-tabs my-3 flex-nowrap overflow-auto">{tabs.map(([k, l]) => <li className="nav-item" key={k}><button className={'nav-link text-nowrap ' + (tab === k ? 'active' : '')} onClick={() => setTab(k)}>{l}{k === 'bk' && pending > 0 && tab !== 'bk' && <span className="badge text-bg-danger ms-1">{pending}</span>}</button></li>)}</ul>
      {pending > 0 && tab !== 'bk' && <div className="alert alert-warning d-flex justify-content-between align-items-center" role="alert"><span>{pending} refund request{pending > 1 ? 's are' : ' is'} waiting for your approval.</span><button className="btn btn-sm btn-primary" onClick={() => setTab('bk')}>Review refunds</button></div>}
      <View />
    </div>
  );
}
