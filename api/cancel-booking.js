const { createClient } = require('@supabase/supabase-js');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseKey) {
    return res.status(500).json({ error: 'Database is not configured.' });
  }

  const data = parseBody(req);
  const bookingIdInput = (data.bookingId || data.booking_id || '').trim();
  const email = (data.email || '').trim().toLowerCase();

  if (!bookingIdInput) {
    return res.status(400).json({ error: 'Booking ID is required.' });
  }
  if (!email) {
    return res.status(400).json({ error: 'Email is required to cancel.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    let result = null;

    if (UUID_REGEX.test(bookingIdInput)) {
      const r = await supabase.from('bookings').select('*').eq('id', bookingIdInput).maybeSingle();
      result = r;
    }
    if (!result?.data) {
      const r = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_reference', bookingIdInput.toUpperCase())
        .maybeSingle();
      result = r;
    }

    if (result.error) {
      console.error('Cancel booking lookup error:', result.error);
      return res.status(500).json({ error: 'An error occurred while looking up the booking.' });
    }

    const booking = result.data;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found. Please check your Booking ID.' });
    }

    const bookingEmail = (booking.email || '').trim().toLowerCase();
    if (bookingEmail !== email) {
      return res.status(403).json({ error: 'Email does not match this booking.' });
    }

    const status = (booking.status || '').toLowerCase();
    if (status === 'cancelled') {
      return res.status(200).json({ message: 'Booking was already cancelled.', cancelled: true });
    }

    const calendarEventId = booking.calendar_event_id;
    if (calendarEventId) {
      try {
        const { deleteCalendarEvent } = require('./_calendar');
        const deleted = await deleteCalendarEvent(calendarEventId);
        if (deleted) {
          console.log('Google Calendar event deleted:', calendarEventId);
        } else {
          console.warn('Could not delete Google Calendar event:', calendarEventId);
        }
      } catch (e) {
        console.warn('Calendar event deletion failed:', e.message);
      }
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        updated_at: now,
      })
      .eq('id', booking.id);

    if (updateError) {
      console.error('Cancel booking update error:', updateError);
      return res.status(500).json({ error: 'An error occurred while cancelling the booking.' });
    }

    return res.status(200).json({ message: 'Booking cancelled successfully.', cancelled: true });
  } catch (e) {
    console.error('Cancel booking error:', e);
    return res.status(500).json({
      error: e.message || 'An error occurred while cancelling your booking. Please try again.',
    });
  }
};
