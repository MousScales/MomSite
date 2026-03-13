/**
 * Diagnostic endpoint - verify Stripe key is set in Vercel.
 * Visit: your-site.com/api/stripe-check
 * Returns status only - never exposes the key.
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  let status = 'missing';
  let hint = 'Add STRIPE_SECRET_KEY in Vercel → Settings → Environment Variables';
  if (key) {
    if (key.startsWith('sk_live_')) {
      status = 'ok_live';
      hint = 'Key looks valid. If payments fail, re-paste the key in Vercel (no spaces) and redeploy.';
    } else if (key.startsWith('sk_test_')) {
      status = 'ok_test';
      hint = 'Test key set. Use sk_live_... for real payments.';
    } else {
      status = 'invalid_format';
      hint = 'Key must start with sk_live_ or sk_test_. Re-paste from Stripe Dashboard.';
    }
  }
  return res.status(200).json({ stripe: status, hint });
};
