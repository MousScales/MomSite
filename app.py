import os
from flask import Flask, request, jsonify, redirect, send_file
from dotenv import load_dotenv
import stripe
import firebase_admin
from firebase_admin import credentials, firestore
from flask_cors import CORS
import datetime

# Load environment variables
load_dotenv()

# --- App Initialization ---
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# --- Firebase Initialization ---
try:
    # IMPORTANT: Create a serviceAccountKey.json file and place it in your
    # project root
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase initialized successfully.")
except Exception as e:
    print(f"CRITICAL: Failed to initialize Firebase: {e}")
    db = None

# --- Stripe Configuration ---
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
YOUR_DOMAIN = 'http://127.0.0.1:5500'

if not stripe.api_key:
    print("CRITICAL: STRIPE_SECRET_KEY environment variable not set.")

# --- API Routes ---


@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout_session():
    """
    Creates a Stripe Checkout session for a new booking deposit.
    """
    if not stripe.api_key:
        return jsonify(error="Stripe is not configured on the server."), 500

    try:
        data = request.get_json()  # Changed from request.form.to_dict()
        total_price = float(data.get('total_price', 0))  # Changed from total_price_str
        deposit_amount = int(total_price * 0.30 * 100)  # 30% deposit in cents

        if deposit_amount < 50:  # Stripe's minimum charge is $0.50
            return jsonify(error="Deposit amount is too low to process."), 400

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Appointment Deposit',
                        'description': f"Deposit for {data.get('selected_style', 'a hairstyle')}",
                    },
                    'unit_amount': deposit_amount,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{YOUR_DOMAIN}/booking-success.html?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{YOUR_DOMAIN}/booking.html",
            metadata={
                'customerName': data.get('name'),
                'phoneNumber': data.get('phone'),
                'email': data.get('email'),
                'appointmentDateTime': data.get('appointment-datetime'),
                'selectedStyle': data.get('selected_style'),
                'hairLength': data.get('hair_length'),
                'hairOption': data.get('hair_option'),
                'preWashOption': data.get('pre_wash_option'),
                'detanglingOption': data.get('detangling_option'),
                'notes': data.get('notes'),
                'totalPrice': str(total_price),
                'duration': data.get('duration'),
                'currentHairImageURL': data.get('currentHairImageURL'),
                'referenceImageURL': data.get('referenceImageURL'),
                'boxBraidsVariation': data.get('box_braids_variation'),
                'cornrowsVariation': data.get('cornrows_variation'),
                'twoStrandTwistsVariation': data.get('two_strand_twists_variation')
            }
        )
        return jsonify({'url': checkout_session.url})

    except Exception as e:
        print(f"Error creating checkout session: {e}")
        return jsonify(error={"message": str(e)}), 500


@app.route('/api/booking-success', methods=['POST'])
def booking_success():
    """
    Handles the successful payment callback from Stripe.
    Verifies the session and saves the booking to Firebase.
    """
    print("\n--- /api/booking-success endpoint hit ---")

    if not db:
        print("Error: Database is not configured on the server.")
        return jsonify(error="Database is not configured on the server."), 500

    session_id = request.json.get('session_id')
    if not session_id:
        print("Error: Session ID is missing from the request.")
        return jsonify(error='Session ID is missing'), 400

    print(f"Received session_id: {session_id}")

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        print(
            f"Successfully retrieved Stripe session. Payment Status: {session.payment_status}")

        if session.payment_status == 'paid':
            metadata = session.metadata
            print(f"Payment successful. Metadata received: {metadata}")

            total_price = float(metadata.get('totalPrice', 0))

            booking_data = {
                'customerName': metadata.get('customerName'),
                'phoneNumber': metadata.get('phoneNumber'),
                'email': metadata.get('email'),
                'appointmentDateTime': metadata.get('appointmentDateTime'),
                'selectedStyle': metadata.get('selectedStyle'),
                'hairLength': metadata.get('hairLength'),
                'hairOption': metadata.get('hairOption'),
                'preWashOption': metadata.get('preWashOption'),
                'detanglingOption': metadata.get('detanglingOption'),
                'notes': metadata.get('notes'),
                'totalPrice': total_price,
                'depositPaid': session.amount_total / 100.0,
                'duration': metadata.get('duration'),
                'status': 'confirmed',
                'createdAt': firestore.SERVER_TIMESTAMP,
                'stripeSessionId': session_id,
                'currentHairImageURL': metadata.get('currentHairImageURL'),
                'referenceImageURL': metadata.get('referenceImageURL'),
                'boxBraidsVariation': metadata.get('boxBraidsVariation'),
                'cornrowsVariation': metadata.get('cornrowsVariation'),
                'twoStrandTwistsVariation': metadata.get('twoStrandTwistsVariation'),
                'currentHairImage': metadata.get('currentHairImage'),
                'referenceImage': metadata.get('referenceImage')
            }

            print(
                f"Attempting to save following booking data to Firebase: {booking_data}")

            update_time, doc_ref = db.collection('bookings').add(booking_data)
            print(
                f"Successfully saved booking to Firebase. Document ID: {doc_ref.id}")

            # Convert non-serializable fields for the JSON response
            response_data = booking_data.copy()
            response_data['createdAt'] = datetime.datetime.utcnow().isoformat()

            return jsonify({'status': 'success', 'booking': response_data})
        else:
            print(
                f"Payment not successful. Status was: {session.payment_status}")
            return jsonify(
                {'status': 'error', 'message': 'Payment not successful.'}), 400

    except Exception as e:
        print(f"An exception occurred in booking success endpoint: {e}")
        return jsonify(error={"message": str(e)}), 500


@app.route('/api/get-bookings', methods=['GET'])
def get_bookings():
    """
    Retrieves all bookings from the Firestore database.
    """
    if not db:
        return jsonify(error="Database is not configured."), 500

    try:
        bookings_ref = db.collection('bookings')
        all_bookings = []
        for doc in bookings_ref.stream():
            booking = doc.to_dict()
            booking['id'] = doc.id  # Add the document ID

            # Convert datetime fields to ISO 8601 strings
            for key, value in booking.items():
                if isinstance(value, datetime.datetime):
                    booking[key] = value.isoformat()

            all_bookings.append(booking)

        return jsonify(all_bookings)
    except Exception as e:
        print(f"Error fetching bookings: {e}")
        return jsonify(
    error=f"An error occurred while fetching bookings: {e}"), 500


@app.route('/api/get-booking-months', methods=['GET'])
def get_booking_months():
    """
    Returns a sorted list of unique months that have bookings.
    """
    if not db:
        return jsonify(error="Database is not configured."), 500
    try:
        bookings_ref = db.collection('bookings')
        all_bookings = bookings_ref.stream()

        months = set()
        for booking in all_bookings:
            data = booking.to_dict()
            if 'appointmentDateTime' in data:
                try:
                    # Stored as string, e.g., '2024-05-20T10:00'
                    dt = datetime.datetime.fromisoformat(
                        data['appointmentDateTime'].split('T')[0])
                    months.add(datetime.date(dt.year, dt.month, 1))
                except (ValueError, TypeError):
                    # Handle cases where the date format might be different or
                    # invalid
                    continue

        # Sort dates, newest first
        sorted_months = sorted(list(months), reverse=True)

        # Format for response
        formatted_months = [{'year': d.year, 'month': d.month}
            for d in sorted_months]

        return jsonify(formatted_months)
    except Exception as e:
        print(f"Error fetching booking months: {e}")
        return jsonify(error=f"An error occurred: {e}"), 500


@app.route('/api/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """
    Retrieves aggregated statistics for the admin dashboard.
    """
    if not db:
        return jsonify(error="Database is not configured."), 500

    try:
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)

        bookings_ref = db.collection('bookings')

        if year and month:
            # Filter by month
            start_of_month = datetime.datetime(year, month, 1)
            if month == 12:
                end_of_month = datetime.datetime(year + 1, 1, 1)
            else:
                end_of_month = datetime.datetime(year, month + 1, 1)

            all_docs = []
            for doc in bookings_ref.stream():
                booking = doc.to_dict()
                try:
                    dt_str = booking.get('appointmentDateTime')
                    if dt_str:
                        appt_dt = datetime.datetime.fromisoformat(dt_str)
                        if start_of_month <= appt_dt < end_of_month:
                            booking['id'] = doc.id
                            for key, value in booking.items():
                                if isinstance(value, datetime.datetime):
                                    booking[key] = value.isoformat()
                            all_docs.append(booking)
                except (ValueError, TypeError):
                    continue
            all_bookings_data = all_docs
        elif year:
            # Filter by year
            start_of_year = datetime.datetime(year, 1, 1)
            end_of_year = datetime.datetime(year + 1, 1, 1)
            all_docs = []
            for doc in bookings_ref.stream():
                booking = doc.to_dict()
                try:
                    dt_str = booking.get('appointmentDateTime')
                    if dt_str:
                        appt_dt = datetime.datetime.fromisoformat(dt_str)
                        if start_of_year <= appt_dt < end_of_year:
                            booking['id'] = doc.id
                            for key, value in booking.items():
                                if isinstance(value, datetime.datetime):
                                    booking[key] = value.isoformat()
                            all_docs.append(booking)
                except (ValueError, TypeError):
                    continue
            all_bookings_data = all_docs
        else:
            all_docs = []
            for doc in bookings_ref.stream():
                booking = doc.to_dict()
                booking['id'] = doc.id
                for key, value in booking.items():
                    if isinstance(value, datetime.datetime):
                        booking[key] = value.isoformat()
                all_docs.append(booking)
            all_bookings_data = all_docs

        # Total Bookings
        total_bookings = len(all_bookings_data)

        if total_bookings == 0:
            return jsonify({
                'stats': {
                    'totalBookings': 0,
                    'totalCustomers': 0,
                    'totalSales': 0,
                    'totalRevenue': 0,
                    'favoriteStyle': 'N/A',
                    'favoriteStyleCount': 0
                },
                'bookings': []
            })

        # Total Customers (unique by email)
        customer_emails = {booking.get('email') for booking in all_bookings_data if booking.get('email')}
        total_customers = len(customer_emails)

        # Total Sales is the sum of the full price of all bookings
        total_sales = sum(booking.get('totalPrice', 0) for booking in all_bookings_data)
        
        # Total Revenue is 90% of total sales
        total_revenue = total_sales * 0.9

        # Favorite Style
        style_counts = {}
        for booking in all_bookings_data:
            style = booking.get('selectedStyle')
            if style:
                style_counts[style] = style_counts.get(style, 0) + 1
        
        if style_counts:
            favorite_style = max(style_counts, key=style_counts.get)
            favorite_style_count = style_counts[favorite_style]
        else:
            favorite_style = 'N/A'
            favorite_style_count = 0

        stats = {
            'totalBookings': total_bookings,
            'totalCustomers': total_customers,
            'totalSales': total_sales,
            'totalRevenue': total_revenue,
            'favoriteStyle': favorite_style,
            'favoriteStyleCount': favorite_style_count
        }

        return jsonify({'stats': stats, 'bookings': all_bookings_data})

    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        return jsonify(error=f"An error occurred while fetching dashboard stats: {e}"), 500

@app.route('/api/get-unavailable-times', methods=['GET'])
def get_unavailable_times():
    """
    Retrieves all booked time slots to prevent double bookings.
    Returns a list of time slots that are already booked.
    """
    if not db:
        return jsonify(error="Database is not configured."), 500

    try:
        # Get the date range from query parameters (optional)
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        # Query bookings collection
        bookings_ref = db.collection('bookings')
        
        # Get all bookings
        bookings = bookings_ref.stream()
        
        # Process each booking to extract unavailable times
        unavailable_times = []
        for booking in bookings:
            booking_data = booking.to_dict()
            
            # Get the appointment date and time
            appointment_datetime = booking_data.get('appointmentDateTime')
            if not appointment_datetime:
                continue

            # Parse the appointment datetime
            try:
                start_time = datetime.datetime.fromisoformat(appointment_datetime)
                
                # If date range is provided, filter by it
                if start_date_str and end_date_str:
                    start_date = datetime.datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                    end_date = datetime.datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                    
                    # Skip if outside the requested date range
                    if start_time < start_date or start_time > end_date:
                        continue

                # Get the duration in minutes (default to 120 if not specified)
                duration_str = booking_data.get('duration', '120')
                try:
                    duration_minutes = float(duration_str)
                except ValueError:
                    # If duration is like "2 hours", extract the number
                    duration_minutes = float(duration_str.split()[0]) * 60

                # Calculate end time based on duration
                end_time = start_time + datetime.timedelta(minutes=duration_minutes)
                
                # Add the time slot to unavailable times
                unavailable_times.append({
                    'start': start_time.isoformat(),
                    'end': end_time.isoformat(),
                    'title': 'Booked',  # Generic title to maintain privacy
                    'duration': duration_minutes / 60  # Convert to hours
                })
            except (ValueError, TypeError) as e:
                print(f"Error processing booking {booking.id}: {e}")
                continue

        return jsonify(unavailable_times)

    except Exception as e:
        print(f"Error fetching unavailable times: {e}")
        return jsonify(error=f"An error occurred while fetching unavailable times: {e}"), 500

# --- HTML Page Routes ---

@app.route('/')
def serve_home():
    return send_file('index.html')

@app.route('/booking.html')
def serve_booking():
    return send_file('booking.html')

@app.route('/catalog.html')
def serve_catalog():
    return send_file('catalog.html')

@app.route('/product.html')
def serve_product():
    return send_file('product.html')

@app.route('/admin.html')
def serve_admin():
    return send_file('admin.html')

@app.route('/booking-success.html')
def serve_booking_success():
    return send_file('booking-success.html')

if __name__ == '__main__':
    app.run(port=5500, debug=True) 