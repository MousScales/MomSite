/**
 * One-time / on-demand endpoint to sync all existing Supabase bookings to Cal.com.
 *
 * POST /api/sync-calcom-bookings
 * Body: { "secret": "<SYNC_SECRET env var>" }
 *
 * Skips bookings that already have a cal_com_uid.
 * Only syncs status: confirmed | rescheduled (not cancelled / pending).
 */

const { createClient } = require('@supabase/supabase-js');
const { createCalComBooking } = require('./_calcom');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Simple secret guard so random people can't trigger it
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const secret = process.env.SYNC_SECRET;
  if (secret && body.secret !== secret) {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseKey) return res.status(500).json({ error: 'Supabase not configured' });

  const calApiKey = process.env.CAL_COM_API_KEY;
  const calEventTypeId = process.env.CAL_COM_EVENT_TYPE_ID;
  if (!calApiKey || !calEventTypeId) {
    return res.status(500).json({ error: 'CAL_COM_API_KEY or CAL_COM_EVENT_TYPE_ID not set in Vercel env vars' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all active bookings that haven't been synced yet
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .in('status', ['confirmed', 'rescheduled'])
    .is('cal_com_uid', null);

  if (error) return res.status(500).json({ error: error.message });
  if (!bookings || bookings.length === 0) {
    return res.status(200).json({ message: 'No bookings to sync', synced: 0, skipped: 0, failed: 0 });
  }

  let synced = 0, failed = 0, skipped = 0;
  const results = [];

  for (const booking of bookings) {
    const apptDatetime = booking['appointment-datetime'];
    if (!apptDatetime || !booking.email) {
      skipped++;
      results.push({ id: booking.id, status: 'skipped', reason: 'missing datetime or email' });
      continue;
    }

    // Skip past appointments (cal.com won't accept them)
    if (new Date(apptDatetime) < new Date()) {
      skipped++;
      results.push({ id: booking.id, name: booking.name, status: 'skipped', reason: 'past appointment' });
      continue;
    }

    try {
      const calUid = await createCalComBooking({
        name: booking.name,
        email: booking.email,
        appointmentDatetime: apptDatetime,
        duration: booking.duration || 120,
        selectedStyle: booking.selected_style,
        notes: booking.notes,
        bookingReference: booking.booking_reference || booking.id,
      });

      if (calUid) {
        await supabase.from('bookings').update({ cal_com_uid: calUid }).eq('id', booking.id);
        synced++;
        results.push({ id: booking.id, name: booking.name, status: 'synced', calUid });
      } else {
        failed++;
        results.push({ id: booking.id, name: booking.name, status: 'failed', reason: 'no uid returned' });
      }
    } catch (e) {
      failed++;
      results.push({ id: booking.id, name: booking.name, status: 'failed', reason: e.message });
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  return res.status(200).json({
    message: `Sync complete: ${synced} synced, ${skipped} skipped, ${failed} failed`,
    synced,
    skipped,
    failed,
    results,
  });
};
