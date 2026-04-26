const { createClient } = require('@supabase/supabase-js');
const { sendOwnerRescheduleNotification } = require('./_whatsapp');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseBody(req) {
  const raw = req.body;
  if (raw === undefined || raw === null) return {};
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw;
  try { return JSON.parse(typeof raw === 'string' ? raw : String(raw)); } catch { return {}; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbmJkcWtxbHhrZmdoamNidndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQxNjMsImV4cCI6MjA4ODc1MDE2M30.r8jDPCV7C7kTrnHIwGvs4vBq-sf8rvyFxe1Q6_rR2Tg';

  const data = parseBody(req);
  const bookingIdInput = (data.bookingId || '').trim();
  const email = (data.email || '').trim().toLowerCase();
  const newDatetime = data.newDatetime;

  if (!bookingIdInput) return res.status(400).json({ error: 'Booking ID is required.' });
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  if (!newDatetime) return res.status(400).json({ error: 'New date and time is required.' });

  // Enforce 48-hour advance notice
  const newDt = new Date(newDatetime);
  const minBookable = new Date(Date.now() + 48 * 60 * 60 * 1000);
  if (newDt < minBookable) {
    return res.status(400).json({ error: 'Appointments must be rescheduled at least 48 hours in advance.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up booking by UUID or reference
    let result = null;
    if (UUID_REGEX.test(bookingIdInput)) {
      result = await supabase.from('bookings').select('*').eq('id', bookingIdInput).maybeSingle();
    }
    if (!result?.data) {
      result = await supabase.from('bookings').select('*').eq('booking_reference', bookingIdInput.toUpperCase()).maybeSingle();
    }

    if (result?.error) return res.status(500).json({ error: 'Error looking up booking.' });
    const booking = result?.data;
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    // Verify email matches
    if ((booking.email || '').trim().toLowerCase() !== email) {
      return res.status(403).json({ error: 'Email does not match this booking.' });
    }

    // Don't allow rescheduling cancelled bookings
    if ((booking.status || '').toLowerCase() === 'cancelled') {
      return res.status(400).json({ error: 'Cannot reschedule a cancelled booking.' });
    }

    // Check the new slot isn't already taken
    const newDateStr = newDatetime.substring(0, 10);
    const { data: conflicting } = await supabase
      .from('bookings')
      .select('id, appointment-datetime, duration')
      .eq('status', 'confirmed')
      .neq('id', booking.id);

    const newStart = new Date(newDatetime);
    const newEnd = new Date(newStart.getTime() + (parseInt(booking.duration) || 120) * 60000);

    const hasConflict = (conflicting || []).some(b => {
      const appt = b['appointment-datetime'];
      if (!appt || appt.substring(0, 10) !== newDateStr) return false;
      const bStart = new Date(appt);
      const bEnd = new Date(bStart.getTime() + (parseInt(b.duration) || 120) * 60000);
      return newStart < bEnd && newEnd > bStart;
    });

    if (hasConflict) {
      return res.status(409).json({ error: 'That time slot is already booked. Please choose another time.' });
    }

    const oldDatetime = booking['appointment-datetime'];
    const now = new Date().toISOString();

    // Update Google Calendar if event exists
    if (booking.calendar_event_id) {
      try {
        const { updateCalendarEvent } = require('./_calendar');
        if (typeof updateCalendarEvent === 'function') {
          await updateCalendarEvent(booking.calendar_event_id, {
            'appointment-datetime': newDatetime,
            duration: booking.duration,
            name: booking.name,
            selected_style: booking.selected_style,
            email: booking.email,
          });
        }
      } catch (e) {
        console.warn('Calendar update failed (continuing):', e.message);
      }
    }

    // Update booking in Supabase
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 'appointment-datetime': newDatetime, updated_at: now })
      .eq('id', booking.id);

    if (updateError) {
      console.error('Reschedule update error:', updateError);
      return res.status(500).json({ error: 'Failed to reschedule booking.' });
    }

    // WhatsApp notification to owner
    try {
      await sendOwnerRescheduleNotification({
        name: booking.name,
        phone: booking.phone,
        email: booking.email,
        bookingReference: booking.booking_reference || booking.id,
        selectedStyle: booking.selected_style,
        duration: booking.duration,
        totalPrice: parseFloat(booking.total_price || 0),
        depositPaid: parseFloat(booking.deposit_paid || 0),
        oldDatetime,
        newDatetime,
        currentHairImageUrl: booking.current_hair_image_url,
        referenceImageUrl: booking.reference_image_url,
      });
    } catch (e) {
      console.warn('WhatsApp reschedule notification failed:', e.message);
    }

    return res.status(200).json({ rescheduled: true, message: 'Booking rescheduled successfully.' });
  } catch (e) {
    console.error('Reschedule error:', e);
    return res.status(500).json({ error: e.message || 'An error occurred.' });
  }
};
