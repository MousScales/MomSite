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

  const date = req.query.date;
  if (!date) {
    return res.status(400).json({ error: 'Date parameter is required' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseKey) {
    return res.status(500).json({ error: 'Database is not configured.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'confirmed');

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    const unavailableTimes = [];
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    for (const booking of bookings || []) {
      const appointmentStr = booking['appointment-datetime'] || booking.appointment_datetime;
      if (!appointmentStr) continue;

      try {
        const appointmentTime = new Date(appointmentStr);
        const appointmentDateStr = appointmentTime.toISOString().split('T')[0];
        if (appointmentDateStr !== targetDateStr) continue;

        const duration = parseInt(booking.duration, 10) || 120;
        const endTime = new Date(appointmentTime);
        endTime.setMinutes(endTime.getMinutes() + duration);

        unavailableTimes.push({
          start: appointmentTime.toISOString(),
          end: endTime.toISOString(),
          duration
        });
      } catch (e) {
        console.error('Error processing booking:', e);
      }
    }

    return res.status(200).json({ unavailableTimes });
  } catch (err) {
    console.error('Error fetching unavailable times:', err);
    return res.status(500).json({ error: err.message || 'Error fetching unavailable times' });
  }
};
