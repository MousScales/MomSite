/**
 * Returns Stripe publishable key from Vercel env.
 * Used by client to initialize Stripe when keys are in env.
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = String(process.env.STRIPE_PUBLISHABLE_KEY || '').replace(/[^a-zA-Z0-9_]/g, '');
  if (!key || !key.startsWith('pk_')) {
    return res.status(500).json({
      error: 'STRIPE_PUBLISHABLE_KEY not set or invalid. In Vercel: Settings → Environment Variables → set Value to your publishable key (pk_live_... or pk_test_...). Save, then redeploy.',
      hint: 'Add STRIPE_PUBLISHABLE_KEY in Settings → Environment Variables, then redeploy.'
    });
  }
  return res.status(200).json({ publishableKey: key });
};
