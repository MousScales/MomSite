const { getStripeSecretKey } = require('./_stripe-env');

/**
 * Diagnostic endpoint - verify Stripe key is set and accepted by Stripe API.
 * Visit: your-site.com/api/stripe-check
 * Returns status only - never exposes the key.
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = getStripeSecretKey();
  let status = 'missing';
  let hint = 'Add STRIPE_SECRET_KEY in Vercel → Settings → Environment Variables';
  if (key) {
    if (!key.startsWith('sk_live_') && !key.startsWith('sk_test_')) {
      status = 'invalid_format';
      hint = 'Key must start with sk_live_ or sk_test_. Re-paste from Stripe Dashboard.';
      return res.status(200).json({ stripe: status, hint });
    }
    status = key.startsWith('sk_live_') ? 'ok_live' : 'ok_test';
    hint = 'Key format OK. Verifying with Stripe...';

    // Actually call Stripe to confirm the key is accepted (not revoked, correct account)
    try {
      const stripeRes = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await stripeRes.json();
      if (data.error) {
        status = 'rejected';
        const code = (data.error.code || '').toLowerCase();
        const msg = (data.error.message || '').toLowerCase();
        if (code === 'invalid_api_key' || msg.includes('invalid') && msg.includes('key')) {
          hint = 'Stripe rejected this key. In Stripe Dashboard: use a current secret key (not revoked), from the same account as your publishable key. If using a restricted key, enable Payments and Customers (read+write). Then update Vercel env and redeploy.';
        } else {
          hint = data.error.message || 'Stripe returned an error. Check the key and account.';
        }
        return res.status(200).json({ stripe: status, hint });
      }
      hint = key.startsWith('sk_live_')
        ? 'Key is valid and accepted by Stripe. Payments should work.'
        : 'Test key is valid. Use sk_live_... for real payments.';
    } catch (e) {
      hint = 'Could not verify key with Stripe. Check network or try again.';
    }
  }
  return res.status(200).json({ stripe: status, hint });
};
