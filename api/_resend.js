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

/**
 * Send a reschedule confirmation email to the client.
 */
async function sendRescheduleConfirmation(opts) {
  if (!RESEND_API_KEY || !RESEND_API_KEY.startsWith('re_')) {
    console.warn('Resend: not configured, skipping reschedule email');
    return { success: false, error: 'Resend not configured' };
  }

  const html = `
  <!doctype html>
  <html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Appointment Rescheduled — Maya African Hair Braiding</title>
  </head>
  <body style="margin:0;padding:0;background:#faf8f5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#2d2d2d;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf8f5;">
      <tr><td align="center" style="padding:28px 12px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;border:1px solid #ebe5dd;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr><td style="padding:22px 24px;background:linear-gradient(180deg,rgba(184,134,78,0.08),rgba(255,255,255,0));border-bottom:1px solid #ebe5dd;">
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:700;color:#1a1a1a;">Maya African Hair Braiding</div>
            <div style="font-size:12px;color:#6b6b6b;margin-top:2px;">Expert braids · New London, CT</div>
          </td></tr>
          <!-- Banner -->
          <tr><td align="center" style="padding:28px 24px 16px;background:linear-gradient(135deg,#1a6fc4,#2e86de);">
            <div style="font-size:32px;margin-bottom:8px;">🔄</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#fff;">Appointment Rescheduled</div>
            <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">Hi ${opts.customerName || 'there'}, your appointment has been moved.</div>
          </td></tr>
          <!-- Details -->
          <tr><td style="padding:24px 32px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f6f2;border-radius:10px;padding:20px;border:1px solid #ebe5dd;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebe5dd;">
                <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Booking ID</span><br>
                <span style="font-size:15px;font-weight:700;color:#b8864e;">${opts.bookingReference || '—'}</span>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebe5dd;">
                <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Service</span><br>
                <span style="font-size:15px;font-weight:600;">${opts.selectedStyle || '—'}</span>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebe5dd;">
                <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Old Date</span><br>
                <span style="font-size:15px;font-weight:600;color:#888;text-decoration:line-through;">${formatAppointmentDatetime(opts.oldDatetime)}</span>
              </td></tr>
              <tr><td style="padding:8px 0;">
                <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">New Date</span><br>
                <span style="font-size:16px;font-weight:700;color:#1a6fc4;">${formatAppointmentDatetime(opts.newDatetime)}</span>
              </td></tr>
            </table>
            <p style="font-size:13px;color:#888;margin:20px 0 0;">Your deposit remains on file. See you soon!</p>
          </td></tr>
          <!-- Footer -->
          <tr><td style="padding:16px 24px;background:#f9f6f2;border-top:1px solid #ebe5dd;text-align:center;font-size:12px;color:#aaa;">
            Maya African Hair Braiding · New London, CT · Questions? Reply to this email.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;

  try {
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to: opts.to,
      subject: 'Your appointment has been rescheduled — Maya African Hair Braiding',
      html,
    });
    if (error) { console.error('Resend reschedule email error:', error); return { success: false, error: error.message }; }
    return { success: true };
  } catch (e) {
    console.error('Resend reschedule exception:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Send a cancellation confirmation email to the client.
 */
async function sendCancelConfirmation(opts) {
  if (!RESEND_API_KEY || !RESEND_API_KEY.startsWith('re_')) {
    console.warn('Resend: not configured, skipping cancel email');
    return { success: false, error: 'Resend not configured' };
  }

  const html = `
  <!doctype html>
  <html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Appointment Cancelled — Maya African Hair Braiding</title>
  </head>
  <body style="margin:0;padding:0;background:#faf8f5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#2d2d2d;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf8f5;">
      <tr><td align="center" style="padding:28px 12px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;border:1px solid #ebe5dd;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr><td style="padding:22px 24px;background:linear-gradient(180deg,rgba(184,134,78,0.08),rgba(255,255,255,0));border-bottom:1px solid #ebe5dd;">
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:700;color:#1a1a1a;">Maya African Hair Braiding</div>
            <div style="font-size:12px;color:#6b6b6b;margin-top:2px;">Expert braids · New London, CT</div>
          </td></tr>
          <!-- Banner -->
          <tr><td align="center" style="padding:28px 24px 16px;background:linear-gradient(135deg,#c0392b,#e74c3c);">
            <div style="font-size:32px;margin-bottom:8px;">❌</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#fff;">Appointment Cancelled</div>
            <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">Hi ${opts.customerName || 'there'}, your appointment has been cancelled.</div>
          </td></tr>
          <!-- Details -->
          <tr><td style="padding:24px 32px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9f6f2;border-radius:10px;padding:20px;border:1px solid #ebe5dd;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebe5dd;">
                <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Booking ID</span><br>
                <span style="font-size:15px;font-weight:700;color:#b8864e;">${opts.bookingReference || '—'}</span>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebe5dd;">
                <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Service</span><br>
                <span style="font-size:15px;font-weight:600;">${opts.selectedStyle || '—'}</span>
              </td></tr>
              <tr><td style="padding:8px 0;">
                <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Was Scheduled For</span><br>
                <span style="font-size:15px;font-weight:600;">${formatAppointmentDatetime(opts.appointmentDatetime)}</span>
              </td></tr>
            </table>
            <p style="font-size:13px;color:#888;margin:20px 0 0;">Please note that deposits are non-refundable. We hope to see you again soon — book a new appointment anytime.</p>
          </td></tr>
          <!-- Footer -->
          <tr><td style="padding:16px 24px;background:#f9f6f2;border-top:1px solid #ebe5dd;text-align:center;font-size:12px;color:#aaa;">
            Maya African Hair Braiding · New London, CT · Questions? Reply to this email.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;

  try {
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to: opts.to,
      subject: 'Your appointment has been cancelled — Maya African Hair Braiding',
      html,
    });
    if (error) { console.error('Resend cancel email error:', error); return { success: false, error: error.message }; }
    return { success: true };
  } catch (e) {
    console.error('Resend cancel exception:', e);
    return { success: false, error: e.message };
  }
}

module.exports = { sendBookingConfirmation, sendRescheduleConfirmation, sendCancelConfirmation };
