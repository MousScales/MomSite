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
  const raw = (candidates[0] || '').trim();
  // Strip only whitespace/quotes/newlines; keep sk_ and key body (letters, numbers, underscores)
  const cleaned = String(raw).replace(/^["']|["']$/g, '').trim();
  return cleaned.replace(/[^a-zA-Z0-9_]/g, '');
}

module.exports = { getStripeSecretKey };
