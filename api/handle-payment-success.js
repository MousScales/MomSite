const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

function getQuery(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  const u = req.url || '';
  const i = u.indexOf('?');
  if (i < 0) return {};
  return Object.fromEntries(new URLSearchParams(u.slice(i + 1)));
}

module.exports = async (req, res) => {
  const q = getQuery(req);
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbmJkcWtxbHhrZmdoamNidndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQxNjMsImV4cCI6MjA4ODc1MDE2M30.r8jDPCV7C7kTrnHIwGvs4vBq-sf8rvyFxe1Q6_rR2Tg';
  // Use request origin so redirect goes to correct domain (e.g. www.mayaafricanhairbraid.com)
  const origin = req.headers.origin || req.headers.referer;
  const baseUrl = (origin && typeof origin === 'string')
    ? origin.replace(/\/$/, '')
    : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://mom-site-steel.vercel.app');

  const redirect = (path, status = 302) => {
    res.writeHead(status, { Location: path });
    res.end();
  };

  if (!supabaseKey || !stripeSecretKey) {
    return redirect(`${baseUrl}/booking-error.html?error=Server not configured`);
  }

  const payment_intent_id = q.payment_intent;
  const redirect_status = q.redirect_status;
  const session_id = q.session_id;
  const booking_id = q.booking_id;

  let resolvedBookingId = null;
  let amount_paid = 0;

  if (payment_intent_id) {
    if (redirect_status !== 'succeeded') {
      return redirect(`${baseUrl}/booking-error.html?error=Payment not completed`);
    }
    try {
      const stripe = new Stripe(stripeSecretKey);
      const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
      if (pi.status !== 'succeeded') {
        return redirect(`${baseUrl}/booking-error.html?error=Payment not completed`);
      }
      resolvedBookingId = pi.metadata?.bookingId;
      if (!resolvedBookingId) {
        return redirect(`${baseUrl}/booking-error.html?error=Invalid payment`);
      }
      amount_paid = pi.amount_received;
    } catch (e) {
      console.error('PaymentIntent error:', e);
      return redirect(`${baseUrl}/booking-error.html?error=Payment verification failed`);
    }
  } else if (session_id && booking_id) {
    try {
      const stripe = new Stripe(stripeSecretKey);
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status !== 'paid') {
        return redirect(`${baseUrl}/booking-error.html?error=Payment not completed`);
      }
      resolvedBookingId = booking_id;
      amount_paid = session.amount_total;
    } catch (e) {
      console.error('Session error:', e);
      return redirect(`${baseUrl}/booking-error.html?error=Payment verification failed`);
    }
  } else {
    return redirect(`${baseUrl}/booking-error.html?error=Missing payment information`);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: tempData, error: tempError } = await supabase
      .from('temp_bookings')
      .select('*')
      .eq('id', resolvedBookingId)
      .single();

    if (tempError || !tempData) {
      return redirect(`${baseUrl}/booking-error.html?error=Booking not found`);
    }

    const temp = tempData;
    const appointmentDatetime = temp['appointment-datetime'] || temp.appointment_datetime;

    const bookingData = {
      id: resolvedBookingId,
      name: temp.name,
      phone: temp.phone,
      email: temp.email,
      'appointment-datetime': appointmentDatetime,
      selected_style: temp.selected_style || temp.selectedStyle,
      hair_length: temp.hair_length || temp.hairLength,
      hair_option: temp.hair_option || temp.hairOption,
      pre_wash_option: temp.pre_wash_option || temp.preWashOption,
      detangling_option: temp.detangling_option || temp.detanglingOption,
      notes: temp.notes || '',
      total_price: parseFloat(temp.total_price || 0),
      duration: temp.duration,
      current_hair_image_url: temp.current_hair_image_url || temp.currentHairImageURL,
      reference_image_url: temp.reference_image_url || temp.referenceImageURL,
      box_braids_variation: temp.box_braids_variation || temp.boxBraidsVariation,
      cornrows_variation: temp.cornrows_variation || temp.cornrowsVariation,
      two_strand_twists_variation: temp.two_strand_twists_variation || temp.twoStrandTwistsVariation,
      status: 'confirmed',
      deposit_paid: amount_paid / 100.0,
      deposit_amount: amount_paid,
      payment_session_id: payment_intent_id || session_id,
      stripe_session_id: payment_intent_id || session_id,
      booking_reference: temp.booking_reference
    };

    const { error: insertError } = await supabase.from('bookings').insert(bookingData);
    if (insertError) {
      console.error('Insert booking error:', insertError);
      return redirect(`${baseUrl}/booking-error.html?error=Failed to save booking`);
    }

    await supabase.from('temp_bookings').delete().eq('id', resolvedBookingId);

    const lookupId = payment_intent_id || session_id;
    return redirect(`${baseUrl}/booking-success.html?session_id=${lookupId}`);
  } catch (e) {
    console.error('Handle payment success error:', e);
    return redirect(`${baseUrl}/booking-error.html?error=${encodeURIComponent(e.message || 'An error occurred')}`);
  }
};
