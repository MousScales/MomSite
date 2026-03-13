/**
 * Single source for Stripe secret key from Vercel env.
 * Tries multiple possible env var names (Vercel, .env paste, etc.)
 */
function getStripeSecretKey() {
  const candidates = [
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_API_KEY,
    process.env.stripe_secret_key,
  ].filter(Boolean);
  const raw = candidates[0] || '';
  return String(raw).trim().replace(/[\r\n\t\s]/g, '');
}

module.exports = { getStripeSecretKey };
