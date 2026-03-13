const { createClient } = require('@supabase/supabase-js');
const { getStripeSecretKey } = require('./_stripe-env');

function generateBookingReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MAYA-${code}`;
}

async function stripeRequest(method, path, body = null) {
  const key = getStripeSecretKey();
  if (!key || !key.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY not set or invalid in Vercel env');
  }
  const url = `https://api.stripe.com/v1${path}`;
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  if (body) {
    opts.body = new URLSearchParams(body).toString();
  }
  const res = await fetch(url, opts);
  const data = await res.json();
  if (data.error) {
    const err = new Error(data.error.message || 'Stripe error');
    err.code = data.error.code;
    throw err;
  }
  return data;
}

function parseBody(req) {
  const raw = req.body;
  if (raw === undefined || raw === null) return {};
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(String(raw));
  } catch (e) {
    return {};
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  try {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeKey = getStripeSecretKey();
  const supabaseUrl = process.env.SUPABASE_URL || 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbmJkcWtxbHhrZmdoamNidndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQxNjMsImV4cCI6MjA4ODc1MDE2M30.r8jDPCV7C7kTrnHIwGvs4vBq-sf8rvyFxe1Q6_rR2Tg';

  if (!stripeKey) {
    return res.status(500).json({
      error: 'STRIPE_SECRET_KEY not set or empty. In Vercel: Settings → Environment Variables → set Name to STRIPE_SECRET_KEY and Value to ONLY your key (sk_live_... or sk_test_...). Save, then redeploy the project.',
    });
  }
  if (!stripeKey.startsWith('sk_')) {
    return res.status(500).json({
      error: 'STRIPE_SECRET_KEY must start with sk_live_ or sk_test_. Check the Value has no extra text (e.g. no "STRIPE_SECRET_KEY=" in the value). Redeploy after fixing.',
    });
  }
  if (!supabaseKey) {
    return res.status(500).json({ error: 'Database not configured.' });
  }

  try {
    const data = parseBody(req);

    const appointmentStr = data['appointment-datetime'] || data.appointmentDateTime;
    if (appointmentStr) {
      const appointmentDt = new Date(appointmentStr);
      const nowUtc = new Date();
      const minBookable = new Date(nowUtc.getTime() + 48 * 60 * 60 * 1000);
      if (appointmentDt < minBookable) {
        return res.status(400).json({
          error: 'Appointments must be booked at least 48 hours in advance.',
        });
      }
    }

    const totalPrice = parseFloat(data.totalPrice || data.total_price || 0);
    const depositAmount = Math.round(totalPrice * 0.10 * 100);
    if (depositAmount < 50) {
      return res.status(400).json({ error: 'Deposit amount is too low.' });
    }

    const bookingId = require('crypto').randomUUID();
    const bookingReference = generateBookingReference();

    const supabase = createClient(supabaseUrl, supabaseKey);
    const tempBookingData = {
      id: bookingId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      'appointment-datetime': data['appointment-datetime'] || data.appointmentDateTime,
      selected_style: data.selected_style || data.selectedStyle,
      hair_length: data.hair_length || data.hairLength,
      hair_option: data.hair_option || data.hairOption,
      pre_wash_option: data.pre_wash_option || data.preWashOption,
      detangling_option: data.detangling_option || data.detanglingOption,
      notes: data.notes,
      total_price: totalPrice,
      duration: parseInt(data.duration, 10) || 120,
      current_hair_image_url: data.currentHairImageURL || data.current_hair_image_url,
      reference_image_url: data.referenceImageURL || data.reference_image_url,
      box_braids_variation: data.box_braids_variation || data.boxBraidsVariation,
      cornrows_variation: data.cornrows_variation || data.cornrowsVariation,
      two_strand_twists_variation: data.two_strand_twists_variation || data.twoStrandTwistsVariation,
      status: 'pending_payment',
      deposit_amount: depositAmount,
      booking_id: bookingId,
      booking_reference: bookingReference,
    };

    const { error: insertError } = await supabase
      .from('temp_bookings')
      .insert(tempBookingData);

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    const pi = await stripeRequest('POST', '/payment_intents', {
      amount: String(depositAmount),
      currency: 'usd',
      'payment_method_types[]': 'card',
      'metadata[bookingId]': bookingId
    });

    return res.status(200).json({
      clientSecret: pi.client_secret,
      bookingId,
    });
  } catch (err) {
    console.error('Create payment intent error:', err);
    let msg = err.message || 'An error occurred';
    const lower = String(msg).toLowerCase();
    if ((lower.includes('invalid') && lower.includes('key')) || err.code === 'invalid_api_key') {
      msg = 'Stripe rejected the API key. Check: (1) In Stripe Dashboard use a current secret key (not revoked). (2) Secret key must be from the same Stripe account as your publishable key. (3) If using a restricted key, enable Payments and Customers (read+write). Then update STRIPE_SECRET_KEY in Vercel and redeploy.';
    }
    if (lower.includes('supabase') || lower.includes('invalid api key')) {
      msg = 'Supabase error: Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_ANON_KEY) in Vercel → Settings → Environment Variables. Use keys from the same project (ecnbdqkqlxkfghjcbvwj). Redeploy after saving.';
    }
    return res.status(500).json({ error: msg });
  }
  } catch (outerErr) {
    console.error('Create payment intent outer error:', outerErr);
    return res.status(500).json({
      error: outerErr.message || 'Server error. Check Vercel logs (Deployments → Logs) for details.',
    });
  }
};
