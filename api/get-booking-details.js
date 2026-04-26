const { createClient } = require('@supabase/supabase-js');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const id = (req.query.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Booking ID is required.' });

  const supabaseUrl = process.env.SUPABASE_URL || 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbmJkcWtxbHhrZmdoamNidndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQxNjMsImV4cCI6MjA4ODc1MDE2M30.r8jDPCV7C7kTrnHIwGvs4vBq-sf8rvyFxe1Q6_rR2Tg';

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    let result = null;

    // Try by UUID first, then by booking_reference
    if (UUID_REGEX.test(id)) {
      result = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
    }
    if (!result?.data) {
      result = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_reference', id.toUpperCase())
        .maybeSingle();
    }

    if (result?.error) {
      console.error('get-booking-details error:', result.error);
      return res.status(500).json({ error: 'An error occurred while looking up the booking.' });
    }

    const booking = result?.data;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found. Please check your Booking ID.' });
    }

    return res.status(200).json({
      id: booking.id,
      booking_reference: booking.booking_reference,
      email: booking.email,
      name: booking.name,
      phone: booking.phone,
      selected_style: booking.selected_style,
      'appointment-datetime': booking['appointment-datetime'],
      duration: booking.duration,
      total_price: booking.total_price,
      deposit_paid: booking.deposit_paid,
      status: booking.status,
      hair_length: booking.hair_length,
      hair_option: booking.hair_option,
      pre_wash_option: booking.pre_wash_option,
      notes: booking.notes,
      current_hair_image_url: booking.current_hair_image_url,
      reference_image_url: booking.reference_image_url,
      created_at: booking.created_at,
    });
  } catch (e) {
    console.error('get-booking-details exception:', e);
    return res.status(500).json({ error: e.message || 'An error occurred.' });
  }
};
