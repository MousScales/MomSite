const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

function generateBookingReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MAYA-${code}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbmJkcWtxbHhrZmdoamNidndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQxNjMsImV4cCI6MjA4ODc1MDE2M30.r8jDPCV7C7kTrnHIwGvs4vBq-sf8rvyFxe1Q6_rR2Tg';

  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Payment not configured. Add STRIPE_SECRET_KEY in Vercel → Settings → Environment Variables.' });
  }
  if (!supabaseKey) {
    return res.status(500).json({ error: 'Database not configured. Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in Vercel.' });
  }

  try {
    const data = req.body || {};

    const appointmentStr = data['appointment-datetime'] || data.appointmentDateTime;
    if (appointmentStr) {
      const appointmentDt = new Date(appointmentStr);
      const nowUtc = new Date();
      const minBookable = new Date(nowUtc.getTime() + 48 * 60 * 60 * 1000);
      if (appointmentDt < minBookable) {
        return res.status(400).json({
          error: 'Appointments must be booked at least 48 hours in advance.'
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
      booking_reference: bookingReference
    };

    const { error: insertError } = await supabase
      .from('temp_bookings')
      .insert(tempBookingData);

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    const stripe = new Stripe(stripeSecretKey);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: depositAmount,
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: { bookingId }
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      bookingId
    });
  } catch (err) {
    console.error('Error creating payment intent:', err);
    return res.status(500).json({
      error: err.message || 'An error occurred'
    });
  }
};
