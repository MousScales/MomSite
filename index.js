/**
 * Import function triggers from their respective submodules:
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const stripe = require("stripe");
const cors = require("cors")({origin: true});

admin.initializeApp();

exports.getUnavailableTimes = onRequest({
  secrets: ["DOMAIN_URL"]
}, (request, response) => {
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

exports.createCheckoutSession = onRequest({
  secrets: ["STRIPE_SECRET_KEY", "DOMAIN_URL"]
}, (request, response) => {
  cors(request, response, async () => {
    if (request.method !== "POST") {
      return response.status(405).json({error: "Method not allowed"});
    }

    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const domainUrl = process.env.DOMAIN_URL;

      if (!stripeKey) {
        throw new Error("Missing Stripe API key in environment variables");
      }
      if (!domainUrl) {
        throw new Error("Missing domain URL in environment variables");
      }

      // Initialize Stripe with the secret key from environment variables
      const stripeClient = stripe(stripeKey);

      const data = request.body;
      const totalPrice = parseFloat(data.total_price || 0);
      // 30% deposit in cents
      const depositAmount = Math.round(totalPrice * 0.30 * 100);

      if (depositAmount < 50) {
        return response.status(400).json({error: "Deposit amount is too low"});
      }

      const successUrl = `${domainUrl}/booking-success.html` +
        "?session_id={CHECKOUT_SESSION_ID}";

      const checkoutSession = await stripeClient.checkout.Session.create({
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
        success_url: successUrl,
        cancel_url: `${domainUrl}/booking.html`,
        metadata: {
          customerName: data.name,
          phoneNumber: data.phone,
          email: data.email,
          appointmentDateTime: data.appointment_datetime,
          selectedStyle: data.selected_style,
          hairLength: data.hair_length,
          hairOption: data.hair_option,
          preWashOption: data.pre_wash_option,
          notes: data.notes,
          totalPrice: String(totalPrice),
          duration: data.duration,
          currentHairImageURL: data.currentHairImageURL,
          referenceImageURL: data.referenceImageURL,
          boxBraidsVariation: data.box_braids_variation,
          cornrowsVariation: data.cornrows_variation,
          twoStrandTwistsVariation: data.two_strand_twists_variation,
        },
      });

      return response.json({url: checkoutSession.url});
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