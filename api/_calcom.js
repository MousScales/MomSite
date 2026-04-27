/**
 * Cal.com API v2 helper
 *
 * Required env vars:
 *   CAL_COM_API_KEY       - Your cal.com API key (from cal.com/settings/developer/api-keys)
 *   CAL_COM_EVENT_TYPE_ID - The numeric ID of your "Hair Appointment" event type
 *                           (visible in the URL when you edit the event type on cal.com)
 */

const CAL_API_BASE = 'https://api.cal.com/v2';

function getHeaders(version = '2024-08-13') {
  const key = process.env.CAL_COM_API_KEY;
  if (!key) throw new Error('CAL_COM_API_KEY not set');
  return {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'cal-api-version': version,
  };
}

/**
 * Create a booking on cal.com when a new appointment is confirmed.
 * Returns the cal.com booking UID (string) or null on failure.
 */
async function createCalComBooking(opts) {
  const apiKey = process.env.CAL_COM_API_KEY;
  const eventTypeId = parseInt(process.env.CAL_COM_EVENT_TYPE_ID || '0', 10);
  if (!apiKey || !eventTypeId) {
    console.warn('Cal.com: CAL_COM_API_KEY or CAL_COM_EVENT_TYPE_ID not set, skipping');
    return null;
  }

  const durationMins = parseInt(opts.duration || 120, 10);

  const body = {
    eventTypeId,
    start: opts.appointmentDatetime,
    lengthInMinutes: durationMins,
    attendee: {
      name: opts.name || 'Client',
      email: opts.email,
      timeZone: 'America/New_York',
      language: 'en',
    },
    metadata: {
      bookingReference: opts.bookingReference || '',
      service: opts.selectedStyle || '',
      notes: opts.notes || '',
    },
  };

  try {
    const res = await fetch(`${CAL_API_BASE}/bookings`, {
      method: 'POST',
      headers: getHeaders('2024-08-13'),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Cal.com create booking error:', JSON.stringify(data));
      return null;
    }
    const uid = data?.data?.uid || data?.uid || null;
    console.log('Cal.com booking created, uid:', uid);
    return uid;
  } catch (e) {
    console.error('Cal.com create booking exception:', e.message);
    return null;
  }
}

/**
 * Reschedule an existing cal.com booking to a new start time.
 */
async function rescheduleCalComBooking(uid, newDatetime, reason = 'Client rescheduled') {
  if (!uid) return false;
  const apiKey = process.env.CAL_COM_API_KEY;
  if (!apiKey) { console.warn('Cal.com: API key not set'); return false; }

  try {
    const res = await fetch(`${CAL_API_BASE}/bookings/${uid}/reschedule`, {
      method: 'POST',
      headers: getHeaders('2026-02-25'),
      body: JSON.stringify({ start: newDatetime, reschedulingReason: reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Cal.com reschedule error:', JSON.stringify(data));
      return false;
    }
    console.log('Cal.com booking rescheduled, uid:', uid);
    return true;
  } catch (e) {
    console.error('Cal.com reschedule exception:', e.message);
    return false;
  }
}

/**
 * Cancel a cal.com booking.
 */
async function cancelCalComBooking(uid, reason = 'Client cancelled') {
  if (!uid) return false;
  const apiKey = process.env.CAL_COM_API_KEY;
  if (!apiKey) { console.warn('Cal.com: API key not set'); return false; }

  try {
    const res = await fetch(`${CAL_API_BASE}/bookings/${uid}/cancel`, {
      method: 'POST',
      headers: getHeaders('2024-08-13'),
      body: JSON.stringify({ cancellationReason: reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Cal.com cancel error:', JSON.stringify(data));
      return false;
    }
    console.log('Cal.com booking cancelled, uid:', uid);
    return true;
  } catch (e) {
    console.error('Cal.com cancel exception:', e.message);
    return false;
  }
}

module.exports = { createCalComBooking, rescheduleCalComBooking, cancelCalComBooking };
