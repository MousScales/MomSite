const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN || '';
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM || process.env.TWILIO_PHONE_NUMBER || '';
const TWILIO_WHATSAPP_TEMPLATE_SID = (
  process.env.TWILIO_WHATSAPP_TEMPLATE_SID ||
  process.env.TWILIO_WHATSAPP_BOOKING_TEMPLATE_SID ||
  ''
).trim();
const TWILIO_WHATSAPP_RESCHEDULE_TEMPLATE_SID = (
  process.env.TWILIO_WHATSAPP_RESCHEDULE_TEMPLATE_SID ||
  process.env.TWILIO_WHATSAPP_RESCHEDULED_TEMPLATE_SID ||
  ''
).trim();
const TWILIO_WHATSAPP_CANCEL_TEMPLATE_SID = (
  process.env.TWILIO_WHATSAPP_CANCEL_TEMPLATE_SID ||
  process.env.TWILIO_WHATSAPP_CANCELLED_TEMPLATE_SID ||
  ''
).trim();
const TWILIO_WHATSAPP_MEDIA_TEMPLATE_SID = (
  process.env.TWILIO_WHATSAPP_MEDIA_TEMPLATE_SID ||
  process.env.TWILIO_WHATSAPP_BOOKING_MEDIA_TEMPLATE_SID ||
  ''
).trim();
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

const TWILIO_WHATSAPP_FROM = normalizeWhatsAppAddress(process.env.TWILIO_WHATSAPP_FROM);

// Numbers that receive booking notifications.
// OWNER_WHATSAPP_TO can be a comma/semicolon/newline separated list.
const OWNER_WHATSAPP_TO = process.env.OWNER_WHATSAPP_TO
  ? process.env.OWNER_WHATSAPP_TO
    .split(/[,;\n]/)
    .map(n => normalizeWhatsAppAddress(n))
    .filter(Boolean)
  : [];

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

function buildBookingTemplateVariables(opts, formattedDate, durationStr) {
  return JSON.stringify({
    '1': String(opts.name || 'N/A'),
    '2': String(opts.phone || 'N/A'),
    '3': String(opts.email || 'N/A'),
    '4': String(opts.selectedStyle || 'N/A'),
    '5': String(formattedDate || 'N/A'),
    '6': String(durationStr || 'N/A'),
    '7': Number(opts.totalPrice || 0).toFixed(2),
    '8': Number(opts.depositPaid || 0).toFixed(2),
    '9': String(opts.bookingReference || 'N/A'),
    '10': String((opts.notes || '').trim() || '-'),
  });
}

function buildBookingMediaTemplateVariables(opts, imageLabel, imageUrl) {
  return JSON.stringify({
    '1': String(imageUrl || ''),
    '2': String(opts.name || 'N/A'),
    '3': String(opts.bookingReference || 'N/A'),
    '4': String(imageLabel || 'Booking image'),
    '5': String(imageUrl || ''),
  });
}

function buildRescheduleTemplateVariables(opts, oldFormattedDate, newFormattedDate, durationStr) {
  return JSON.stringify({
    '1': String(opts.name || 'N/A'),
    '2': String(opts.phone || 'N/A'),
    '3': String(opts.email || 'N/A'),
    '4': String(opts.selectedStyle || 'N/A'),
    '5': String(oldFormattedDate || 'N/A'),
    '6': String(newFormattedDate || 'N/A'),
    '7': String(durationStr || 'N/A'),
    '8': Number(opts.totalPrice || 0).toFixed(2),
    '9': Number(opts.depositPaid || 0).toFixed(2),
    '10': String(opts.bookingReference || 'N/A'),
  });
}

function buildCancelTemplateVariables(opts, formattedDate, durationStr) {
  return JSON.stringify({
    '1': String(opts.name || 'N/A'),
    '2': String(opts.phone || 'N/A'),
    '3': String(opts.email || 'N/A'),
    '4': String(opts.selectedStyle || 'N/A'),
    '5': String(formattedDate || 'N/A'),
    '6': String(durationStr || 'N/A'),
    '7': Number(opts.totalPrice || 0).toFixed(2),
    '8': Number(opts.depositPaid || 0).toFixed(2),
    '9': String(opts.bookingReference || 'N/A'),
  });
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
  const formattedDate = formatDatetime(opts.appointmentDatetime);

  if (!TWILIO_WHATSAPP_TEMPLATE_SID) {
    return { success: false, error: 'TWILIO_WHATSAPP_TEMPLATE_SID is required for template-only mode' };
  }
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  let sentCount = 0;
  const issues = [];

  // Send to all recipient numbers; a single failure should not stop all notifications.
  for (const recipientTo of OWNER_WHATSAPP_TO) {
    try {
      await client.messages.create({
        from: TWILIO_WHATSAPP_FROM,
        to: recipientTo,
        contentSid: TWILIO_WHATSAPP_TEMPLATE_SID,
        contentVariables: buildBookingTemplateVariables(opts, formattedDate, durationStr),
      });
      sentCount += 1;
    } catch (e) {
      const reason = e?.message || 'Unknown error';
      issues.push(`${recipientTo}: ${reason}`);
      continue;
    }

    if (TWILIO_WHATSAPP_MEDIA_TEMPLATE_SID && opts.currentHairImageUrl) {
      try {
        await client.messages.create({
          from: TWILIO_WHATSAPP_FROM,
          to: recipientTo,
          contentSid: TWILIO_WHATSAPP_MEDIA_TEMPLATE_SID,
          contentVariables: buildBookingMediaTemplateVariables(
            opts,
            'Current Hair',
            opts.currentHairImageUrl,
          ),
        });
      } catch (e) {
        issues.push(`${recipientTo} current hair media template: ${e?.message || 'send failed'}`);
      }
    }

    if (TWILIO_WHATSAPP_MEDIA_TEMPLATE_SID && opts.referenceImageUrl) {
      try {
        await client.messages.create({
          from: TWILIO_WHATSAPP_FROM,
          to: recipientTo,
          contentSid: TWILIO_WHATSAPP_MEDIA_TEMPLATE_SID,
          contentVariables: buildBookingMediaTemplateVariables(
            opts,
            'Reference Image',
            opts.referenceImageUrl,
          ),
        });
      } catch (e) {
        issues.push(`${recipientTo} reference media template: ${e?.message || 'send failed'}`);
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
  if (!TWILIO_WHATSAPP_FROM) return { success: false, error: 'WhatsApp sender not configured' };
  if (!OWNER_WHATSAPP_TO || OWNER_WHATSAPP_TO.length === 0) return { success: false, error: 'No recipients' };
  if (!TWILIO_WHATSAPP_RESCHEDULE_TEMPLATE_SID) {
    return { success: false, error: 'TWILIO_WHATSAPP_RESCHEDULE_TEMPLATE_SID is required for template-only mode' };
  }

  const durationHours = opts.duration ? Math.floor(opts.duration / 60) : 0;
  const durationMins  = opts.duration ? opts.duration % 60 : 0;
  const durationStr   = durationHours > 0
    ? `${durationHours}h${durationMins > 0 ? ` ${durationMins}m` : ''}`
    : `${durationMins}m`;
  const oldFormattedDate = formatDatetime(opts.oldDatetime);
  const newFormattedDate = formatDatetime(opts.newDatetime);

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    for (const recipientTo of OWNER_WHATSAPP_TO) {
      await client.messages.create({
        from: TWILIO_WHATSAPP_FROM,
        to: recipientTo,
        contentSid: TWILIO_WHATSAPP_RESCHEDULE_TEMPLATE_SID,
        contentVariables: buildRescheduleTemplateVariables(opts, oldFormattedDate, newFormattedDate, durationStr),
      });
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
  if (!TWILIO_WHATSAPP_FROM) return { success: false, error: 'WhatsApp sender not configured' };
  if (!OWNER_WHATSAPP_TO || OWNER_WHATSAPP_TO.length === 0) return { success: false, error: 'No recipients' };
  if (!TWILIO_WHATSAPP_CANCEL_TEMPLATE_SID) {
    return { success: false, error: 'TWILIO_WHATSAPP_CANCEL_TEMPLATE_SID is required for template-only mode' };
  }

  const durationHours = opts.duration ? Math.floor(opts.duration / 60) : 0;
  const durationMins  = opts.duration ? opts.duration % 60 : 0;
  const durationStr   = durationHours > 0
    ? `${durationHours}h${durationMins > 0 ? ` ${durationMins}m` : ''}`
    : `${durationMins}m`;
  const formattedDate = formatDatetime(opts.appointmentDatetime);

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    for (const recipientTo of OWNER_WHATSAPP_TO) {
      await client.messages.create({
        from: TWILIO_WHATSAPP_FROM,
        to: recipientTo,
        contentSid: TWILIO_WHATSAPP_CANCEL_TEMPLATE_SID,
        contentVariables: buildCancelTemplateVariables(opts, formattedDate, durationStr),
      });
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
