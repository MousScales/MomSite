const BLOOIO_API_KEY = (process.env.BLOOIO_API_KEY || '').trim();
const BLOOIO_FROM_NUMBER = (process.env.BLOOIO_FROM_NUMBER || process.env.BLOOIO_FROM || '').trim();
const BLOOIO_API_BASE = (process.env.BLOOIO_API_BASE || 'https://backend.blooio.com/v2/api').replace(/\/$/, '');

// Salon owner alert number(s). Comma/semicolon/newline separated. Default: client-provided line.
const DEFAULT_OWNER_SMS_TO = '+18694250751';
const OWNER_SMS_TO = (process.env.OWNER_SMS_TO || DEFAULT_OWNER_SMS_TO)
  .split(/[,;\n]/)
  .map((n) => normalizePhoneNumber(n))
  .filter(Boolean);

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

function formatDuration(minutes) {
  const total = parseInt(minutes, 10);
  if (!total || Number.isNaN(total)) return '—';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return null;
  const cleaned = String(rawPhone).trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

function formatOptionalLine(label, value) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  if (!text) return null;
  return `${label}: ${text}`;
}

function buildBookingDetailsLines(opts) {
  const formattedDate = formatDatetime(opts.appointmentDatetime);
  const durationStr = formatDuration(opts.duration);

  const lines = [
    `Ref: ${opts.bookingReference || '—'}`,
    `Client: ${opts.name || '—'}`,
    `Phone: ${opts.phone || '—'}`,
    `Email: ${opts.email || '—'}`,
    `Service: ${opts.selectedStyle || '—'}`,
    formatOptionalLine('Hair length', opts.hairLength),
    formatOptionalLine('Hair option', opts.hairOption),
    formatOptionalLine('Pre-wash', opts.preWashOption),
    formatOptionalLine('Detangling', opts.detanglingOption),
    formatOptionalLine('Box braids style', opts.boxBraidsVariation),
    formatOptionalLine('Cornrows style', opts.cornrowsVariation),
    formatOptionalLine('Twists style', opts.twoStrandTwistsVariation),
    `Date: ${formattedDate}`,
    `Duration: ${durationStr}`,
    `Total: $${Number(opts.totalPrice || 0).toFixed(2)} | Deposit paid: $${Number(opts.depositPaid || 0).toFixed(2)}`,
    `Notes: ${(opts.notes || '').trim() || '—'}`,
  ].filter(Boolean);

  if (opts.currentHairImageUrl) {
    lines.push(`Current hair photo: ${opts.currentHairImageUrl}`);
  }
  if (opts.referenceImageUrl) {
    lines.push(`Reference photo: ${opts.referenceImageUrl}`);
  }

  return lines;
}

function buildCustomerConfirmationLines(opts) {
  const formattedDate = formatDatetime(opts.appointmentDatetime);
  const durationStr = formatDuration(opts.duration);
  const customerName = (opts.name || '').trim();

  const lines = [
    customerName ? `Hi ${customerName},` : 'Hi,',
    '',
    'Your booking is confirmed!',
    '',
    `Ref: ${opts.bookingReference || '—'}`,
    `Service: ${opts.selectedStyle || '—'}`,
    formatOptionalLine('Hair length', opts.hairLength),
    formatOptionalLine('Hair option', opts.hairOption),
    formatOptionalLine('Pre-wash', opts.preWashOption),
    formatOptionalLine('Detangling', opts.detanglingOption),
    formatOptionalLine('Box braids style', opts.boxBraidsVariation),
    formatOptionalLine('Cornrows style', opts.cornrowsVariation),
    formatOptionalLine('Twists style', opts.twoStrandTwistsVariation),
    `Date: ${formattedDate}`,
    `Duration: ${durationStr}`,
    `Total: $${Number(opts.totalPrice || 0).toFixed(2)}`,
    `Deposit paid: $${Number(opts.depositPaid || 0).toFixed(2)}`,
  ].filter(Boolean);

  const notes = (opts.notes || '').trim();
  if (notes) {
    lines.push(`Notes: ${notes}`);
  }
  if (opts.lookupBookingUrl) {
    lines.push('', `Manage booking: ${opts.lookupBookingUrl}`);
  }

  lines.push('', 'Thank you — Maya African Hair Braiding');
  return lines;
}

function buildCustomerConfirmationMessage(opts) {
  const lines = [
    'Maya African Hair Braiding',
    '',
    ...buildCustomerConfirmationLines(opts),
  ];
  return lines.join('\n');
}

function buildBookingMessage(opts) {
  const lines = [
    'New booking — Maya African Hair Braiding',
    '',
    ...buildBookingDetailsLines(opts),
  ];
  return lines.join('\n');
}

function buildRescheduleMessage(opts) {
  const oldFormatted = formatDatetime(opts.oldDatetime);
  const newFormatted = formatDatetime(opts.newDatetime);
  const durationStr = formatDuration(opts.duration);

  const lines = [
    'Booking rescheduled — Maya African Hair Braiding',
    '',
    `Ref: ${opts.bookingReference || '—'}`,
    `Client: ${opts.name || '—'}`,
    `Phone: ${opts.phone || '—'}`,
    `Email: ${opts.email || '—'}`,
    `Service: ${opts.selectedStyle || '—'}`,
    `Was: ${oldFormatted}`,
    `Now: ${newFormatted}`,
    `Duration: ${durationStr}`,
    `Total: $${Number(opts.totalPrice || 0).toFixed(2)} | Deposit paid: $${Number(opts.depositPaid || 0).toFixed(2)}`,
  ];
  return lines.join('\n');
}

function buildCancelMessage(opts) {
  const formattedDate = formatDatetime(opts.appointmentDatetime);
  const durationStr = formatDuration(opts.duration);

  const lines = [
    'Booking cancelled — Maya African Hair Braiding',
    '',
    `Ref: ${opts.bookingReference || '—'}`,
    `Client: ${opts.name || '—'}`,
    `Phone: ${opts.phone || '—'}`,
    `Email: ${opts.email || '—'}`,
    `Service: ${opts.selectedStyle || '—'}`,
    `Was scheduled: ${formattedDate}`,
    `Duration: ${durationStr}`,
    `Total: $${Number(opts.totalPrice || 0).toFixed(2)} | Deposit paid: $${Number(opts.depositPaid || 0).toFixed(2)}`,
  ];
  return lines.join('\n');
}

async function sendBlooioMessage(to, text, idempotencyKey) {
  const chatId = encodeURIComponent(to);
  const payload = { text };
  if (BLOOIO_FROM_NUMBER) {
    payload.from_number = BLOOIO_FROM_NUMBER;
  }

  const headers = {
    Authorization: `Bearer ${BLOOIO_API_KEY}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch(`${BLOOIO_API_BASE}/chats/${chatId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    data = {};
  }

  if (res.status !== 202 && res.status !== 200 && !res.ok) {
    const reason = data.message || data.error || data.detail || `HTTP ${res.status}`;
    throw new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
  }

  return { success: true, messageId: data.message_id || data.id || null };
}

async function sendOwnerSms(text, idempotencyKey) {
  if (!BLOOIO_API_KEY) {
    console.warn('Blooio: BLOOIO_API_KEY not set, skipping owner SMS');
    return { success: false, error: 'Blooio not configured' };
  }
  if (!OWNER_SMS_TO.length) {
    console.warn('Blooio: no OWNER_SMS_TO recipients configured, skipping owner SMS');
    return { success: false, error: 'No owner SMS recipients configured' };
  }

  let sentCount = 0;
  const issues = [];

  for (const recipient of OWNER_SMS_TO) {
    const key = idempotencyKey ? `${idempotencyKey}:${recipient}` : undefined;
    try {
      await sendBlooioMessage(recipient, text, key);
      sentCount += 1;
    } catch (e) {
      issues.push(`${recipient}: ${e?.message || 'send failed'}`);
    }
  }

  if (sentCount === 0) {
    const error = issues.join(' | ').slice(0, 500) || 'All Blooio sends failed';
    console.error('Blooio owner SMS failed for all recipients:', error);
    return { success: false, error };
  }

  if (issues.length > 0) {
    const warning = issues.join(' | ').slice(0, 500);
    console.warn('Blooio owner SMS sent with some issues:', warning);
    return { success: true, warning };
  }

  console.log(`Blooio owner SMS sent to ${sentCount} recipient(s)`);
  return { success: true };
}

/**
 * Send owner SMS/iMessage when a booking is confirmed.
 */
async function sendOwnerBookingSms(opts) {
  const text = buildBookingMessage(opts);
  const idempotencyKey = opts.bookingReference
    ? `booking:${opts.bookingReference}`
    : undefined;
  return sendOwnerSms(text, idempotencyKey);
}

/**
 * Send owner SMS/iMessage when a booking is rescheduled.
 */
async function sendOwnerRescheduleSms(opts) {
  const text = buildRescheduleMessage(opts);
  const idempotencyKey = opts.bookingReference
    ? `reschedule:${opts.bookingReference}:${opts.newDatetime || ''}`
    : undefined;
  return sendOwnerSms(text, idempotencyKey);
}

/**
 * Send owner SMS/iMessage when a booking is cancelled.
 */
async function sendOwnerCancelSms(opts) {
  const text = buildCancelMessage(opts);
  const idempotencyKey = opts.bookingReference
    ? `cancel:${opts.bookingReference}`
    : undefined;
  return sendOwnerSms(text, idempotencyKey);
}

/**
 * Send booking confirmation SMS/iMessage to the customer.
 */
async function sendCustomerBookingSms(opts) {
  if (!BLOOIO_API_KEY) {
    console.warn('Blooio: BLOOIO_API_KEY not set, skipping customer SMS');
    return { success: false, error: 'Blooio not configured' };
  }

  const to = normalizePhoneNumber(opts.phone);
  if (!to) {
    console.warn('Blooio: customer phone invalid/missing, skipping customer SMS');
    return { success: false, error: 'Invalid customer phone number' };
  }

  const text = buildCustomerConfirmationMessage(opts);
  const idempotencyKey = opts.bookingReference
    ? `customer:${opts.bookingReference}`
    : undefined;

  try {
    await sendBlooioMessage(to, text, idempotencyKey);
    console.log(`Blooio customer SMS sent to ${to}`);
    return { success: true };
  } catch (e) {
    console.error('Blooio customer SMS error:', e.message);
    return { success: false, error: e.message };
  }
}

module.exports = {
  sendOwnerBookingSms,
  sendOwnerRescheduleSms,
  sendOwnerCancelSms,
  sendCustomerBookingSms,
};
