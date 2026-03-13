const path = require('path');
const fs = require('fs');
const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'Maya African Hair Braiding <onboarding@resend.dev>';

let templateHtml = null;
function getTemplateHtml() {
  if (templateHtml) return templateHtml;
  const templatePath = path.join(__dirname, 'emails', 'maya-booking-confirmation.html');
  templateHtml = fs.readFileSync(templatePath, 'utf8');
  return templateHtml;
}

function formatAppointmentDatetime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch (_) {
    return isoString;
  }
}

/**
 * Send booking confirmation email via Resend.
 * @param {Object} opts
 * @param {string} opts.to - Recipient email
 * @param {string} opts.customerName
 * @param {string} opts.bookingReference
 * @param {string} opts.appointmentDatetime - ISO string
 * @param {number} opts.depositPaid - e.g. 25.00
 * @param {string} opts.selectedStyle
 * @param {string} opts.duration - e.g. "2 hours"
 * @param {string} opts.notes
 * @param {string} opts.lookupBookingUrl - e.g. https://site.com/cancel.html?bookingId=XXX
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendBookingConfirmation(opts) {
  if (!RESEND_API_KEY || !RESEND_API_KEY.startsWith('re_')) {
    console.warn('Resend: RESEND_API_KEY not set or invalid, skipping confirmation email');
    return { success: false, error: 'Resend not configured' };
  }

  const html = getTemplateHtml()
    .replace(/\{\{CUSTOMER_NAME\}\}/g, (opts.customerName || '').trim() || 'there')
    .replace(/\{\{BOOKING_REFERENCE\}\}/g, opts.bookingReference || '—')
    .replace(/\{\{APPOINTMENT_DATETIME\}\}/g, formatAppointmentDatetime(opts.appointmentDatetime))
    .replace(/\{\{DEPOSIT_PAID\}\}/g, typeof opts.depositPaid === 'number' ? `$${opts.depositPaid.toFixed(2)}` : (opts.depositPaid || '—'))
    .replace(/\{\{SELECTED_STYLE\}\}/g, opts.selectedStyle || '—')
    .replace(/\{\{DURATION\}\}/g, opts.duration || '—')
    .replace(/\{\{NOTES\}\}/g, (opts.notes || '').trim() || '—')
    .replace(/\{\{CUSTOMER_EMAIL\}\}/g, opts.to || '')
    .replace(/\{\{LOOKUP_BOOKING_URL\}\}/g, opts.lookupBookingUrl || '#');

  try {
    const resend = new Resend(RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: opts.to,
      subject: 'Booking confirmed — Maya African Hair Braiding',
      html,
    });
    if (error) {
      console.error('Resend send error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error('Resend exception:', e);
    return { success: false, error: e.message };
  }
}

module.exports = { sendBookingConfirmation };
