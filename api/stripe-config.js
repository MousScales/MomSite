/**
 * Returns Stripe publishable key from Vercel env.
 * Used by client to initialize Stripe when keys are in env.
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = String(process.env.STRIPE_PUBLISHABLE_KEY || '').replace(/[^a-zA-Z0-9_]/g, '');
  if (!key || !key.startsWith('pk_')) {
    return res.status(500).json({
      error: 'STRIPE_PUBLISHABLE_KEY not set in Vercel env',
      hint: 'Add STRIPE_PUBLISHABLE_KEY (pk_live_... or pk_test_...) in Settings → Environment Variables'
    });
  }
  return res.status(200).json({ publishableKey: key });
};
