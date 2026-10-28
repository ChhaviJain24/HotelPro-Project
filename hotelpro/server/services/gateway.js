// Payment gateway adapter.
//   PAYMENT_MODE=mock      every online payment is approved instantly (default, for local testing)
//   PAYMENT_MODE=razorpay  real Razorpay checkout (use rzp_test_ keys first, then live keys)
import crypto from 'crypto';

export const isRazorpay = () => process.env.PAYMENT_MODE === 'razorpay';
const keysReady = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

async function rzp(path, body) {
  if (!keysReady()) throw new Error('Razorpay keys are missing in server/.env');
  const res = await fetch('https://api.razorpay.com/v1' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64'), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.description || 'Razorpay request failed');
  return data;
}

export const createOrder = ({ amount, receipt, notes }) => rzp('/orders', { amount: Math.round(amount * 100), currency: 'INR', receipt, notes }); // amount in paise
export const getOrder = (id) => rzp('/orders/' + encodeURIComponent(id));

const safeEqual = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

// Signature returned to the browser after payment: HMAC-SHA256(order_id|payment_id) with the key secret
export function verifySignature(orderId, paymentId, signature) {
  if (!keysReady() || !orderId || !paymentId) return false;
  return safeEqual(hmac(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature);
}
// Webhook signature: HMAC-SHA256(raw body) with the webhook secret
export function verifyWebhook(rawBody, signature) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET || !rawBody) return false;
  return safeEqual(hmac(process.env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);
}

// Mock gateway (PAYMENT_MODE=mock)
export async function charge({ amount, method }) {
  if (isRazorpay()) throw new Error('Use the online payment window to pay');
  return { success: true, transactionId: 'TXN' + Date.now() + Math.floor(Math.random() * 1000), method, amount };
}
// Refund. Decided by the payment itself, not by PAYMENT_MODE:
//   pay_...  a real Razorpay payment  -> checked at Razorpay, then refunded there
//   others   desk (cash/card/UPI) or simulated payments -> recorded only, the money is returned by hand
export async function refund(payment) {
  const id = String(payment.transactionId || '');
  if (!id.startsWith('pay_')) return { via: 'manual', note: 'This was a desk or simulated payment, so return the money to the guest by hand.' };
  const p = await rzp('/payments/' + encodeURIComponent(id));
  const left = p.amount - (p.amount_refunded || 0);
  if (p.status === 'refunded' || left <= 0) return { via: 'razorpay', note: 'Razorpay had already refunded this payment.' };
  if (p.status === 'authorized') return { via: 'razorpay', note: 'This payment was never captured, so Razorpay releases the money to the guest automatically.' };
  if (p.status !== 'captured') throw new Error(`Razorpay shows this payment as "${p.status}", so it cannot be refunded.`);
  const r = await rzp(`/payments/${encodeURIComponent(id)}/refund`, { amount: left });
  return { via: 'razorpay', refundId: r.id };
}
