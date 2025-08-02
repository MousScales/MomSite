const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const stripe = require("stripe");
const {google} = require('googleapis');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Stripe Create Payment Intent Function
exports.createPaymentIntent = onRequest({
  secrets: ["STRIPE_SECRET_KEY"]
}, (request, response) => {
  cors(request, response, async () => {
    if (request.method !== "POST") {
      return response.status(405).json({error: "Method not allowed"});
    }

    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;

      if (!stripeKey) {
        throw new Error("Missing Stripe API key in environment variables");
      }

      // Initialize Stripe with the secret key from environment variables
      const stripeClient = stripe(stripeKey);

      const { amount, bookingData } = request.body;
      
      // Round amount to ensure it's a proper integer (fixes floating point precision issues)
      const roundedAmount = Math.round(Number(amount));
      
      console.log(`Payment intent - Original amount: ${amount}, Rounded amount: ${roundedAmount}`);
      
      // Validate amount (minimum $1.00)
      if (roundedAmount < 100) {
        return response.status(400).json({error: "Deposit amount is too low"});
      }

      // Create payment intent
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: roundedAmount, // Amount in cents (properly rounded)
        currency: 'usd',
        metadata: {
          bookingId: bookingData.bookingId,
          customerName: bookingData.name,
          service: bookingData.style,
          totalPrice: bookingData.totalPrice.toString(),
          depositAmount: (roundedAmount / 100).toString()
        }
      });
      
      return response.json({
        clientSecret: paymentIntent.client_secret
      });
      
    } catch (error) {
      console.error("Error creating payment intent:", error);
      return response.status(500).json({ 
        error: `An error occurred while creating payment intent: ${error.message}` 
      });
    }
  });
});

// Save Booking Function
exports.saveBooking = onRequest({
  secrets: ["DOMAIN_URL"]
}, (request, response) => {
  cors(request, response, async () => {
    if (request.method !== "POST") {
      return response.status(405).json({error: "Method not allowed"});
    }

    try {
      const data = request.body;
      
      // Debug log the incoming data
      console.log('Received booking data:', JSON.stringify(data, null, 2));
      
      // Create booking data with validation
      const bookingData = {
        name: data.name,
        phone: data.phone,
        style: data.style,
        hairLength: data.hairLength,

        appointmentDate: data.date,
        appointmentTime: data.time || data.appointmentTime, // Handle both field names
        duration: data.duration,
        preWash: data.preWash,
        detangling: data.detangling,
        notes: data.notes,
        totalPrice: data.totalPrice,
        depositAmount: data.depositAmount,
        depositPaid: data.depositPaid || false,
        paymentMethod: data.paymentMethod || 'cash',
        styleImage: data.styleImage,
        hairImage: data.hairImage,
        bookingId: data.bookingId, // Include the bookingId from the request
        status: data.status || 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Validate required fields
      if (!bookingData.appointmentTime) {
        console.error('Missing appointmentTime field in booking data');
        return response.status(400).json({
          error: 'Missing required field: appointmentTime'
        });
      }

      // Save to Firestore
      const docRef = await admin.firestore().collection('bookings').add(bookingData);
      
      console.log(`Booking saved successfully. Document ID: ${docRef.id}`);
      
      return response.json({
        success: true,
        bookingId: docRef.id,
        message: 'Booking saved successfully'
      });

    } catch (error) {
      console.error("Error saving booking:", error);
      return response.status(500).json({
        error: `An error occurred while saving the booking: ${error.message}`
      });
    }
  });
});

// Get Bookings for Date Function
exports.getBookingsForDate = onRequest({
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

      // Query Firestore for bookings on the specified date
      const snapshot = await admin.firestore().collection('bookings')
        .where('appointmentDate', '==', date)
        .get();

      const bookings = [];
      snapshot.forEach((doc) => {
        const booking = doc.data();
        booking.bookingId = booking.bookingId || doc.id; // Ensure bookingId is always present
        bookings.push(booking);
      });

      return response.json({
        success: true,
        bookings: bookings,
        count: bookings.length
      });

    } catch (error) {
      console.error("Error getting bookings for date:", error);
      return response.status(500).json({
        error: `An error occurred while fetching bookings: ${error.message}`
      });
    }
  });
});

// Google Calendar Sync Function
exports.syncToGoogleCalendar = onRequest({
  secrets: ["GOOGLE_CALENDAR_CREDENTIALS", "GOOGLE_CALENDAR_ID"]
}, (request, response) => {
  cors(request, response, async () => {
    if (request.method !== "POST") {
      return response.status(405).json({error: "Method not allowed"});
    }

    try {
      const bookingData = request.body;
      
      // Validate that we have booking data
      if (!bookingData || Object.keys(bookingData).length === 0) {
        console.error("No booking data received");
        return response.status(400).json({error: "No booking data provided"});
      }
      
      // Get Google Calendar credentials from environment
      const credentialsJson = process.env.GOOGLE_CALENDAR_CREDENTIALS;
      const calendarId = process.env.GOOGLE_CALENDAR_ID;
      
      if (!credentialsJson || !calendarId) {
        console.error("Missing Google Calendar configuration");
        return response.status(500).json({error: "Google Calendar not configured"});
      }
      
      // Parse credentials with error handling
      let credentials;
      try {
        credentials = JSON.parse(credentialsJson);
      } catch (parseError) {
        console.error("Error parsing Google Calendar credentials:", parseError);
        return response.status(500).json({error: "Invalid Google Calendar credentials"});
      }
      
      // Set up Google Calendar API
      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
      
      const calendar = google.calendar({version: 'v3', auth});
      
      // Create start and end times
      const appointmentDate = bookingData.appointmentDate || bookingData.date;
      const appointmentTime = bookingData.appointmentTime || bookingData.time;
      const duration = parseInt(bookingData.duration) || 2; // Default 2 hours
      
      console.log("Google Calendar sync - Date/Time data:", {
        appointmentDate, 
        appointmentTime, 
        duration,
        fullBookingData: bookingData
      });
      
      if (!appointmentDate || !appointmentTime) {
        console.error("Missing appointment date or time", {appointmentDate, appointmentTime});
        return response.status(400).json({error: "Missing appointment date or time"});
      }
      
      const startDateTime = new Date(appointmentDate + ' ' + appointmentTime);
      const endDateTime = new Date(startDateTime.getTime() + (duration * 60 * 60 * 1000));
      
      console.log("Google Calendar sync - Parsed dates:", {
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        localStart: startDateTime.toLocaleString(),
        localEnd: endDateTime.toLocaleString()
      });
      
      // Function to generate style options text
      function generateStyleOptionsText(bookingData) {
        let optionsText = '';
        
        // Iterate through all booking data to find style-specific options
        Object.keys(bookingData).forEach(key => {
          // Skip basic fields that are already displayed elsewhere
          const skipFields = ['name', 'phone', 'style', 'duration', 'appointmentDate', 'appointmentTime', 
                             'date', 'time', 'displayTime', 'totalPrice', 'depositAmount', 'depositPaid', 
                             'paymentMethod', 'status', 'bookingId', 'notes', 'styleImage', 'hairImage'];
          
          if (!skipFields.includes(key) && bookingData[key] && bookingData[key] !== '' && bookingData[key] !== 'no-wash' && bookingData[key] !== 'no-detangle' && bookingData[key] !== 'none' && bookingData[key] !== null) {
            // Format the key to be more readable
            const formattedKey = key
              .replace(/-/g, ' ')
              .replace(/([A-Z])/g, ' $1')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            
            // Format the value
            let formattedValue = bookingData[key];
            
            // Handle specific field formatting
            if (key.includes('wash-service') && bookingData[key] === 'wash') {
              formattedValue = 'Wash & Condition (+$30)';
            } else if (key.includes('detangle-service') && bookingData[key] === 'detangle') {
              formattedValue = 'Detangle Hair (+$20)';
            } else if (key.includes('knotless') && bookingData[key] === 'knotless') {
              formattedValue = 'Knotless Style (+$30)';
            } else if (key.includes('human') && bookingData[key].includes('human')) {
              formattedValue = 'Human Hair (+$60)';
            } else if (key === 'hairLength') {
              formattedValue = bookingData[key].charAt(0).toUpperCase() + bookingData[key].slice(1);
            } else if (key.includes('consultation')) {
              formattedValue = 'Price varies - will discuss during appointment';
            } else {
              // Convert kebab-case or camelCase values to readable format
              formattedValue = formattedValue
                .replace(/-/g, ' ')
                .replace(/([A-Z])/g, ' $1')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
            
            optionsText += `• ${formattedKey}: ${formattedValue}\n`;
          }
        });
        
        return optionsText || 'No additional options selected';
      }
      
      // Create calendar event
      const event = {
        summary: `${bookingData.name} - ${bookingData.style}`,
        description: `
📋 BOOKING DETAILS
Client: ${bookingData.name}
Phone: ${bookingData.phone}
Service: ${bookingData.style}
Duration: ${duration} hours
${bookingData.hairLength ? `Hair Length: ${bookingData.hairLength}` : ''}

💰 PRICING
Total Price: $${bookingData.totalPrice}
Deposit Paid: $${bookingData.depositAmount}
Status: ${bookingData.status || 'Confirmed'}
Booking ID: ${bookingData.bookingId}

🎨 STYLE OPTIONS
${generateStyleOptionsText(bookingData)}

📝 NOTES
${bookingData.notes || 'No special notes'}

📸 REFERENCE IMAGES
${bookingData.styleImage && bookingData.styleImage !== 'null' && bookingData.styleImage !== '' ? `✅ Style Reference: Provided` : '❌ Style Reference: Not provided'}
${bookingData.hairImage && bookingData.hairImage !== 'null' && bookingData.hairImage !== '' ? `✅ Hair Image: Provided` : '❌ Hair Image: Not provided'}

${bookingData.styleImage && bookingData.styleImage !== 'null' && bookingData.styleImage !== '' ? `\n📷 Style Reference Image:\n${bookingData.styleImage}` : ''}
${bookingData.hairImage && bookingData.hairImage !== 'null' && bookingData.hairImage !== '' ? `\n📷 Hair Reference Image:\n${bookingData.hairImage}` : ''}
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/New_York', // Adjust to your timezone
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/New_York', // Adjust to your timezone
        },
        colorId: bookingData.status === 'confirmed' ? '10' : '11', // Green for confirmed, Red for pending
        extendedProperties: {
          private: {
            bookingId: bookingData.bookingId,
            source: 'maya-hair-booking'
          }
        }
      };
      
      // Insert event into calendar
      const result = await calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });
      
      console.log('Event created:', result.data.id);
      
      return response.json({
        success: true,
        eventId: result.data.id,
        eventLink: result.data.htmlLink,
        message: 'Event created successfully in Google Calendar'
      });
      
    } catch (error) {
      console.error("Error syncing to Google Calendar:", error);
      return response.status(500).json({
        error: `An error occurred while syncing to Google Calendar: ${error.message}`
      });
    }
  });
});