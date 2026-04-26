const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
// Your Twilio WhatsApp sender — sandbox: 'whatsapp:+14155238886'
// Production (after approval): 'whatsapp:+1YOURNUMBER'
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

// Numbers that receive booking notifications.
// OWNER_WHATSAPP_TO can be a comma-separated list, e.g. "whatsapp:+18601234567,whatsapp:+18609876543"
// Falls back to the two hardcoded numbers if the env var is not set.
const OWNER_WHATSAPP_TO = process.env.OWNER_WHATSAPP_TO
  ? process.env.OWNER_WHATSAPP_TO.split(',').map(n => n.trim()).filter(Boolean)
  : ['whatsapp:+18604250751', 'whatsapp:+18603675091'];

function formatDatetime(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch (_) {
    return isoString;
  }
}

/**
 * Send a WhatsApp notification to the salon owner when a booking is confirmed.
 * @param {Object} opts
 * @param {string} opts.name                  - Client name
 * @param {string} opts.phone                 - Client phone
 * @param {string} opts.email                 - Client email
 * @param {string} opts.bookingReference
 * @param {string} opts.appointmentDatetime   - ISO string
 * @param {string} opts.selectedStyle
 * @param {number} opts.duration              - minutes
 * @param {number} opts.totalPrice
 * @param {number} opts.depositPaid
 * @param {string} [opts.notes]
 * @param {string} [opts.currentHairImageUrl] - Public URL of current hair photo
 * @param {string} [opts.referenceImageUrl]   - Public URL of reference photo
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendOwnerWhatsAppNotification(opts) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('WhatsApp: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set, skipping notification');
    return { success: false, error: 'Twilio not configured' };
  }
  if (!OWNER_WHATSAPP_TO || OWNER_WHATSAPP_TO.length === 0) {
    console.warn('WhatsApp: no recipient numbers configured, skipping notification');
    return { success: false, error: 'No recipient numbers configured' };
  }

  const durationHours = opts.duration ? Math.floor(opts.duration / 60) : 0;
  const durationMins = opts.duration ? opts.duration % 60 : 0;
  const durationStr = durationHours > 0
    ? `${durationHours}h${durationMins > 0 ? ` ${durationMins}m` : ''}`
    : `${durationMins}m`;

  const message = [
    `📅 *New Booking Confirmed!*`,
    ``,
    `*Client:* ${opts.name || '—'}`,
    `*Phone:* ${opts.phone || '—'}`,
    `*Email:* ${opts.email || '—'}`,
    ``,
    `*Service:* ${opts.selectedStyle || '—'}`,
    `*Date & Time:* ${formatDatetime(opts.appointmentDatetime)}`,
    `*Duration:* ${durationStr}`,
    ``,
    `*Total Price:* $${(opts.totalPrice || 0).toFixed(2)}`,
    `*Deposit Paid:* $${(opts.depositPaid || 0).toFixed(2)}`,
    `*Booking ID:* ${opts.bookingReference || '—'}`,
    opts.notes ? `\n*Notes:* ${opts.notes}` : '',
  ].filter(line => line !== undefined).join('\n');

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Send to all recipient numbers
    for (const recipientTo of OWNER_WHATSAPP_TO) {
      // Message 1: booking info text only
      await client.messages.create({
        from: TWILIO_WHATSAPP_FROM,
        to: recipientTo,
        body: message,
      });

      // Message 2: current hair photo
      if (opts.currentHairImageUrl) {
        await client.messages.create({
          from: TWILIO_WHATSAPP_FROM,
          to: recipientTo,
          body: `📸 *Current Hair — ${opts.name || 'Client'}*`,
          mediaUrl: [opts.currentHairImageUrl],
        });
      }

      // Message 3: reference/inspo image
      if (opts.referenceImageUrl) {
        await client.messages.create({
          from: TWILIO_WHATSAPP_FROM,
          to: recipientTo,
          body: `✨ *Reference / Inspo Image — ${opts.name || 'Client'}*`,
          mediaUrl: [opts.referenceImageUrl],
        });
      }
    }

    console.log(`WhatsApp notification sent to ${OWNER_WHATSAPP_TO.length} recipient(s)`);
    return { success: true };
  } catch (e) {
    console.error('WhatsApp send error:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Notify owner that a booking was rescheduled.
 */
async function sendOwnerRescheduleNotification(opts) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return { success: false, error: 'Twilio not configured' };
  if (!OWNER_WHATSAPP_TO || OWNER_WHATSAPP_TO.length === 0) return { success: false, error: 'No recipients' };

  const durationHours = opts.duration ? Math.floor(opts.duration / 60) : 0;
  const durationMins  = opts.duration ? opts.duration % 60 : 0;
  const durationStr   = durationHours > 0
    ? `${durationHours}h${durationMins > 0 ? ` ${durationMins}m` : ''}`
    : `${durationMins}m`;

  const message = [
    `🔄🔄 *BOOKING RESCHEDULED* 🔄🔄`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `*Client:* ${opts.name || '—'}`,
    `*Phone:* ${opts.phone || '—'}`,
    `*Email:* ${opts.email || '—'}`,
    ``,
    `*Service:* ${opts.selectedStyle || '—'}`,
    opts.duration ? `*Duration:* ${durationStr}` : '',
    ``,
    `📅 *OLD DATE:* ${formatDatetime(opts.oldDatetime)}`,
    `📅 *NEW DATE:* ${formatDatetime(opts.newDatetime)}`,
    ``,
    `*Total Price:* $${(opts.totalPrice || 0).toFixed(2)}`,
    `*Deposit Paid:* $${(opts.depositPaid || 0).toFixed(2)}`,
    `*Booking ID:* ${opts.bookingReference || '—'}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `🔄 *THIS BOOKING WAS RESCHEDULED* 🔄`,
  ].filter(l => l !== undefined).join('\n');

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    for (const recipientTo of OWNER_WHATSAPP_TO) {
      await client.messages.create({ from: TWILIO_WHATSAPP_FROM, to: recipientTo, body: message });

      if (opts.currentHairImageUrl) {
        await client.messages.create({
          from: TWILIO_WHATSAPP_FROM,
          to: recipientTo,
          body: `📸 *Current Hair — ${opts.name || 'Client'}*`,
          mediaUrl: [opts.currentHairImageUrl],
        });
      }

      if (opts.referenceImageUrl) {
        await client.messages.create({
          from: TWILIO_WHATSAPP_FROM,
          to: recipientTo,
          body: `✨ *Reference / Inspo Image — ${opts.name || 'Client'}*`,
          mediaUrl: [opts.referenceImageUrl],
        });
      }
    }
    console.log(`WhatsApp reschedule notification sent to ${OWNER_WHATSAPP_TO.length} recipient(s)`);
    return { success: true };
  } catch (e) {
    console.error('WhatsApp reschedule notification error:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Notify owner that a booking was cancelled.
 */
async function sendOwnerCancelNotification(opts) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return { success: false, error: 'Twilio not configured' };
  if (!OWNER_WHATSAPP_TO || OWNER_WHATSAPP_TO.length === 0) return { success: false, error: 'No recipients' };

  const durationHours = opts.duration ? Math.floor(opts.duration / 60) : 0;
  const durationMins  = opts.duration ? opts.duration % 60 : 0;
  const durationStr   = durationHours > 0
    ? `${durationHours}h${durationMins > 0 ? ` ${durationMins}m` : ''}`
    : `${durationMins}m`;

  const message = [
    `❌❌ *BOOKING CANCELLED* ❌❌`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `*Client:* ${opts.name || '—'}`,
    `*Phone:* ${opts.phone || '—'}`,
    `*Email:* ${opts.email || '—'}`,
    ``,
    `*Service:* ${opts.selectedStyle || '—'}`,
    opts.duration ? `*Duration:* ${durationStr}` : '',
    `*Was scheduled:* ${formatDatetime(opts.appointmentDatetime)}`,
    ``,
    `*Total Price:* $${(opts.totalPrice || 0).toFixed(2)}`,
    `*Deposit Paid:* $${(opts.depositPaid || 0).toFixed(2)}`,
    `*Booking ID:* ${opts.bookingReference || '—'}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `❌ *THIS BOOKING HAS BEEN CANCELLED* ❌`,
  ].filter(l => l !== undefined).join('\n');

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    for (const recipientTo of OWNER_WHATSAPP_TO) {
      await client.messages.create({ from: TWILIO_WHATSAPP_FROM, to: recipientTo, body: message });

      if (opts.currentHairImageUrl) {
        await client.messages.create({
          from: TWILIO_WHATSAPP_FROM,
          to: recipientTo,
          body: `📸 *Current Hair — ${opts.name || 'Client'}*`,
          mediaUrl: [opts.currentHairImageUrl],
        });
      }

      if (opts.referenceImageUrl) {
        await client.messages.create({
          from: TWILIO_WHATSAPP_FROM,
          to: recipientTo,
          body: `✨ *Reference / Inspo Image — ${opts.name || 'Client'}*`,
          mediaUrl: [opts.referenceImageUrl],
        });
      }
    }
    console.log(`WhatsApp cancel notification sent to ${OWNER_WHATSAPP_TO.length} recipient(s)`);
    return { success: true };
  } catch (e) {
    console.error('WhatsApp cancel notification error:', e.message);
    return { success: false, error: e.message };
  }
}

module.exports = { sendOwnerWhatsAppNotification, sendOwnerRescheduleNotification, sendOwnerCancelNotification };
