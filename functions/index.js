/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const stripe = require("stripe");
const cors = require("cors")({origin: true});
const {createCalendarEvent, deleteCalendarEvent} = require("./calendar");

// Production domain URL
const DOMAIN_URL = "https://www.mayaafricanhairbraid.com";
// Stripe secret key (Test Mode)
// Configured with client's Stripe test key
// For production, replace with live key (sk_live_...) or use Firebase Secrets
// RECOMMENDED for production: Use Firebase Secrets instead of hardcoding
// Set with: firebase functions:secrets:set STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY = "sk_test_51REifLRqvuBtPAdXRTp97iSuVIpCbbsxwc087FA10" +
  "CKCrpOqr5ZYpc0fagAvqoQXS3ZWYh8t7dhXhR04uLkBq8tF00v2RXirWg";

admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/**
 * Get unavailable times for a specific date
 */
exports.getUnavailableTimes = onRequest((request, response) => {
  cors(request, response, async () => {
    if (request.method !== "GET") {
      return response.status(405).json({error: "Method not allowed"});
    }

    try {
      const date = request.query.date;
      if (!date) {
        return response.status(400).json({error: "Date parameter is required"});
      }

      // Get start and end of the requested date
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Query Firestore for bookings on the specified date
      const bookingsRef = admin.firestore().collection("bookings");
      const snapshot = await bookingsRef
          .where("appointmentDateTime", ">=", startDate.toISOString())
          .where("appointmentDateTime", "<=", endDate.toISOString())
          .get();

      const unavailableTimes = [];
      snapshot.forEach((doc) => {
        const booking = doc.data();
        const appointmentTime = new Date(booking.appointmentDateTime);
        const duration = parseInt(booking.duration) || 120; // Default 2 hours

        // Calculate end time
        const endTime = new Date(appointmentTime);
        endTime.setMinutes(endTime.getMinutes() + duration);

        unavailableTimes.push({
          start: appointmentTime.toISOString(),
          end: endTime.toISOString(),
          duration: duration,
        });
      });

      return response.json({unavailableTimes});
    } catch (error) {
      console.error("Error getting unavailable times:", error);
      return response.status(500).json({
        error: {
          message: error.message || "Error fetching unavailable times",
        },
      });
    }
  });
});

exports.createCheckoutSession = onRequest((request, response) => {
  cors(request, response, async () => {
    if (request.method !== "POST") {
      return response.status(405).json({error: "Method not allowed"});
    }

    try {
      const data = request.body;
      // Frontend sends camelCase (totalPrice)
      const totalPrice = parseFloat(data.totalPrice ?? data.total_price ?? 0);
      // 10% deposit in cents (matches frontend display)
      const depositAmount = Math.round(totalPrice * 0.10 * 100);

      if (depositAmount < 50) {
        return response.status(400).json({error: "Deposit amount is too low"});
      }

      // Initialize Stripe with the secret key
      const stripeClient = stripe(STRIPE_SECRET_KEY);

      // Create a temporary booking document to store the data
      const tempBookingRef = admin.firestore().collection("temp_bookings").doc();
      const bookingData = {
        ...data,
        status: "pending_payment",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        bookingId: tempBookingRef.id,
        depositAmount: depositAmount,
      };

      // Save temporary booking
      await tempBookingRef.set(bookingData);

      // Create success URL with session ID and booking ID
      const successUrl =
        "https://handlepaymentsuccess-2znamu4p5q-uc.a.run.app/?session_id={CHECKOUT_SESSION_ID}" +
        `&booking_id=${tempBookingRef.id}`;

      const checkoutSession = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: "Appointment Deposit",
              description: "Deposit for " +
                ((data.selected_style || "").substring(0, 50) || "a hairstyle"),
            },
            unit_amount: depositAmount,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: successUrl.toString(),
        cancel_url: `${DOMAIN_URL}/booking.html`,
        metadata: {
          bookingId: tempBookingRef.id,
        },
      });

      return response.json({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return response.status(500).json({
        error: {
          message: error.message || "Error creating checkout session",
        },
      });
    }
  });
});

exports.handlePaymentSuccess = onRequest(async (request, response) => {
  try {
    const sessionId = request.query.session_id;
    const bookingId = request.query.booking_id;

    if (!sessionId || !bookingId) {
      throw new Error("Missing session_id or booking_id");
    }

    // Initialize Stripe
    const stripeClient = stripe(STRIPE_SECRET_KEY);

    // Verify payment status
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Get the temporary booking
    const tempBookingRef = admin.firestore().collection("temp_bookings").doc(bookingId);
    const tempBookingDoc = await tempBookingRef.get();

    if (!tempBookingDoc.exists) {
      throw new Error("Booking not found");
    }

    const bookingData = tempBookingDoc.data();

    // Create Google Calendar event if configured (HilWebWorks calendar)
    let calendarEventId = null;
    try {
      calendarEventId = await createCalendarEvent(bookingData);
    } catch (e) {
      console.warn("Calendar event creation failed:", e.message);
    }

    // Create the actual booking
    const bookingRef = admin.firestore().collection("bookings").doc(bookingId);
    await bookingRef.set({
      ...bookingData,
      status: "confirmed",
      paymentSessionId: sessionId,
      depositPaid: true,
      depositAmount: session.amount_total,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(calendarEventId && {calendarEventId}),
    });

    // Delete the temporary booking
    await tempBookingRef.delete();

    // Redirect to homepage after successful payment
    const productionDomain = "https://www.mayaafricanhairbraid.com";
    response.redirect(productionDomain + "/");
  } catch (error) {
    console.error("Error handling payment success:", error);
    response.redirect("/booking-error.html?error=" + encodeURIComponent(error.message));
  }
});

/**
 * Cancel a booking by ID. Requires email to match the booking.
 * Sets status to 'cancelled'. (Google Calendar event deletion can be added when integrated.)
 */
exports.cancelBooking = onRequest((request, response) => {
  cors(request, response, async () => {
    if (request.method !== "POST") {
      return response.status(405).json({error: "Method not allowed"});
    }

    try {
      const data = request.body || {};
      const bookingId = (data.bookingId || data.booking_id || "").trim();
      const email = (data.email || "").trim().toLowerCase();

      if (!bookingId) {
        return response.status(400).json({error: "Booking ID is required."});
      }
      if (!email) {
        return response.status(400).json({error: "Email is required to cancel."});
      }

      const ref = admin.firestore().collection("bookings").doc(bookingId);
      const doc = await ref.get();

      if (!doc.exists) {
        return response.status(404).json({error: "Booking not found."});
      }

      const booking = doc.data();
      const bookingEmail = (booking.email || "").trim().toLowerCase();
      if (bookingEmail !== email) {
        return response.status(403).json({error: "Email does not match this booking."});
      }

      const currentStatus = (booking.status || "").toLowerCase();
      if (currentStatus === "cancelled") {
        return response.status(200).json({
          message: "Booking was already cancelled.",
          cancelled: true,
        });
      }

      // Remove event from Google Calendar if it was created
      const calendarEventId = booking.calendarEventId;
      if (calendarEventId) {
        try {
          await deleteCalendarEvent(calendarEventId);
        } catch (e) {
          console.warn("Calendar event deletion failed:", e.message);
        }
      }

      await ref.update({
        status: "cancelled",
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return response.status(200).json({
        message: "Booking cancelled successfully.",
        cancelled: true,
      });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      return response.status(500).json({error: error.message || "Failed to cancel booking."});
    }
  });
});
