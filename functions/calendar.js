/**
 * Google Calendar helpers for creating and deleting events.
 * Uses Application Default Credentials (Firebase project service account).
 *
 * Setup:
 * 1. Enable Google Calendar API for the Firebase/Cloud project.
 * 2. Share the HilWebWorks (or business) Google Calendar with the project's
 *    service account email (e.g. connect-2a17c@appspot.gserviceaccount.com)
 *    with "Make changes to events" permission.
 * 3. Set GOOGLE_CALENDAR_ID in Firebase config or Secret Manager to the
 *    calendar ID (e.g. primary email or calendar id from Calendar settings).
 */

const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

/**
 * Get Calendar API client using Application Default Credentials.
 * @param {string} calendarId - Optional override (otherwise from env/config).
 * @returns {{ calendar: object, calendarId: string }} calendar client and id
 */
async function getCalendarClient(calendarId) {
  const auth = new google.auth.GoogleAuth({ scopes: SCOPES });
  const calendar = google.calendar({ version: "v3", auth });
  const id =
    calendarId ||
    process.env.GOOGLE_CALENDAR_ID ||
    process.env.GOOGLE_CALENDAR_ID_SECRET;
  return { calendar, calendarId: id };
}

/**
 * Create a calendar event for a booking.
 * @param {object} booking - { appointmentDateTime, duration, name?, selectedStyle?, email? }
 * @returns {Promise<string|null>} Event id or null if calendar not configured / error
 */
async function createCalendarEvent(booking) {
  const id =
    process.env.GOOGLE_CALENDAR_ID || process.env.GOOGLE_CALENDAR_ID_SECRET;
  if (!id) {
    console.warn("GOOGLE_CALENDAR_ID not set; skipping calendar event creation");
    return null;
  }

  try {
    const { calendar, calendarId } = await getCalendarClient(id);
    const start = new Date(booking.appointmentDateTime);
    const durationMin = parseInt(booking.duration, 10) || 120;
    const end = new Date(start.getTime() + durationMin * 60 * 1000);

    const title =
      booking.name && booking.selectedStyle
        ? `${booking.selectedStyle} – ${booking.name}`
        : booking.selectedStyle || "Appointment";

    const event = {
      summary: title,
      description: [
        booking.email && `Email: ${booking.email}`,
        booking.phone && `Phone: ${booking.phone}`,
        booking.notes && `Notes: ${booking.notes}`,
      ]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: start.toISOString(), timeZone: "America/New_York" },
      end: { dateTime: end.toISOString(), timeZone: "America/New_York" },
    };

    const res = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });
    return res.data.id || null;
  } catch (err) {
    console.error("Calendar create event error:", err.message);
    return null;
  }
}

/**
 * Delete a calendar event by id.
 * @param {string} eventId - Google Calendar event id
 * @returns {Promise<boolean>} true if deleted or calendar not configured
 */
async function deleteCalendarEvent(eventId) {
  if (!eventId) return true;
  const id =
    process.env.GOOGLE_CALENDAR_ID || process.env.GOOGLE_CALENDAR_ID_SECRET;
  if (!id) return true;

  try {
    const { calendar, calendarId } = await getCalendarClient(id);
    await calendar.events.delete({ calendarId, eventId });
    return true;
  } catch (err) {
    if (err.code === 404) return true;
    console.error("Calendar delete event error:", err.message);
    return false;
  }
}

module.exports = {
  getCalendarClient,
  createCalendarEvent,
  deleteCalendarEvent,
};

