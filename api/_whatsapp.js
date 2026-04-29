const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM || process.env.TWILIO_PHONE_NUMBER || '';
// Your Twilio WhatsApp sender — sandbox: 'whatsapp:+14155238886'
// Production (after approval): 'whatsapp:+1YOURNUMBER'
function normalizeWhatsAppAddress(rawValue) {
  if (!rawValue) return '';
  const value = String(rawValue).trim();
  if (!value) return '';
  if (value.startsWith('whatsapp:')) return value;
  const normalizedPhone = normalizePhoneNumber(value);
  return normalizedPhone ? `whatsapp:${normalizedPhone}` : '';
}

const TWILIO_WHATSAPP_FROM = normalizeWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM) || 'whatsapp:+14155238886';

// Numbers that receive booking notifications.
// OWNER_WHATSAPP_TO can be a comma-separated list, e.g. "whatsapp:+18601234567,whatsapp:+18609876543"
// Falls back to the two hardcoded numbers if the env var is not set.
const OWNER_WHATSAPP_TO = process.env.OWNER_WHATSAPP_TO
  ? process.env.OWNER_WHATSAPP_TO
    .split(',')
    .map(n => normalizeWhatsAppAddress(n))
    .filter(Boolean)
  : ['whatsapp:+18604250751', 'whatsapp:+18603675091', 'whatsapp:+12037100568'];

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

function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return null;
  const cleaned = String(rawPhone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
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
  if (!TWILIO_WHATSAPP_FROM) {
    console.warn('WhatsApp: TWILIO_WHATSAPP_FROM not set or invalid, skipping notification');
    return { success: false, error: 'WhatsApp sender not configured' };
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

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  let sentCount = 0;
  const issues = [];

  // Send to all recipient numbers; a single failure should not stop all notifications.
  for (const recipientTo of OWNER_WHATSAPP_TO) {
    try {
      await client.messages.create({
        from: TWILIO_WHATSAPP_FROM,
        to: recipientTo,
        body: message,
      });
      sentCount += 1;
    } catch (e) {
      const reason = e?.message || 'Unknown error';
      issues.push(`${recipientTo}: ${reason}`);
      continue;
    }

    if (opts.currentHairImageUrl) {
      try {
        await client.messages.create({
          from: TWILIO_WHATSAPP_FROM,
          to: recipientTo,
          body: `📸 *Current Hair — ${opts.name || 'Client'}*`,
          mediaUrl: [opts.currentHairImageUrl],
        });
      } catch (e) {
        issues.push(`${recipientTo} current hair image: ${e?.message || 'media send failed'}`);
      }
    }

    if (opts.referenceImageUrl) {
      try {
        await client.messages.create({
          from: TWILIO_WHATSAPP_FROM,
          to: recipientTo,
          body: `✨ *Reference / Inspo Image — ${opts.name || 'Client'}*`,
          mediaUrl: [opts.referenceImageUrl],
        });
      } catch (e) {
        issues.push(`${recipientTo} reference image: ${e?.message || 'media send failed'}`);
      }
    }
  }

  if (sentCount === 0) {
    const error = issues.join(' | ').slice(0, 500) || 'All WhatsApp sends failed';
    console.error('WhatsApp send failed for all recipients:', error);
    return { success: false, error };
  }

  if (issues.length > 0) {
    const warning = issues.join(' | ').slice(0, 500);
    console.warn('WhatsApp sent with some issues:', warning);
    return { success: true, warning };
  }

  console.log(`WhatsApp notification sent to ${sentCount} recipient(s)`);
  return { success: true };
}

/**
 * Send SMS confirmation directly to customer.
 * Uses TWILIO_SMS_FROM (or TWILIO_PHONE_NUMBER) as sender.
 */
async function sendCustomerSmsConfirmation(opts) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('SMS: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set, skipping customer SMS');
    return { success: false, error: 'Twilio not configured' };
  }
  if (!TWILIO_SMS_FROM) {
    console.warn('SMS: TWILIO_SMS_FROM (or TWILIO_PHONE_NUMBER) is not set, skipping customer SMS');
    return { success: false, error: 'SMS sender not configured' };
  }

  const to = normalizePhoneNumber(opts.phone);
  if (!to) {
    console.warn('SMS: customer phone number invalid/missing, skipping customer SMS');
    return { success: false, error: 'Invalid customer phone number' };
  }

  const message = [
    `Maya African Hair Braiding: your booking is confirmed.`,
    `Ref: ${opts.bookingReference || '—'}`,
    `Service: ${opts.selectedStyle || '—'}`,
    `When: ${formatDatetime(opts.appointmentDatetime)}`,
    `Deposit paid: $${(opts.depositPaid || 0).toFixed(2)}`,
  ].join('\n');

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({
      from: TWILIO_SMS_FROM,
      to,
      body: message,
    });
    return { success: true };
  } catch (e) {
    console.error('SMS send error:', e.message);
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

    }
    console.log(`WhatsApp cancel notification sent to ${OWNER_WHATSAPP_TO.length} recipient(s)`);
    return { success: true };
  } catch (e) {
    console.error('WhatsApp cancel notification error:', e.message);
    return { success: false, error: e.message };
  }
}

module.exports = {
  sendOwnerWhatsAppNotification,
  sendCustomerSmsConfirmation,
  sendOwnerRescheduleNotification,
  sendOwnerCancelNotification,
};
