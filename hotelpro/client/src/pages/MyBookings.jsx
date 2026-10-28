import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { msg } from '../api';
import Modal from '../components/Modal';
import { inr, fdate, Badge } from '../utils';

export default function MyBookings() {
  const [list, setList] = useState(null), [modal, setModal] = useState(null), [form, setForm] = useState({});
  const load = () => api.get('/bookings/mine').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const run = (p, ok) => p.then(() => { toast.success(ok); setModal(null); load(); }).catch((e) => toast.error(msg(e)));
  const openInvoice = async (b) => setModal({ type: 'invoice', data: (await api.get(`/bookings/${b._id}/invoice`)).data });
  if (!list) return <div className="container py-5"><div className="spinner-border" role="status" /></div>;
  return (
    <div className="container py-4">
      <h2>My bookings</h2>
      {list.length === 0 ? <p className="mt-3">No bookings yet. <Link to="/rooms">Find a room</Link></p> :
        <div className="card mt-3"><div className="table-wrap"><table className="table align-middle mb-0">
          <thead><tr><th>Room</th><th>Dates</th><th>Total</th><th>Status</th><th>Payment</th><th /></tr></thead>
          <tbody>{list.map((b) => (
            <tr key={b._id}>
              <td>{b.room?.category} {b.room?.number}</td><td>{fdate(b.checkIn)} to {fdate(b.checkOut)}</td><td>{inr(b.amount)}</td>
              <td><Badge s={b.status} /></td><td><Badge s={b.paymentStatus} /></td>
              <td className="text-end text-nowrap">
                {b.status === 'Pending' && <Link className="btn btn-sm btn-primary me-1" to={'/pay/' + b._id}>Pay now</Link>}
                {['Pending', 'Confirmed'].includes(b.status) && <button className="btn btn-sm btn-outline-danger me-1" onClick={() => window.confirm('Cancel this booking?') && run(api.put(`/bookings/${b._id}/cancel`), 'Booking cancelled')}>Cancel</button>}
                {b.paymentStatus !== 'Unpaid' && <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => openInvoice(b)}>Invoice</button>}
                {b.status === 'Checked-in' && <button className="btn btn-sm btn-outline-primary me-1" onClick={() => { setForm({ type: 'Housekeeping', description: '' }); setModal({ type: 'service' }); }}>Request service</button>}
                {b.status === 'Checked-out' && !b.reviewed && <button className="btn btn-sm btn-accent" onClick={() => { setForm({ bookingId: b._id, rating: 5, comment: '' }); setModal({ type: 'review' }); }}>Rate stay</button>}
              </td>
            </tr>))}</tbody></table></div></div>}
      {modal?.type === 'invoice' && <Modal title={'Invoice ' + modal.data.invoiceNo} onClose={() => setModal(null)}>
        <p><b>{modal.data.hotel?.name}</b><br />{modal.data.hotel?.address}, {modal.data.hotel?.city}</p>
        <p>Guest: {modal.data.booking.guest.name}<br />Room: {modal.data.booking.room.category} {modal.data.booking.room.number}<br />Stay: {fdate(modal.data.booking.checkIn)} to {fdate(modal.data.booking.checkOut)} ({modal.data.booking.nights} nights)</p>
        <table className="table table-sm"><tbody><tr><td>Room charges</td><td className="text-end">{inr(modal.data.booking.subtotal)}</td></tr><tr><td>GST</td><td className="text-end">{inr(modal.data.booking.tax)}</td></tr><tr className="fw-bold"><td>Total</td><td className="text-end">{inr(modal.data.booking.amount)}</td></tr></tbody></table>
        <p>Payment: <Badge s={modal.data.booking.paymentStatus} /></p>
        <button className="btn btn-primary no-print" onClick={() => window.print()}>Print or save as PDF</button>
      </Modal>}
      {modal?.type === 'review' && <Modal title="Rate your stay" onClose={() => setModal(null)}>
        <label className="form-label">Rating<select className="form-select" value={form.rating} onChange={(e) => setForm({ ...form, rating: +e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}</select></label>
        <label className="form-label">Comment<textarea className="form-control" rows="3" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></label>
        <button className="btn btn-primary" onClick={() => run(api.post('/reviews', form), 'Thanks for your review')}>Submit review</button>
      </Modal>}
      {modal?.type === 'service' && <Modal title="Request a service" onClose={() => setModal(null)}>
        <label className="form-label">Type<select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['Housekeeping', 'Maintenance', 'Room service', 'Support'].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="form-label">Details<textarea className="form-control" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button className="btn btn-primary" onClick={() => run(api.post('/services', form), 'Request sent to the front desk')}>Send request</button>
      </Modal>}
    </div>
  );
}
