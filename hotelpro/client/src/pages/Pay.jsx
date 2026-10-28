import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api, { msg } from '../api';
import { inr, fdate } from '../utils';

const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = resolve; s.onerror = () => reject(new Error('Could not load the payment window. Check your internet connection'));
  document.body.appendChild(s);
});

export default function Pay() {
  const { id } = useParams(), nav = useNavigate(), { user } = useSelector((s) => s.auth);
  const [b, setB] = useState(null), [method, setMethod] = useState('UPI'), [busy, setBusy] = useState(false), [left, setLeft] = useState(null), [cfg, setCfg] = useState(null);
  useEffect(() => { api.get('/bookings/' + id).then((r) => setB(r.data)).catch((e) => toast.error(msg(e))); api.get('/payments/config').then((r) => setCfg(r.data)).catch(() => setCfg({ mode: 'mock' })); }, [id]);
  useEffect(() => {
    if (!b) return;
    const t = setInterval(() => setLeft(Math.max(0, Math.floor((new Date(b.createdAt).getTime() + 15 * 60000 - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [b]);
  if (!b || !cfg) return <div className="container py-5"><div className="spinner-border" role="status" /></div>;
  if (b.status !== 'Pending') return <div className="container py-5"><p>This booking is {b.status.toLowerCase()}. <button className="btn btn-link p-0" onClick={() => nav('/bookings')}>View my bookings</button></p></div>;

  const done = () => { toast.success('Payment received. Booking confirmed.'); nav('/bookings'); };
  const payMock = async () => {
    setBusy(true);
    try { await api.post('/payments', { bookingId: b._id, method }); done(); } catch (e) { toast.error(msg(e)); } finally { setBusy(false); }
  };
  const payOnline = async () => {
    setBusy(true);
    try {
      const { data: o } = await api.post('/payments/razorpay/order', { bookingId: b._id });
      await loadRazorpay();
      const rz = new window.Razorpay({
        key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId, name: 'HotelPro', description: `${b.room.category} room ${b.room.number}`,
        prefill: { name: user.name, email: user.email, contact: user.phone || '' }, theme: { color: '#1F7A6E' },
        handler: async (resp) => { // payment done in the window: ask the server to verify it
          try { await api.post('/payments/razorpay/verify', { bookingId: b._id, ...resp }); done(); } catch (e) { toast.error(msg(e)); setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rz.on('payment.failed', (r) => { toast.error(r.error?.description || 'Payment failed. Please try again'); setBusy(false); });
      rz.open();
    } catch (e) { toast.error(msg(e)); setBusy(false); }
  };
  const online = cfg.mode === 'razorpay';
  return (
    <div className="container py-5" style={{ maxWidth: 520 }}>
      <h2>Confirm and pay</h2>
      <div className="card p-4 mt-3">
        <p className="mb-2"><b>{b.room.category}</b> room {b.room.number}<br /><span className="text-body-secondary">{fdate(b.checkIn)} to {fdate(b.checkOut)} · {b.nights} night(s) · {b.guests} guest(s)</span></p>
        <table className="table table-sm"><tbody>
          <tr><td>Room</td><td className="text-end">{inr(b.subtotal)}</td></tr><tr><td>GST</td><td className="text-end">{inr(b.tax)}</td></tr>
          <tr className="fw-bold"><td>Total</td><td className="text-end">{inr(b.amount)}</td></tr></tbody></table>
        {!online && <label className="form-label">Payment method<select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}><option>UPI</option><option>Credit / debit card</option><option>Net banking</option></select></label>}
        {left !== null && <p className={'small ' + (left < 120 ? 'text-danger' : 'text-body-secondary')}>Room held for {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p>}
        <button className="btn btn-primary" disabled={busy || left === 0} onClick={online ? payOnline : payMock}>{busy ? 'Processing...' : `Pay ${inr(b.amount)}`}</button>
        <p className="small text-body-secondary mt-2 mb-0">{online ? 'You will pay securely with UPI, card or net banking in the Razorpay window.' : 'Development mode uses a simulated gateway. No real money moves.'}</p>
      </div>
    </div>
  );
}
