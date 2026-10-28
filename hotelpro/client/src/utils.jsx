import { ORIGIN } from './api';
// Uploaded photo if the admin added one, otherwise the drawn picture for the room type
export const roomImage = (room, i = 0) => room.images?.[i] ? ORIGIN + room.images[i] : `/images/rooms/${(room.category || 'standard').toLowerCase()}.svg`;
export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
export const fdate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const iso = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }; // local date
export const GRADIENTS = { Standard: ['#2F6F8F', '#12263A'], Deluxe: ['#1F7A6E', '#0E3B37'], Suite: ['#8A6A1E', '#3B2A07'], Family: ['#6B4C8A', '#2A1B3B'] };
const COLORS = { Available: 'success', Occupied: 'danger', Cleaning: 'warning', Maintenance: 'secondary', Pending: 'warning', Confirmed: 'primary',
  'Checked-in': 'success', 'Checked-out': 'secondary', Cancelled: 'danger', Paid: 'success', Unpaid: 'warning', 'Refund-requested': 'warning',
  Refunded: 'info', Open: 'warning', 'In progress': 'primary', Done: 'success', Success: 'success' };
export const Badge = ({ s }) => <span className={`badge text-bg-${COLORS[s] || 'secondary'}`}>{s}</span>;
export const Stars = ({ value, n }) => value ? <span className="text-warning">★ {value}<span className="text-body-secondary small"> ({n})</span></span> : <span className="small text-body-secondary">No reviews yet</span>;
