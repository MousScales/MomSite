const { createClient } = require('@supabase/supabase-js');

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

  const supabaseUrl = process.env.SUPABASE_URL || 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseKey) {
    return res.status(500).json({ error: 'Database is not configured.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: allBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .order('appointment-datetime', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      return res.status(500).json({ error: error.message || 'An error occurred while fetching bookings.' });
    }

    const formatted = (allBookings || []).map((b) => ({
      id: b.id,
      bookingReference: b.booking_reference,
      customerName: b.name,
      phoneNumber: b.phone,
      email: b.email,
      appointmentDateTime: b['appointment-datetime'],
      selectedStyle: b.selected_style,
      hairLength: b.hair_length,
      hairOption: b.hair_option,
      preWashOption: b.pre_wash_option,
      detanglingOption: b.detangling_option,
      notes: b.notes,
      totalPrice: parseFloat(b.total_price || 0),
      duration: b.duration,
      status: b.status,
      depositPaid: parseFloat(b.deposit_paid || 0),
      stripeSessionId: b.stripe_session_id || b.payment_session_id,
      currentHairImageURL: b.current_hair_image_url,
      referenceImageURL: b.reference_image_url,
      boxBraidsVariation: b.box_braids_variation,
      cornrowsVariation: b.cornrows_variation,
      twoStrandTwistsVariation: b.two_strand_twists_variation,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      cancelledAt: b.cancelled_at,
    }));

    return res.status(200).json(formatted);
  } catch (e) {
    console.error('Error in get-bookings:', e);
    return res.status(500).json({ error: e.message || 'An error occurred while fetching bookings.' });
  }
};
