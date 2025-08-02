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
            success_url=f"{YOUR_DOMAIN}/?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{YOUR_DOMAIN}/",
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















# --- HTML Page Routes ---

@app.route('/')
def serve_home():
    return send_file('index.html')

@app.route('/booking.html')
def serve_booking():
    return send_file('booking.html')

@app.route('/booking-success.html')
def serve_booking_success():
    return send_file('booking-success.html')

@app.route('/api/save-booking', methods=['POST'])
def save_booking():
    """
    Saves a new booking to the database.
    """
    if not db:
        return jsonify(error="Database is not configured."), 500

    try:
        data = request.json
        
        # Create booking data
        booking_data = {
            'name': data.get('name'),
            'phone': data.get('phone'),
            'style': data.get('style'),
            'hairLength': data.get('hairLength'),
            'hairOption': data.get('hairOption'),
            'appointmentDate': data.get('date'),
            'appointmentTime': data.get('time'),
            'duration': data.get('duration'),
            'preWash': data.get('preWash'),
            'detangling': data.get('detangling'),
            'notes': data.get('notes'),
            'totalPrice': data.get('totalPrice'),
            'styleImage': data.get('styleImage'),
            'hairImage': data.get('hairImage'),
            'status': 'pending',
            'createdAt': firestore.SERVER_TIMESTAMP
        }

        # Save to Firestore
        doc_ref = db.collection('bookings').add(booking_data)
        
        print(f"Booking saved successfully. Document ID: {doc_ref[1].id}")
        
        return jsonify({
            'success': True,
            'bookingId': doc_ref[1].id,
            'message': 'Booking saved successfully'
        })

    except Exception as e:
        print(f"Error saving booking: {e}")
        return jsonify(error=f"An error occurred while saving the booking: {e}"), 500

@app.route('/api/get-bookings-for-date', methods=['GET'])
def get_bookings_for_date():
    """
    Gets all bookings for a specific date to check for conflicts.
    """
    if not db:
        return jsonify(error="Database is not configured."), 500

    try:
        date = request.args.get('date')
        if not date:
            return jsonify(error="Date parameter is required"), 400

        # Query bookings for the specific date
        bookings_ref = db.collection('bookings')
        bookings = bookings_ref.where('appointmentDate', '==', date).stream()
        
        bookings_data = []
        for doc in bookings:
            booking = doc.to_dict()
            booking['id'] = doc.id
            bookings_data.append(booking)

        return jsonify(bookings_data)

    except Exception as e:
        print(f"Error fetching bookings for date: {e}")
        return jsonify(error=f"An error occurred: {e}"), 500



@app.route('/catalog.html')
def serve_catalog():
    return send_file('catalog.html')

@app.route('/product.html')
def serve_product():
    return send_file('product.html')

@app.route('/admin.html')
def serve_admin():
    return send_file('admin.html')



if __name__ == '__main__':
    app.run(port=5500, debug=True) 