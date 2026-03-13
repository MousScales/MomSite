/**
 * Google Calendar helper for Vercel serverless.
 * Set GOOGLE_SERVICE_ACCOUNT_JSON (full JSON key as string) and GOOGLE_CALENDAR_ID in Vercel env.
 * Share the target calendar with the service account email and grant "Make changes to events".
 */

let _calendar = null;
let _calendarId = null;

function getCalendar() {
  if (_calendar !== undefined) return _calendar;
  _calendar = null;
  _calendarId = process.env.GOOGLE_CALENDAR_ID || '';
  const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!_calendarId || !jsonStr) {
    return null;
  }
  try {
    const { google } = require('googleapis');
    const credentials = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });
    _calendar = google.calendar({ version: 'v3', auth });
  } catch (e) {
    console.warn('Google Calendar init failed:', e.message);
  }
  return _calendar;
}

/**
 * @param {object} bookingData - { 'appointment-datetime', duration, name, selected_style, email, phone, notes }
 * @returns {Promise<string|null>} Event ID or null
 */
async function createCalendarEvent(bookingData) {
  const calendar = getCalendar();
  if (!calendar || !_calendarId) return null;

  const appointmentDatetime = bookingData['appointment-datetime'] || bookingData.appointment_datetime;
  if (!appointmentDatetime) return null;

  let startTime;
  try {
    startTime = new Date(appointmentDatetime);
    if (isNaN(startTime.getTime())) return null;
  } catch (e) {
    return null;
  }

  const durationMinutes = parseInt(bookingData.duration, 10) || 120;
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const style = bookingData.selected_style || bookingData.selectedStyle || 'Appointment';
  const name = bookingData.name || '';
  const summary = name ? `${style} – ${name}` : style;

  const parts = [];
  if (bookingData.email) parts.push(`Email: ${bookingData.email}`);
  if (bookingData.phone) parts.push(`Phone: ${bookingData.phone}`);
  if (bookingData.notes) parts.push(`Notes: ${bookingData.notes}`);
  const description = parts.join('\n');

  const event = {
    summary,
    description,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'America/New_York',
    },
  };

  try {
    const res = await calendar.events.insert({
      calendarId: _calendarId,
      requestBody: event,
    });
    const eventId = res.data && res.data.id;
    if (eventId) console.log('Calendar event created:', eventId);
    return eventId || null;
  } catch (e) {
    console.warn('Calendar event create failed:', e.message);
    return null;
  }
}

/**
 * @param {string} eventId - Google Calendar event ID
 * @returns {Promise<boolean>}
 */
async function deleteCalendarEvent(eventId) {
  if (!eventId) return true;
  const calendar = getCalendar();
  if (!calendar || !_calendarId) return true;

  try {
    await calendar.events.delete({
      calendarId: _calendarId,
      eventId,
    });
    return true;
  } catch (e) {
    if (e.code === 404 || (e.message && e.message.includes('404'))) return true;
    console.warn('Calendar event delete failed:', e.message);
    return false;
  }
}

module.exports = { createCalendarEvent, deleteCalendarEvent };
