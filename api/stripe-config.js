/**
 * Returns Stripe publishable key from environment.
 * Use this so both keys come from Vercel env vars - no need to edit config.js.
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return res.status(500).json({
      error: 'STRIPE_PUBLISHABLE_KEY not set in Vercel Environment Variables'
    });
  }

  return res.status(200).json({ publishableKey });
};
