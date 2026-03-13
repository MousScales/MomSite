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
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbmJkcWtxbHhrZmdoamNidndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQxNjMsImV4cCI6MjA4ODc1MDE2M30.r8jDPCV7C7kTrnHIwGvs4vBq-sf8rvyFxe1Q6_rR2Tg';

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'confirmed');

    if (error) {
      console.error('Supabase error:', error);
      return res.status(200).json({ unavailableTimes: [] });
    }

    const unavailableTimes = [];
    const targetDateStr = String(date).substring(0, 10);

    for (const booking of bookings || []) {
      const appointmentStr = booking['appointment-datetime'] || booking.appointment_datetime;
      if (!appointmentStr) continue;

      try {
        const appointmentDateStr = String(appointmentStr).substring(0, 10);
        if (appointmentDateStr !== targetDateStr) continue;

        const appointmentTime = new Date(appointmentStr);
        if (isNaN(appointmentTime.getTime())) continue;

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
