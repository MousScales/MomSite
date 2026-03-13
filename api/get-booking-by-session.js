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

  const session_id = req.query.session_id;
  if (!session_id) {
    return res.status(400).json({ error: 'Session ID is required.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseKey) {
    return res.status(500).json({ error: 'Database is not configured.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    let { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('stripe_session_id', session_id)
      .single();

    if (error || !data) {
      const result = await supabase
        .from('bookings')
        .select('*')
        .eq('payment_session_id', session_id)
        .single();
      data = result.data;
      error = result.error;
    }

    if (error || !data) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    return res.status(200).json({
      id: data.id,
      booking_id: data.id,
      booking_reference: data.booking_reference,
      deposit_paid: parseFloat(data.deposit_paid || 0),
      deposit_amount: data.deposit_amount,
      calendar_event_id: data.calendar_event_id,
      status: data.status,
      name: data.name,
      selected_style: data.selected_style,
      'appointment-datetime': data['appointment-datetime']
    });
  } catch (e) {
    console.error('Error fetching booking by session:', e);
    return res.status(500).json({ error: e.message || 'An error occurred' });
  }
};
