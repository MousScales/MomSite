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
      
      // Validate amount (minimum $0.50 for Stripe)
      if (roundedAmount < 50) {
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

      // Save to Firestore using the provided bookingId as document ID
      const docRef = await admin.firestore().collection('bookings').doc(data.bookingId).set(bookingData);
      
      console.log(`Booking saved successfully. Document ID: ${data.bookingId}`);
      
      return response.json({
        success: true,
        bookingId: data.bookingId,
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

// Search Bookings by Phone Number Function
exports.searchBookingsByPhone = onRequest({
  secrets: ["DOMAIN_URL"]
}, (request, response) => {
  cors(request, response, async () => {
    if (request.method !== "GET") {
      return response.status(405).json({error: "Method not allowed"});
    }

    try {
      const { phone } = request.query;
      
      if (!phone) {
        return response.status(400).json({error: "Phone number is required"});
      }

      // Clean the phone number (remove non-digits)
      const cleanPhone = phone.replace(/\D/g, '');
      
      console.log(`Searching bookings for phone: ${cleanPhone}`);

      const db = admin.firestore();
      
      // Query bookings by phone number
      const bookingsRef = db.collection('bookings');
      const snapshot = await bookingsRef
        .where('phone', '>=', cleanPhone)
        .where('phone', '<=', cleanPhone + '\uf8ff')
        .get();

      const bookings = [];
      snapshot.forEach(doc => {
        const booking = doc.data();
        booking.bookingId = doc.id;
        bookings.push(booking);
      });

      console.log(`Found ${bookings.length} bookings for phone ${cleanPhone}`);

      return response.json({
        success: true,
        bookings: bookings,
        count: bookings.length
      });
      
    } catch (error) {
      console.error("Error searching bookings by phone:", error);
      return response.status(500).json({ 
        error: `An error occurred while searching bookings: ${error.message}` 
      });
    }
  });
});

// Update Booking Function
exports.updateBooking = onRequest({
  secrets: ["DOMAIN_URL", "GOOGLE_CALENDAR_CREDENTIALS", "GOOGLE_CALENDAR_ID"]
}, (request, response) => {
  cors(request, response, async () => {
    if (request.method !== "POST") {
      return response.status(405).json({error: "Method not allowed"});
    }

    try {
      const { bookingId, newDate, newTime, originalDate, originalTime } = request.body;
      
      if (!bookingId || !newDate || !newTime) {
        return response.status(400).json({error: "Missing required fields"});
      }

      console.log(`Updating booking ${bookingId} from ${originalDate} ${originalTime} to ${newDate} ${newTime}`);

      const db = admin.firestore();
      
      // Get the booking document
      const bookingRef = db.collection('bookings').doc(bookingId);
      const bookingDoc = await bookingRef.get();
      
      if (!bookingDoc.exists) {
        return response.status(404).json({error: "Booking not found"});
      }
      
      const bookingData = bookingDoc.data();
      
      // Check if original appointment is within 48 hours
      if (originalDate && originalTime) {
        const originalDateTime = new Date(originalDate + ' ' + originalTime);
        const now = new Date();
        const timeDifference = originalDateTime.getTime() - now.getTime();
        const hoursDifference = timeDifference / (1000 * 60 * 60);
        
        if (hoursDifference <= 48) {
          return response.status(400).json({
            error: "Rescheduling is not available within 48 hours of your appointment. Please call 860-425-0751 for urgent rescheduling needs."
          });
        }
      }
      
      // Update the booking with new date and time
      const updatedData = {
        ...bookingData,
        bookingId: bookingId, // Add the bookingId
        date: newDate,
        appointmentDate: newDate,
        time: newTime,
        appointmentTime: newTime,
        displayTime: formatTimeForDisplay(newTime),
        updatedAt: new Date().toISOString(),
        rescheduled: true,
        originalDate: originalDate,
        originalTime: originalTime
      };
      
      // Update the document
      await bookingRef.update(updatedData);
      
      console.log(`Successfully updated booking ${bookingId}`);
      
      // Sync to Google Calendar
      try {
        console.log(`Starting Google Calendar sync for booking ${bookingId}`);
        
        // First, delete ALL old Google Calendar events for this booking
        await deleteGoogleCalendarEvent(bookingId);
        console.log(`Successfully cleaned up old Google Calendar events for booking ${bookingId}`);
        
        // Wait longer to ensure deletion is processed and prevent race conditions
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Then create exactly ONE new event
        await createGoogleCalendarEvent(updatedData);
        console.log(`Successfully created new Google Calendar event for booking ${bookingId}`);
        
      } catch (calendarError) {
        console.error("Error syncing to Google Calendar:", calendarError);
        // Don't fail the entire operation if Google Calendar sync fails
      }
      
      return response.json({
        success: true,
        message: "Booking updated successfully",
        bookingId: bookingId,
        newDate: newDate,
        newTime: newTime
      });
      
    } catch (error) {
      console.error("Error updating booking:", error);
      return response.status(500).json({ 
        error: `An error occurred while updating booking: ${error.message}` 
      });
    }
  });
});

// Helper function to format time for display
function formatTimeForDisplay(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

// Helper function to delete Google Calendar event
async function deleteGoogleCalendarEvent(bookingId) {
  try {
    // Get Google Calendar credentials from environment
    const credentialsJson = process.env.GOOGLE_CALENDAR_CREDENTIALS;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    
    if (!credentialsJson || !calendarId) {
      console.error("Missing Google Calendar configuration");
      return;
    }
    
    // Parse credentials
    const credentials = JSON.parse(credentialsJson);
    
    // Set up Google Calendar API
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    
    const calendar = google.calendar({version: 'v3', auth});
    const db = admin.firestore();
    
    // First, let's list ALL events to see what's in the calendar
    const allEvents = await calendar.events.list({
      calendarId: calendarId,
      maxResults: 50
    });
    
    console.log(`Total events in calendar: ${allEvents.data.items ? allEvents.data.items.length : 0}`);
    if (allEvents.data.items) {
      allEvents.data.items.forEach((event, index) => {
        console.log(`Event ${index + 1}: ID=${event.id}, Summary="${event.summary}", Description length=${event.description ? event.description.length : 0}`);
      });
    }
    
    // Search for events with the specific bookingId
    let events = await calendar.events.list({
      calendarId: calendarId,
      privateExtendedProperty: `bookingId=${bookingId}`,
      maxResults: 10
    });
    
    console.log(`Found ${events.data.items ? events.data.items.length : 0} events for booking ${bookingId}`);
    
    // If no events found by bookingId, try to find by client name and phone
    if (!events.data.items || events.data.items.length === 0) {
      // Get the booking data to search by name and phone
      const bookingRef = db.collection('bookings').doc(bookingId);
      const bookingDoc = await bookingRef.get();
      
      if (bookingDoc.exists) {
        const bookingData = bookingDoc.data();
        const clientName = bookingData.name;
        const clientPhone = bookingData.phone;
        
        console.log(`Searching for events with name: "${clientName}" and phone: "${clientPhone}"`);
        
        // Search for events with the client name in the summary
        const nameEvents = await calendar.events.list({
          calendarId: calendarId,
          q: clientName, // Search in event summary
          maxResults: 10
        });
        
        console.log(`Found ${nameEvents.data.items ? nameEvents.data.items.length : 0} events by name search`);
        
        // Filter events that match both name and phone
        if (nameEvents.data.items) {
          events.data.items = nameEvents.data.items.filter(event => {
            const description = event.description || '';
            const matchesPhone = description.includes(clientPhone);
            console.log(`Event "${event.summary}" - Phone match: ${matchesPhone}`);
            return matchesPhone;
          });
        }
        
        console.log(`Found ${events.data.items ? events.data.items.length : 0} events by name/phone search for booking ${bookingId}`);
      }
    }
    
    // First try to find events by bookingId
    const eventsByBookingId = await calendar.events.list({
      calendarId: calendarId,
      privateExtendedProperty: `bookingId=${bookingId}`,
      maxResults: 10
    });
    
    console.log(`Found ${eventsByBookingId.data.items ? eventsByBookingId.data.items.length : 0} events with bookingId ${bookingId}`);
    
    // Delete events found by bookingId
    if (eventsByBookingId.data.items && eventsByBookingId.data.items.length > 0) {
      for (const event of eventsByBookingId.data.items) {
        try {
          await calendar.events.delete({
            calendarId: calendarId,
            eventId: event.id
          });
          console.log(`Deleted Google Calendar event ${event.id} (found by bookingId)`);
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        } catch (deleteError) {
          if (deleteError.code === 410) {
            console.log(`Event ${event.id} already deleted`);
          } else {
            console.error(`Failed to delete event ${event.id}:`, deleteError);
          }
        }
      }
    }
    
    // If no events found by bookingId, try to find by name and phone (fallback)
    if (!eventsByBookingId.data.items || eventsByBookingId.data.items.length === 0) {
      console.log(`No events found by bookingId, trying fallback search...`);
      
      // Get the booking data to search by name and phone
      const bookingDoc = await db.collection('bookings').doc(bookingId).get();
      if (bookingDoc.exists) {
        const bookingData = bookingDoc.data();
        const customerName = bookingData.name;
        const customerPhone = bookingData.phone;
        
        console.log(`Searching for events with name: ${customerName} and phone: ${customerPhone}`);
        
        // Search for events by name in description
        const allEvents = await calendar.events.list({
          calendarId: calendarId,
          maxResults: 50
        });
        
        if (allEvents.data.items) {
          for (const event of allEvents.data.items) {
            const eventDescription = event.description || '';
            const eventSummary = event.summary || '';
            
            // Check if this event matches the booking
            if (eventDescription.includes(customerName) || 
                eventDescription.includes(customerPhone) ||
                eventSummary.includes(customerName) ||
                eventSummary.includes(customerPhone)) {
              
              try {
                await calendar.events.delete({
                  calendarId: calendarId,
                  eventId: event.id
                });
                console.log(`Deleted Google Calendar event ${event.id} (found by name/phone)`);
                await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
              } catch (deleteError) {
                if (deleteError.code === 410) {
                  console.log(`Event ${event.id} already deleted`);
                } else {
                  console.error(`Failed to delete event ${event.id}:`, deleteError);
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`Finished cleaning up Google Calendar events for booking ${bookingId}`);
    
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error);
    // Don't throw error, just log it
  }
}

// Helper function to create Google Calendar event
async function createGoogleCalendarEvent(bookingData) {
  try {
    // Get Google Calendar credentials from environment
    const credentialsJson = process.env.GOOGLE_CALENDAR_CREDENTIALS;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    
    if (!credentialsJson || !calendarId) {
      console.error("Missing Google Calendar configuration");
      return;
    }
    
    // Parse credentials
    const credentials = JSON.parse(credentialsJson);
    
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
    
    if (!appointmentDate || !appointmentTime) {
      console.error("Missing appointment date or time", {appointmentDate, appointmentTime});
      return;
    }
    
    // Parse the date and time more robustly
    let startDateTime;
    try {
      // Parse the time as local time
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const [year, month, day] = appointmentDate.split('-').map(Number);
      
      // Create date in local time
      startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      
      // Add 4 hours to convert from UTC to EST
      // This ensures the time appears correctly in the Google Calendar
      startDateTime = new Date(startDateTime.getTime() + (4 * 60 * 60 * 1000));
      
    } catch (error) {
      console.error('Error parsing date/time:', error);
      return;
    }
    
    const endDateTime = new Date(startDateTime.getTime() + (duration * 60 * 1000));
    
    // Function to generate style options text
    function generateStyleOptionsText(bookingData) {
      let optionsText = '';
      
      // Always show wash service status
      if (bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['wash-service']) {
        if (bookingData.styleSpecificOptions['wash-service'] === 'wash') {
          optionsText += `• Wash Service: Wash & Condition (+$30)\n`;
        } else {
          optionsText += `• Wash Service: Not selected\n`;
        }
      } else {
        optionsText += `• Wash Service: Not selected\n`;
      }
      
      // Always show detangle service status
      if (bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['detangle-service']) {
        if (bookingData.styleSpecificOptions['detangle-service'] === 'detangle') {
          optionsText += `• Detangling Service: Detangle Hair (+$20)\n`;
        } else {
          optionsText += `• Detangling Service: Not selected\n`;
        }
      } else {
        optionsText += `• Detangling Service: Not selected\n`;
      }
      
      // Add other style-specific options
      if (bookingData.styleSpecificOptions) {
        Object.keys(bookingData.styleSpecificOptions).forEach(key => {
          // Skip wash and detangle services as they're handled above
          if (key !== 'wash-service' && key !== 'detangle-service') {
            const value = bookingData.styleSpecificOptions[key];
            if (value && value !== 'no-wash' && value !== 'no-detangle' && value !== 'none') {
              // Format the key to be more readable
              const formattedKey = key
                .replace(/-/g, ' ')
                .replace(/([A-Z])/g, ' $1')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              
              // Format the value
              let formattedValue = value;
              
              // Handle specific field formatting
              if (key.includes('knotless') && value === 'knotless') {
                formattedValue = 'Knotless Style (+$30)';
              } else if (key.includes('human') && value.includes('human')) {
                formattedValue = 'Human Hair (+$60)';
              } else if (key === 'hairLength') {
                formattedValue = value.charAt(0).toUpperCase() + value.slice(1);
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
          }
        });
      }
      
      return optionsText || 'No additional options selected';
    }
    
    // Create calendar event
    const event = {
      summary: `${bookingData.name} - ${bookingData.style}`,
      description: `
👤 CLIENT INFORMATION
Name: ${bookingData.name}
📞 Phone: ${bookingData.phone}

✂️ STYLE DETAILS
Style: ${bookingData.style}
${bookingData.hairLength ? `Hair Length: ${bookingData.hairLength}` : ''}
${generateStyleOptionsText(bookingData)}

🧴 SERVICES
Wash: ${bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['wash-service'] && bookingData.styleSpecificOptions['wash-service'] === 'wash' ? 'Yes (+$30)' : 'No'}
Detangle: ${bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['detangle-service'] && bookingData.styleSpecificOptions['detangle-service'] === 'detangle' ? 'Yes (+$20)' : 'No'}

💰 PRICING INFORMATION
Total Price: $${bookingData.totalPrice}
Deposit Paid: $${bookingData.depositAmount}
Remaining Balance: $${bookingData.totalPrice - bookingData.depositAmount}

📝 ADDITIONAL NOTES
${bookingData.notes || 'None'}
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
    
    // Check if an event already exists for this booking
    const existingEvents = await calendar.events.list({
      calendarId: calendarId,
      privateExtendedProperty: `bookingId=${bookingData.bookingId}`,
      maxResults: 1
    });
    
    if (existingEvents.data.items && existingEvents.data.items.length > 0) {
      console.log(`Event already exists for booking ${bookingData.bookingId}, skipping creation`);
      return;
    }
    
    // Also check for events with same date/time and customer name (additional safety)
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    
    const timeRangeEvents = await calendar.events.list({
      calendarId: calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults: 10
    });
    
    if (timeRangeEvents.data.items) {
      for (const event of timeRangeEvents.data.items) {
        if (event.summary && event.summary.includes(bookingData.name)) {
          console.log(`Found existing event for ${bookingData.name} at same time, skipping creation`);
          return;
        }
      }
    }
    
    // Insert event into calendar
    const result = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });
    
    console.log('Event created:', result.data.id);
    
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    throw error;
  }
}

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
        timeFormatted: bookingData.timeFormatted,
        fullBookingData: bookingData
      });
      
      console.log("Google Calendar sync - Style specific options:", bookingData.styleSpecificOptions);
      
      if (!appointmentDate || !appointmentTime) {
        console.error("Missing appointment date or time", {appointmentDate, appointmentTime});
        return response.status(400).json({error: "Missing appointment date or time"});
      }
      
      // Parse the date and time more robustly
      let startDateTime;
      try {
        // Parse the time as local time
        const [hours, minutes] = appointmentTime.split(':').map(Number);
        const [year, month, day] = appointmentDate.split('-').map(Number);
        
        // Create date in local time
        startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
        
        // Add 4 hours to convert from UTC to EST
        // This ensures the time appears correctly in the Google Calendar
        startDateTime = new Date(startDateTime.getTime() + (4 * 60 * 60 * 1000));
        
      } catch (error) {
        console.error('Error parsing date/time:', error);
        return response.status(400).json({error: "Invalid date/time format"});
      }
      
      const endDateTime = new Date(startDateTime.getTime() + (duration * 60 * 1000));
      
      console.log("Google Calendar sync - Parsed dates:", {
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        localStart: startDateTime.toLocaleString(),
        localEnd: endDateTime.toLocaleString()
      });
      
      // Function to generate style options text
      function generateStyleOptionsText(bookingData) {
        let optionsText = '';
        
        // Always show wash service status
        if (bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['wash-service']) {
          if (bookingData.styleSpecificOptions['wash-service'] === 'wash') {
            optionsText += `• Wash Service: Wash & Condition (+$30)\n`;
          } else {
            optionsText += `• Wash Service: Not selected\n`;
          }
        } else {
          optionsText += `• Wash Service: Not selected\n`;
        }
        
        // Always show detangle service status
        if (bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['detangle-service']) {
          if (bookingData.styleSpecificOptions['detangle-service'] === 'detangle') {
            optionsText += `• Detangling Service: Detangle Hair (+$20)\n`;
          } else {
            optionsText += `• Detangling Service: Not selected\n`;
          }
        } else {
          optionsText += `• Detangling Service: Not selected\n`;
        }
        
        // Add other style-specific options
        if (bookingData.styleSpecificOptions) {
          Object.keys(bookingData.styleSpecificOptions).forEach(key => {
            // Skip wash and detangle services as they're handled above
            if (key !== 'wash-service' && key !== 'detangle-service') {
              const value = bookingData.styleSpecificOptions[key];
              if (value && value !== 'no-wash' && value !== 'no-detangle' && value !== 'none') {
                // Format the key to be more readable
                const formattedKey = key
                  .replace(/-/g, ' ')
                  .replace(/([A-Z])/g, ' $1')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                
                // Format the value
                let formattedValue = value;
                
                // Handle specific field formatting
                if (key.includes('knotless') && value === 'knotless') {
                  formattedValue = 'Knotless Style (+$30)';
                } else if (key.includes('human') && value.includes('human')) {
                  formattedValue = 'Human Hair (+$60)';
                } else if (key === 'hairLength') {
                  formattedValue = value.charAt(0).toUpperCase() + value.slice(1);
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
            }
          });
        }
        
        return optionsText || 'No additional options selected';
      }

      // Function to generate detailed pricing breakdown
      function generatePricingBreakdown(bookingData) {
        let breakdown = '';
        let basePrice = 0;
        
        // Get base price from style configurations
        const styleConfig = {
          'cornrows': { nostyle: 80 },
          'box-braids': { shoulder: 230, midback: 250 },
          'boho-braids': { shoulder: 280, midback: 250 },
          'jumbo-braids': { midback: 230 },
          'fulani-braids': { shoulder: 220, midback: 250 },
          'stitch-braids': { midback: 150 },
          'tribal-braids': { shoulder: 220, midback: 250 },
          'lemonade-braids': { short: 130, medium: 160, long: 200 },
          'passion-twists': { shoulder: 250, midback: 300 },
          'senegalese-twists': { shoulder: 230, midback: 250 },
          'marley-twists': { shoulder: 230, midback: 300 },
          'two-strand-twists': { standard: 130 },
          'locs-retwist': { standard: 130 },
          'loc-retwist-2-strands': { standard: 150 },
          'barrel-twists': { standard: 150 },
          'starter-locs': { standard: 150 },
          'weave': { standard: 150 },
          'test-style': { standard: 1 }
        };
        
        // Calculate base price
        const style = bookingData.style;
        const hairLength = bookingData.hairLength;
        
        if (styleConfig[style]) {
          if (hairLength && styleConfig[style][hairLength]) {
            basePrice = styleConfig[style][hairLength];
            breakdown += `• Base Style (${style} - ${hairLength}): $${basePrice}\n`;
          } else if (styleConfig[style].standard) {
            basePrice = styleConfig[style].standard;
            breakdown += `• Base Style (${style}): $${basePrice}\n`;
          } else if (styleConfig[style].nostyle) {
            basePrice = styleConfig[style].nostyle;
            breakdown += `• Base Style (${style}): $${basePrice}\n`;
          }
        }
        
        // Add additional services pricing
        if (bookingData.styleSpecificOptions) {
          // Wash service
          if (bookingData.styleSpecificOptions['wash-service'] === 'wash') {
            breakdown += `• Wash & Condition: +$30\n`;
          }
          
          // Detangle service
          if (bookingData.styleSpecificOptions['detangle-service'] === 'detangle') {
            breakdown += `• Detangle Hair: +$20\n`;
          }
          
          // Other style-specific options
          Object.keys(bookingData.styleSpecificOptions).forEach(key => {
            if (key !== 'wash-service' && key !== 'detangle-service' && key !== 'hairLength') {
              const value = bookingData.styleSpecificOptions[key];
              if (value && value !== 'no-wash' && value !== 'no-detangle' && value !== 'none') {
                let serviceName = '';
                let additionalCost = 0;
                
                if (key.includes('knotless') && value === 'knotless') {
                  serviceName = 'Knotless Style';
                  additionalCost = 30;
                } else if (key.includes('human') && value.includes('human')) {
                  serviceName = 'Human Hair Upgrade';
                  additionalCost = 60;
                } else if (key.includes('extensions') && value === 'with-extensions') {
                  serviceName = 'Extensions';
                  additionalCost = 20;
                } else if (key.includes('bundle') && value === 'with-bundle') {
                  serviceName = 'Additional Bundle';
                  additionalCost = 100;
                } else if (key.includes('style-choice') && value === 'with-style') {
                  serviceName = 'Style Pattern';
                  additionalCost = 40;
                }
                
                if (serviceName && additionalCost > 0) {
                  breakdown += `• ${serviceName}: +$${additionalCost}\n`;
                }
              }
            }
          });
        }
        
        return breakdown;
      }
      
      // Create calendar event
      const event = {
        summary: `${bookingData.name} - ${bookingData.style}`,
        description: `
👤 CLIENT INFORMATION
Name: ${bookingData.name}
📞 Phone: ${bookingData.phone}

✂️ STYLE DETAILS
Style: ${bookingData.style}
${bookingData.hairLength ? `Hair Length: ${bookingData.hairLength}` : ''}
${generateStyleOptionsText(bookingData)}

🧴 SERVICES
Wash: ${bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['wash-service'] && bookingData.styleSpecificOptions['wash-service'] === 'wash' ? 'Yes (+$30)' : 'No'}
Detangle: ${bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['detangle-service'] && bookingData.styleSpecificOptions['detangle-service'] === 'detangle' ? 'Yes (+$20)' : 'No'}

💰 PRICING INFORMATION
Total Price: $${bookingData.totalPrice}
Deposit Paid: $${bookingData.depositAmount}
Remaining Balance: $${bookingData.totalPrice - bookingData.depositAmount}

📝 ADDITIONAL NOTES
${bookingData.notes || 'None'}
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

// Function to sync all bookings to Google Calendar
exports.syncAllBookingsToGoogleCalendar = onRequest({
  secrets: ["DOMAIN_URL", "GOOGLE_CALENDAR_CREDENTIALS", "GOOGLE_CALENDAR_ID"]
}, (request, response) => {
  cors(request, response, async () => {
    try {
      const db = admin.firestore();
      
      // Get all bookings from Firestore
      const snapshot = await db.collection('bookings').get();
      const bookings = snapshot.docs.map(doc => ({
        bookingId: doc.id,
        ...doc.data()
      }));
      
      console.log(`Found ${bookings.length} bookings to sync`);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process each booking
      for (const booking of bookings) {
        try {
          // Skip bookings without valid date/time
          if (!booking.appointmentDate || !booking.appointmentTime) {
            console.log(`Skipping booking ${booking.bookingId} - missing date/time`);
            continue;
          }
          
          await createGoogleCalendarEvent(booking);
          successCount++;
          
          // Add delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error syncing booking ${booking.bookingId}:`, error);
          errorCount++;
        }
      }
      
      console.log(`Sync complete: ${successCount} successful, ${errorCount} errors`);
      
      return response.json({
        success: true,
        message: `Successfully synced ${successCount} bookings to Google Calendar`,
        totalBookings: bookings.length,
        successCount: successCount,
        errorCount: errorCount
      });
      
    } catch (error) {
      console.error("Error syncing all bookings:", error);
      return response.status(500).json({
        success: false,
        message: "Failed to sync bookings",
        error: error.message
      });
    }
  });
});

// Function to cancel a booking
exports.cancelBooking = onRequest({
  secrets: ["DOMAIN_URL", "GOOGLE_CALENDAR_CREDENTIALS", "GOOGLE_CALENDAR_ID"]
}, (request, response) => {
  cors(request, response, async () => {
    if (request.method !== "POST") {
      return response.status(405).json({error: "Method not allowed"});
    }

    try {
      const { bookingId } = request.body;
      
      if (!bookingId) {
        return response.status(400).json({error: "Missing bookingId"});
      }

      console.log(`Cancelling booking ${bookingId}`);

      const db = admin.firestore();
      
      // Get the booking document
      const bookingRef = db.collection('bookings').doc(bookingId);
      const bookingDoc = await bookingRef.get();
      
      if (!bookingDoc.exists) {
        return response.status(404).json({error: "Booking not found"});
      }
      
      const bookingData = bookingDoc.data();
      
      // Check if appointment is within 48 hours
      if (bookingData.appointmentDate && bookingData.appointmentTime) {
        const appointmentDateTime = new Date(bookingData.appointmentDate + ' ' + bookingData.appointmentTime);
        const now = new Date();
        const timeDifference = appointmentDateTime.getTime() - now.getTime();
        const hoursDifference = timeDifference / (1000 * 60 * 60);
        
        if (hoursDifference <= 48) {
          return response.status(400).json({
            error: "Cancellation is not available within 48 hours of your appointment. Please call 860-425-0751 for urgent cancellation needs."
          });
        }
      }
      
      // Delete from Google Calendar first
      try {
        console.log(`Deleting Google Calendar events for booking ${bookingId}`);
        await deleteGoogleCalendarEvent(bookingId);
        console.log(`Successfully deleted Google Calendar events for booking ${bookingId}`);
      } catch (calendarError) {
        console.error("Error deleting from Google Calendar:", calendarError);
        // Continue with deletion even if Google Calendar fails
      }
      
      // Delete from Firestore
      await bookingRef.delete();
      console.log(`Successfully deleted booking ${bookingId} from Firestore`);
      
      return response.json({
        success: true,
        message: "Booking cancelled successfully",
        bookingId: bookingId
      });
      
    } catch (error) {
      console.error("Error cancelling booking:", error);
      return response.status(500).json({ 
        error: `An error occurred while cancelling booking: ${error.message}` 
      });
    }
  });
}); 