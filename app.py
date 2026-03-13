import os
import uuid
import datetime
import random
import string
import re
import json
import hashlib
from urllib.parse import quote
from flask import Flask, request, jsonify, redirect, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import stripe
# --- Firebase imports (commented out - using Supabase instead) ---
# import firebase_admin
# from firebase_admin import credentials, firestore
from supabase import create_client, Client
try:
    from resend_helper import send_booking_confirmation
except ImportError:
    send_booking_confirmation = None

try:
    from calendar_helper import create_calendar_event, delete_calendar_event
except ImportError:
    # Fallback to OAuth if service account not available
    try:
        from calendar_helper_oauth import create_calendar_event_oauth as create_calendar_event, delete_calendar_event_oauth as delete_calendar_event
    except ImportError:
        # No calendar integration available
        def create_calendar_event(*args, **kwargs):
            return None
        def delete_calendar_event(*args, **kwargs):
            return True

# Load environment variables
load_dotenv()

_resend_ok = (os.getenv("RESEND_API_KEY") or "").strip().startswith("re_")
print("Resend configured for confirmation emails." if _resend_ok else "Resend NOT configured (set RESEND_API_KEY in .env); confirmation emails disabled.")

# --- App Initialization ---
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- Supabase Initialization ---
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://ecnbdqkqlxkfghjcbvwj.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbmJkcWtxbHhrZmdoamNidndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQxNjMsImV4cCI6MjA4ODc1MDE2M30.r8jDPCV7C7kTrnHIwGvs4vBq-sf8rvyFxe1Q6_rR2Tg')

supabase: Client = None
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Supabase initialized successfully.")
except Exception as e:
    print(f"CRITICAL: Failed to initialize Supabase: {e}")
    supabase = None


def generate_booking_reference():
    """
    Generate a user-friendly booking reference ID.
    Format: MAYA-XXXXXX (e.g., MAYA-A3B7K9)
    """
    # Generate 6-character alphanumeric code (uppercase letters and numbers)
    chars = string.ascii_uppercase + string.digits
    # Exclude similar-looking characters (0, O, I, 1) for clarity
    chars = chars.replace('0', '').replace('O', '').replace('I', '').replace('1', '')
    code = ''.join(random.choice(chars) for _ in range(6))
    return f"MAYA-{code}"


def ensure_booking_reference_unique(booking_ref):
    """
    Check if booking reference is unique, generate new one if not.
    """
    max_attempts = 10
    for _ in range(max_attempts):
        # Check if this reference already exists
        result = supabase.table('bookings').select('booking_reference').eq('booking_reference', booking_ref).execute()
        if not result.data or len(result.data) == 0:
            # Also check temp_bookings
            result = supabase.table('temp_bookings').select('booking_reference').eq('booking_reference', booking_ref).execute()
            if not result.data or len(result.data) == 0:
                return booking_ref
        # If exists, generate new one
        booking_ref = generate_booking_reference()
    return booking_ref  # Return last attempt if all fail (very unlikely)


def normalize_phone_number(phone_value):
    return ''.join(ch for ch in str(phone_value or '') if ch.isdigit())


def normalize_booking_text(value, lowercase=False):
    text = str(value or '').strip()
    return text.lower() if lowercase else text


def get_booking_signature_payload(source):
    return {
        'name': normalize_booking_text(source.get('name')),
        'phone': normalize_phone_number(source.get('phone')),
        'email': normalize_booking_text(source.get('email'), lowercase=True),
        'appointment_datetime': normalize_booking_text(
            source.get('appointment-datetime') or source.get('appointmentDateTime') or source.get('appointment_datetime')
        ),
        'selected_style': normalize_booking_text(source.get('selected_style') or source.get('selectedStyle')),
        'hair_length': normalize_booking_text(source.get('hair_length') or source.get('hairLength')),
        'hair_option': normalize_booking_text(source.get('hair_option') or source.get('hairOption')),
        'pre_wash_option': normalize_booking_text(source.get('pre_wash_option') or source.get('preWashOption')),
        'detangling_option': normalize_booking_text(source.get('detangling_option') or source.get('detanglingOption')),
        'notes': normalize_booking_text(source.get('notes')),
        'total_price': round(float(source.get('total_price') or source.get('totalPrice') or 0), 2),
        'duration': int(source.get('duration') or 0),
        'box_braids_variation': normalize_booking_text(source.get('box_braids_variation') or source.get('boxBraidsVariation')),
        'cornrows_variation': normalize_booking_text(source.get('cornrows_variation') or source.get('cornrowsVariation')),
        'two_strand_twists_variation': normalize_booking_text(
            source.get('two_strand_twists_variation') or source.get('twoStrandTwistsVariation')
        ),
    }


def get_booking_signature_hash(source):
    payload = get_booking_signature_payload(source)
    payload_json = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(payload_json.encode('utf-8')).hexdigest()


def find_matching_confirmed_booking(signature_hash, appointment_datetime):
    appointment_datetime = normalize_booking_text(appointment_datetime)
    if not appointment_datetime:
        return None

    result = (
        supabase.table('bookings')
        .select('*')
        .eq('appointment-datetime', appointment_datetime)
        .neq('status', 'cancelled')
        .execute()
    )
    for booking in result.data or []:
        if get_booking_signature_hash(booking) == signature_hash:
            return booking
    return None


def find_matching_pending_temp_booking(signature_hash, appointment_datetime):
    appointment_datetime = normalize_booking_text(appointment_datetime)
    if not appointment_datetime:
        return None

    result = (
        supabase.table('temp_bookings')
        .select('*')
        .eq('appointment-datetime', appointment_datetime)
        .eq('status', 'pending_payment')
        .execute()
    )
    for booking in result.data or []:
        if get_booking_signature_hash(booking) == signature_hash:
            return booking
    return None


def get_or_create_stripe_customer(name, email, phone=None):
    customer_email = normalize_booking_text(email, lowercase=True)
    customer_name = normalize_booking_text(name)
    customer_phone = normalize_phone_number(phone)

    if not customer_email:
        return None

    existing_customers = stripe.Customer.list(email=customer_email, limit=1)
    if existing_customers.data:
        customer = existing_customers.data[0]
        updates = {}
        if customer_name and customer.get('name') != customer_name:
            updates['name'] = customer_name
        if customer_phone and customer.get('phone') != customer_phone:
            updates['phone'] = customer_phone
        if updates:
            customer = stripe.Customer.modify(customer.id, **updates)
        return customer

    return stripe.Customer.create(
        email=customer_email,
        name=customer_name or None,
        phone=customer_phone or None,
    )

# --- Firebase Initialization (commented out - using Supabase instead) ---
# try:
#     # IMPORTANT: Create a serviceAccountKey.json file and place it in your
#     # project root
#     cred = credentials.Certificate('serviceAccountKey.json')
#     firebase_admin.initialize_app(cred)
#     db = firestore.client()
#     print("Firebase initialized successfully.")
# except Exception as e:
#     print(f"CRITICAL: Failed to initialize Firebase: {e}")
#     db = None
db = None  # Using Supabase for storage, Firebase commented out

# --- Stripe Configuration ---
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
SITE_URL = (os.getenv('SITE_URL') or os.getenv('DOMAIN_URL') or '').rstrip('/')

if not stripe.api_key:
    print("CRITICAL: STRIPE_SECRET_KEY environment variable not set.")


def get_site_url():
    """
    Resolve the canonical site URL for redirects.
    Prefer the current request host so custom-domain traffic stays on the same domain.
    """
    forwarded_proto = request.headers.get('x-forwarded-proto')
    forwarded_host = request.headers.get('x-forwarded-host')
    if forwarded_proto and forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}"

    origin = request.headers.get('origin')
    if origin:
        return origin.rstrip('/')

    if request.url_root:
        return request.url_root.rstrip('/')

    if SITE_URL:
        return SITE_URL

    return 'http://127.0.0.1:5500'

# --- API Routes ---
# Note: API routes must be defined before static file routes to prevent Flask from serving them as static files

@app.route('/api/create-checkout-session', methods=['POST', 'OPTIONS'])
def create_checkout_session():
    """
    Creates a Stripe Checkout session for a new booking deposit.
    Saves booking data to Supabase temp_bookings table.
    """
    print(f"Received {request.method} request to /api/create-checkout-session")
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
    
    if not stripe.api_key:
        print("ERROR: Stripe API key not set")
        return jsonify(error="Stripe is not configured on the server."), 500

    if not supabase:
        print("ERROR: Supabase not initialized")
        return jsonify(error="Database is not configured on the server."), 500

    try:
        print("Processing checkout session creation...")
        data = request.get_json()
        print(f"Received booking data keys: {list(data.keys()) if data else 'None'}")  # Debug: log received data keys

        # Validate appointment is at least 48 hours in advance
        appointment_str = data.get('appointment-datetime') or data.get('appointmentDateTime')
        if appointment_str:
            try:
                appointment_dt = datetime.datetime.fromisoformat(
                    appointment_str.replace('Z', '+00:00')
                )
                if appointment_dt.tzinfo:
                    appointment_dt = appointment_dt.astimezone(datetime.timezone.utc)
                else:
                    appointment_dt = appointment_dt.replace(tzinfo=datetime.timezone.utc)
                now_utc = datetime.datetime.now(datetime.timezone.utc)
                min_bookable = now_utc + datetime.timedelta(hours=48)
                if appointment_dt < min_bookable:
                    return jsonify(error="Appointments must be booked at least 48 hours in advance."), 400
            except (ValueError, TypeError) as parse_err:
                print(f"Could not parse appointment datetime: {parse_err}")

        total_price = float(data.get('totalPrice') or data.get('total_price') or 0)
        deposit_amount = int(total_price * 0.10 * 100)  # 10% deposit in cents (matches frontend)

        if deposit_amount < 50:  # Stripe's minimum charge is $0.50
            return jsonify(error="Deposit amount is too low to process."), 400

        # Generate a booking ID (UUID for internal use)
        booking_id = str(uuid.uuid4())
        
        # Generate a user-friendly booking reference
        booking_reference = generate_booking_reference()
        booking_reference = ensure_booking_reference_unique(booking_reference)
        
        # Save temporary booking to Supabase
        # Handle both camelCase (from frontend) and snake_case field names
        temp_booking_data = {
            'id': booking_id,
            'name': data.get('name'),
            'phone': data.get('phone'),
            'email': data.get('email'),
            'appointment-datetime': data.get('appointment-datetime') or data.get('appointmentDateTime'),
            'selected_style': data.get('selected_style') or data.get('selectedStyle'),
            'hair_length': data.get('hair_length') or data.get('hairLength'),
            'hair_option': data.get('hair_option') or data.get('hairOption'),
            'pre_wash_option': data.get('pre_wash_option') or data.get('preWashOption'),
            'detangling_option': data.get('detangling_option') or data.get('detanglingOption'),
            'notes': data.get('notes'),
            'total_price': total_price,
            'duration': int(data.get('duration', 120)),
            'current_hair_image_url': data.get('currentHairImageURL') or data.get('current_hair_image_url'),
            'reference_image_url': data.get('referenceImageURL') or data.get('reference_image_url'),
            'box_braids_variation': data.get('box_braids_variation') or data.get('boxBraidsVariation'),
            'cornrows_variation': data.get('cornrows_variation') or data.get('cornrowsVariation'),
            'two_strand_twists_variation': data.get('two_strand_twists_variation') or data.get('twoStrandTwistsVariation'),
            'status': 'pending_payment',
            'deposit_amount': deposit_amount,
            'booking_id': booking_id,
            'booking_reference': booking_reference
        }
        
        print(f"Temp booking data being saved:")
        print(f"  appointment-datetime: {temp_booking_data.get('appointment-datetime')}")
        print(f"  selected_style: {temp_booking_data.get('selected_style')}")
        print(f"  pre_wash_option: {temp_booking_data.get('pre_wash_option')}")
        print(f"  hair_length: {temp_booking_data.get('hair_length')}")
        print(f"  hair_option: {temp_booking_data.get('hair_option')}")
        print(f"  notes: {temp_booking_data.get('notes')}")
        
        try:
            result = supabase.table('temp_bookings').insert(temp_booking_data).execute()
            print(f"Successfully saved temp booking. Result: {result.data if hasattr(result, 'data') else 'No data'}")
            print(f"Temporary booking saved to Supabase: {booking_id}")
        except Exception as db_error:
            print(f"Error saving to Supabase: {db_error}")
            return jsonify(error=f"Failed to save booking: {str(db_error)}"), 500

        site_url = get_site_url()

        # Create success URL with session ID and booking ID
        success_url = f"{site_url}/api/handle-payment-success?session_id={{CHECKOUT_SESSION_ID}}&booking_id={booking_id}"

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
            success_url=success_url,
            cancel_url=f"{site_url}/booking.html",
            metadata={
                'bookingId': booking_id,
            }
        )
        return jsonify({
            'sessionId': checkout_session.id,
            'url': checkout_session.url
        })

    except Exception as e:
        print(f"Error creating checkout session: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify(error={"message": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


@app.route('/api/stripe-config', methods=['GET'])
def stripe_config():
    """
    Returns the publishable Stripe key for the embedded payment form.
    """
    publishable_key = os.getenv('STRIPE_PUBLISHABLE_KEY')
    if not publishable_key:
        return jsonify(error="Stripe publishable key is not configured."), 500
    return jsonify({'publishableKey': publishable_key})


@app.route('/api/create-payment-intent', methods=['POST', 'OPTIONS'])
def create_payment_intent():
    """
    Creates a PaymentIntent for the embedded Stripe Payment Element flow.
    Saves booking data to Supabase temp_bookings before payment confirmation.
    """
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    if not stripe.api_key:
        return jsonify(error="Stripe is not configured on the server."), 500

    if not supabase:
        return jsonify(error="Database is not configured on the server."), 500

    try:
        data = request.get_json() or {}
        appointment_str = data.get('appointment-datetime') or data.get('appointmentDateTime')
        booking_signature_hash = get_booking_signature_hash(data)
        if appointment_str:
            try:
                appointment_dt = datetime.datetime.fromisoformat(
                    appointment_str.replace('Z', '+00:00')
                )
                if appointment_dt.tzinfo:
                    appointment_dt = appointment_dt.astimezone(datetime.timezone.utc)
                else:
                    appointment_dt = appointment_dt.replace(tzinfo=datetime.timezone.utc)
                now_utc = datetime.datetime.now(datetime.timezone.utc)
                min_bookable = now_utc + datetime.timedelta(hours=48)
                if appointment_dt < min_bookable:
                    return jsonify(error="Appointments must be booked at least 48 hours in advance."), 400
            except (ValueError, TypeError):
                pass

        total_price = float(data.get('totalPrice') or data.get('total_price') or 0)
        deposit_amount = int(round(total_price * 0.10 * 100))

        if deposit_amount < 50:
            return jsonify(error="Deposit amount is too low to process."), 400

        existing_confirmed_booking = find_matching_confirmed_booking(booking_signature_hash, appointment_str)
        if existing_confirmed_booking:
            return jsonify(
                error="A deposit has already been paid for this appointment.",
                bookingReference=existing_confirmed_booking.get('booking_reference'),
            ), 409

        existing_pending_booking = find_matching_pending_temp_booking(booking_signature_hash, appointment_str)
        if existing_pending_booking:
            booking_id = existing_pending_booking.get('id')
            booking_reference = existing_pending_booking.get('booking_reference') or ensure_booking_reference_unique(
                generate_booking_reference()
            )
        else:
            booking_id = str(uuid.uuid4())
            booking_reference = ensure_booking_reference_unique(generate_booking_reference())

        temp_booking_data = {
            'id': booking_id,
            'name': data.get('name'),
            'phone': data.get('phone'),
            'email': data.get('email'),
            'appointment-datetime': data.get('appointment-datetime') or data.get('appointmentDateTime'),
            'selected_style': data.get('selected_style') or data.get('selectedStyle'),
            'hair_length': data.get('hair_length') or data.get('hairLength'),
            'hair_option': data.get('hair_option') or data.get('hairOption'),
            'pre_wash_option': data.get('pre_wash_option') or data.get('preWashOption'),
            'detangling_option': data.get('detangling_option') or data.get('detanglingOption'),
            'notes': data.get('notes'),
            'total_price': total_price,
            'duration': int(data.get('duration', 120)),
            'current_hair_image_url': data.get('currentHairImageURL') or data.get('current_hair_image_url'),
            'reference_image_url': data.get('referenceImageURL') or data.get('reference_image_url'),
            'box_braids_variation': data.get('box_braids_variation') or data.get('boxBraidsVariation'),
            'cornrows_variation': data.get('cornrows_variation') or data.get('cornrowsVariation'),
            'two_strand_twists_variation': data.get('two_strand_twists_variation') or data.get('twoStrandTwistsVariation'),
            'status': 'pending_payment',
            'deposit_amount': deposit_amount,
            'booking_id': booking_id,
            'booking_reference': booking_reference
        }

        if existing_pending_booking:
            supabase.table('temp_bookings').update(temp_booking_data).eq('id', booking_id).execute()
        else:
            supabase.table('temp_bookings').insert(temp_booking_data).execute()

        stripe_customer = get_or_create_stripe_customer(
            temp_booking_data.get('name'),
            temp_booking_data.get('email'),
            temp_booking_data.get('phone'),
        )

        payment_intent = stripe.PaymentIntent.create(
            amount=deposit_amount,
            currency='usd',
            automatic_payment_methods={'enabled': True},
            customer=stripe_customer.id if stripe_customer else None,
            receipt_email=temp_booking_data.get('email') or None,
            metadata={
                'bookingId': booking_id,
                'bookingReference': booking_reference,
                'selectedStyle': temp_booking_data.get('selected_style') or '',
                'customerEmail': temp_booking_data.get('email') or '',
                'bookingSignature': booking_signature_hash,
            },
            description=f"Appointment deposit for {temp_booking_data.get('selected_style') or 'a hairstyle'}",
            idempotency_key=f"booking:{booking_signature_hash}"
        )

        return jsonify({
            'clientSecret': payment_intent.client_secret,
            'bookingId': booking_id,
            'bookingReference': booking_reference
        })
    except stripe.error.AuthenticationError as e:
        print(f"Stripe authentication failed (invalid API key): {e}")
        msg = (
            "Invalid Stripe API key. On your server, set STRIPE_SECRET_KEY to a valid secret key from "
            "Stripe Dashboard → Developers → API keys. Use the same mode (test or live) as your publishable key."
        )
        response = jsonify(error={"message": msg})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500
    except Exception as e:
        print(f"Error creating payment intent: {e}")
        import traceback
        traceback.print_exc()
        err_msg = str(e)
        if "Invalid API key" in err_msg or "api_key" in err_msg.lower():
            err_msg = (
                "Invalid Stripe API key. On your server, set STRIPE_SECRET_KEY to a valid secret key from "
                "Stripe Dashboard → Developers → API keys. Use the same mode (test or live) as your publishable key."
            )
        response = jsonify(error={"message": err_msg})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500


def finalize_temp_booking_payment(booking_id, payment_reference, amount_paid_cents):
    """
    Moves a booking from temp_bookings to bookings after Stripe confirms payment.
    Returns the booking reference used for the success page redirect.
    """
    print(f"[Resend] finalize_temp_booking_payment called: booking_id={booking_id}", flush=True)
    site_url = get_site_url()

    existing_booking = supabase.table('bookings').select('id').eq('id', booking_id).execute()
    if existing_booking.data and len(existing_booking.data) > 0:
        return redirect(f"{site_url}/booking-success.html?session_id={quote(payment_reference)}")

    temp_booking_result = supabase.table('temp_bookings').select('*').eq('id', booking_id).execute()
    if not temp_booking_result.data or len(temp_booking_result.data) == 0:
        raise Exception("Temporary booking not found")

    temp_booking = temp_booking_result.data[0]
    duplicate_booking = find_matching_confirmed_booking(
        get_booking_signature_hash(temp_booking),
        temp_booking.get('appointment-datetime') or temp_booking.get('appointment_datetime')
    )
    if duplicate_booking and duplicate_booking.get('id') != booking_id:
        supabase.table('temp_bookings').delete().eq('id', booking_id).execute()
        existing_payment_reference = (
            duplicate_booking.get('stripe_session_id') or
            duplicate_booking.get('payment_session_id') or
            payment_reference
        )
        return redirect(f"{site_url}/booking-success.html?session_id={quote(existing_payment_reference)}")

    calendar_event_id = None
    try:
        print("Attempting to create Google Calendar event...")
        calendar_event_id = create_calendar_event(temp_booking)
        if calendar_event_id:
            print(f"✅ Google Calendar event created successfully: {calendar_event_id}")
        else:
            print("⚠️  Google Calendar event creation returned None")
    except Exception as calendar_error:
        print(f"❌ Calendar event creation failed: {calendar_error}")
        import traceback
        traceback.print_exc()

    appointment_datetime_value = (
        temp_booking.get('appointment-datetime') or
        temp_booking.get('appointment_datetime') or
        temp_booking.get('appointmentDateTime')
    )
    booking_data = {
        'id': booking_id,
        'name': temp_booking.get('name'),
        'phone': temp_booking.get('phone'),
        'email': temp_booking.get('email'),
        'appointment-datetime': appointment_datetime_value,
        'selected_style': temp_booking.get('selected_style') or temp_booking.get('selectedStyle'),
        'hair_length': temp_booking.get('hair_length') or temp_booking.get('hairLength'),
        'hair_option': temp_booking.get('hair_option') or temp_booking.get('hairOption'),
        'pre_wash_option': temp_booking.get('pre_wash_option') or temp_booking.get('preWashOption'),
        'detangling_option': temp_booking.get('detangling_option') or temp_booking.get('detanglingOption'),
        'notes': temp_booking.get('notes') or '',
        'total_price': float(temp_booking.get('total_price', 0)),
        'duration': temp_booking.get('duration'),
        'current_hair_image_url': temp_booking.get('current_hair_image_url') or temp_booking.get('currentHairImageURL'),
        'reference_image_url': temp_booking.get('reference_image_url') or temp_booking.get('referenceImageURL'),
        'box_braids_variation': temp_booking.get('box_braids_variation') or temp_booking.get('boxBraidsVariation'),
        'cornrows_variation': temp_booking.get('cornrows_variation') or temp_booking.get('cornrowsVariation'),
        'two_strand_twists_variation': temp_booking.get('two_strand_twists_variation') or temp_booking.get('twoStrandTwistsVariation'),
        'status': 'confirmed',
        'deposit_paid': amount_paid_cents / 100.0,
        'deposit_amount': amount_paid_cents,
        'payment_session_id': payment_reference,
        'stripe_session_id': payment_reference,
        'booking_reference': temp_booking.get('booking_reference'),
    }
    if calendar_event_id:
        booking_data['calendar_event_id'] = calendar_event_id

    supabase.table('bookings').insert(booking_data).execute()
    supabase.table('temp_bookings').delete().eq('id', booking_id).execute()

    customer_email = booking_data.get('email')
    print(f"[Resend] send_booking_confirmation={send_booking_confirmation is not None}, booking email={repr(customer_email)}", flush=True)
    if not customer_email:
        print("[Resend] Skipping confirmation: no email on booking.", flush=True)
    elif send_booking_confirmation and customer_email:
        lookup_url = f"{site_url}/cancel.html?bookingId={quote(booking_data.get('booking_reference') or booking_id)}"
        print(f"Attempting to send confirmation email to {customer_email} ...", flush=True)
        try:
            ok = send_booking_confirmation(
                to_email=booking_data.get('email'),
                customer_name=booking_data.get('name'),
                booking_reference=booking_data.get('booking_reference'),
                appointment_datetime=appointment_datetime_value,
                deposit_paid=booking_data.get('deposit_paid'),
                selected_style=booking_data.get('selected_style'),
                duration=booking_data.get('duration'),
                notes=booking_data.get('notes'),
                lookup_booking_url=lookup_url,
            )
            if not ok:
                print("Resend: confirmation email was not sent (check logs above)", flush=True)
        except Exception as email_err:
            print(f"Confirmation email failed (booking saved): {email_err}")
            import traceback
            traceback.print_exc()

    return redirect(f"{site_url}/booking-success.html?session_id={quote(payment_reference)}")


@app.route('/api/handle-payment-success', methods=['GET'])
def handle_payment_success():
    """
    Handles successful Stripe returns for both Checkout Sessions and Payment Intents.
    """
    print("\n--- /api/handle-payment-success endpoint hit (Flask) ---", flush=True)
    site_url = get_site_url()

    if not supabase:
        print("Error: Supabase is not configured on the server.")
        return redirect(f"{site_url}/booking-error.html?error=Database%20not%20configured")

    try:
        session_id = request.args.get('session_id')
        booking_id = request.args.get('booking_id')
        payment_intent_id = request.args.get('payment_intent')

        if session_id:
            print(f"Received Checkout session_id: {session_id}, booking_id: {booking_id}")
            if not booking_id:
                raise Exception("Missing booking ID for Checkout session confirmation")

            session = stripe.checkout.Session.retrieve(session_id)
            print(f"Checkout session payment status: {session.payment_status}")
            if session.payment_status != 'paid':
                raise Exception("Payment not completed")

            return finalize_temp_booking_payment(booking_id, session_id, session.amount_total)

        if payment_intent_id:
            print(f"Received PaymentIntent ID: {payment_intent_id}")
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            print(f"PaymentIntent status: {payment_intent.status}")
            if payment_intent.status != 'succeeded':
                raise Exception("Payment not completed")

            booking_id = booking_id or payment_intent.metadata.get('bookingId')
            if not booking_id:
                raise Exception("Missing booking ID in payment metadata")

            amount_paid_cents = payment_intent.amount_received or payment_intent.amount
            return finalize_temp_booking_payment(booking_id, payment_intent.id, amount_paid_cents)

        raise Exception("Missing payment information")
    except Exception as e:
        print(f"An exception occurred in payment success handler: {e}")
        import traceback
        traceback.print_exc()
        return redirect(f"{site_url}/booking-error.html?error={quote(str(e))}")


# --- Firebase booking_success endpoint (commented out - using Supabase handle_payment_success instead) ---
# @app.route('/api/booking-success', methods=['POST'])
# def booking_success():
#     """
#     Handles the successful payment callback from Stripe.
#     Verifies the session and saves the booking to Firebase.
#     """
#     print("\n--- /api/booking-success endpoint hit ---")
#
#     if not db:
#         print("Error: Database is not configured on the server.")
#         return jsonify(error="Database is not configured on the server."), 500
#
#     session_id = request.json.get('session_id')
#     if not session_id:
#         print("Error: Session ID is missing from the request.")
#         return jsonify(error='Session ID is missing'), 400
#
#     print(f"Received session_id: {session_id}")
#
#     try:
#         session = stripe.checkout.Session.retrieve(session_id)
#         print(
#             f"Successfully retrieved Stripe session. Payment Status: {session.payment_status}")
#
#         if session.payment_status == 'paid':
#             metadata = session.metadata
#             print(f"Payment successful. Metadata received: {metadata}")
#
#             total_price = float(metadata.get('totalPrice', 0))
#
#             booking_data = {
#                 'customerName': metadata.get('customerName'),
#                 'phoneNumber': metadata.get('phoneNumber'),
#                 'email': metadata.get('email'),
#                 'appointmentDateTime': metadata.get('appointmentDateTime'),
#                 'selectedStyle': metadata.get('selectedStyle'),
#                 'hairLength': metadata.get('hairLength'),
#                 'hairOption': metadata.get('hairOption'),
#                 'preWashOption': metadata.get('preWashOption'),
#                 'detanglingOption': metadata.get('detanglingOption'),
#                 'notes': metadata.get('notes'),
#                 'totalPrice': total_price,
#                 'depositPaid': session.amount_total / 100.0,
#                 'duration': metadata.get('duration'),
#                 'status': 'confirmed',
#                 'createdAt': firestore.SERVER_TIMESTAMP,
#                 'stripeSessionId': session_id,
#                 'currentHairImageURL': metadata.get('currentHairImageURL'),
#                 'referenceImageURL': metadata.get('referenceImageURL'),
#                 'boxBraidsVariation': metadata.get('boxBraidsVariation'),
#                 'cornrowsVariation': metadata.get('cornrowsVariation'),
#                 'twoStrandTwistsVariation': metadata.get('twoStrandTwistsVariation'),
#                 'currentHairImage': metadata.get('currentHairImage'),
#                 'referenceImage': metadata.get('referenceImage')
#             }
#
#             print(
#                 f"Attempting to save following booking data to Firebase: {booking_data}")
#
#             update_time, doc_ref = db.collection('bookings').add(booking_data)
#             print(
#                 f"Successfully saved booking to Firebase. Document ID: {doc_ref.id}")
#
#             # Convert non-serializable fields for the JSON response
#             response_data = booking_data.copy()
#             response_data['createdAt'] = datetime.datetime.utcnow().isoformat()
#
#             return jsonify({'status': 'success', 'booking': response_data})
#         else:
#             print(
#                 f"Payment not successful. Status was: {session.payment_status}")
#             return jsonify(
#                 {'status': 'error', 'message': 'Payment not successful.'}), 400
#
#     except Exception as e:
#         print(f"An exception occurred in booking success endpoint: {e}")
#         return jsonify(error={"message": str(e)}), 500


@app.route('/api/get-booking-details', methods=['GET'])
def get_booking_details():
    """
    Get booking details by booking ID or booking reference.
    Supports both UUID and booking_reference lookup.
    """
    if not supabase:
        return jsonify(error="Database is not configured."), 500

    try:
        booking_id = request.args.get('id')
        if not booking_id:
            return jsonify(error="Booking ID is required."), 400

        booking_id = booking_id.strip()
        result = None
        
        # Check if booking_id looks like a UUID (contains hyphens and is long)
        # UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
        
        # Try UUID lookup only if it looks like a UUID
        if uuid_pattern.match(booking_id):
            try:
                result = supabase.table('bookings').select('*').eq('id', booking_id).execute()
            except Exception as uuid_error:
                # If UUID lookup fails, try booking_reference instead
                print(f"UUID lookup failed, trying booking_reference: {uuid_error}")
                result = None
        
        # If not found by UUID (or not a UUID), try booking_reference
        if not result or not result.data or len(result.data) == 0:
            try:
                result = supabase.table('bookings').select('*').eq('booking_reference', booking_id.upper()).execute()
            except Exception as ref_error:
                print(f"Booking reference lookup failed: {ref_error}")
                return jsonify(error="Invalid booking ID format. Please check your Booking ID and try again."), 400
        
        if result.data and len(result.data) > 0:
            booking = result.data[0]
            return jsonify({
                'id': booking.get('id'),
                'booking_reference': booking.get('booking_reference'),
                'name': booking.get('name'),
                'email': booking.get('email'),
                'phone': booking.get('phone'),
                'appointment-datetime': booking.get('appointment-datetime'),
                'selected_style': booking.get('selected_style'),
                'hair_length': booking.get('hair_length'),
                'hair_option': booking.get('hair_option'),
                'pre_wash_option': booking.get('pre_wash_option'),
                'detangling_option': booking.get('detangling_option'),
                'notes': booking.get('notes'),
                'total_price': float(booking.get('total_price', 0)),
                'duration': booking.get('duration'),
                'status': booking.get('status'),
                'deposit_paid': float(booking.get('deposit_paid', 0)),
                'deposit_amount': booking.get('deposit_amount'),
                'payment_session_id': booking.get('payment_session_id'),
                'stripe_session_id': booking.get('stripe_session_id'),
                'calendar_event_id': booking.get('calendar_event_id'),
                'current_hair_image_url': booking.get('current_hair_image_url'),
                'reference_image_url': booking.get('reference_image_url'),
                'box_braids_variation': booking.get('box_braids_variation'),
                'cornrows_variation': booking.get('cornrows_variation'),
                'two_strand_twists_variation': booking.get('two_strand_twists_variation'),
                'cancelled_at': booking.get('cancelled_at'),
                'created_at': booking.get('created_at'),
                'updated_at': booking.get('updated_at')
            })
        else:
            return jsonify(error="Booking not found."), 404

    except Exception as e:
        print(f"Error fetching booking details: {e}")
        import traceback
        traceback.print_exc()
        # Return user-friendly error message
        error_message = str(e)
        if 'uuid' in error_message.lower() or '22P02' in error_message:
            return jsonify(error="Invalid booking ID format. Please check your Booking ID and try again."), 400
        elif 'not found' in error_message.lower():
            return jsonify(error="Booking not found. Please check your Booking ID and try again."), 404
        else:
            return jsonify(error="An error occurred while fetching booking details. Please try again."), 500


@app.route('/api/get-booking-by-session', methods=['GET'])
def get_booking_by_session():
    """
    Get booking details by Stripe session ID.
    Used by booking success page to display booking information.
    """
    if not supabase:
        return jsonify(error="Database is not configured."), 500

    try:
        session_id = request.args.get('session_id')
        if not session_id:
            return jsonify(error="Session ID is required."), 400

        # Query Supabase for booking with this session ID
        result = supabase.table('bookings').select('*').eq('stripe_session_id', session_id).execute()
        
        if not result.data or len(result.data) == 0:
            # Try payment_session_id as fallback
            result = supabase.table('bookings').select('*').eq('payment_session_id', session_id).execute()
        
        if result.data and len(result.data) > 0:
            booking = result.data[0]
            return jsonify({
                'id': booking.get('id'),
                'booking_id': booking.get('id'),  # Also return as booking_id for consistency
                'booking_reference': booking.get('booking_reference'),  # User-friendly booking reference
                'deposit_paid': float(booking.get('deposit_paid', 0)),
                'deposit_amount': booking.get('deposit_amount'),  # In cents
                'calendar_event_id': booking.get('calendar_event_id'),
                'status': booking.get('status'),
                'name': booking.get('name'),
                'selected_style': booking.get('selected_style'),
                'appointment-datetime': booking.get('appointment-datetime')
            })
        else:
            return jsonify(error="Booking not found."), 404

    except Exception as e:
        print(f"Error fetching booking by session: {e}")
        import traceback
        traceback.print_exc()
        return jsonify(error=str(e)), 500


@app.route('/api/get-bookings', methods=['GET'])
def get_bookings():
    """
    Retrieves all bookings from Supabase database.
    """
    if not supabase:
        return jsonify(error="Database is not configured."), 500

    try:
        # Get all bookings from Supabase
        result = supabase.table('bookings').select('*').execute()
        all_bookings = result.data

        # Convert field names to match frontend expectations (camelCase)
        formatted_bookings = []
        for booking in all_bookings:
            formatted_booking = {
                'id': booking.get('id'),
                'bookingReference': booking.get('booking_reference'),  # User-friendly booking reference
                'customerName': booking.get('name'),
                'phoneNumber': booking.get('phone'),
                'email': booking.get('email'),
                'appointmentDateTime': booking.get('appointment-datetime'),
                'selectedStyle': booking.get('selected_style'),
                'hairLength': booking.get('hair_length'),
                'hairOption': booking.get('hair_option'),
                'preWashOption': booking.get('pre_wash_option'),
                'detanglingOption': booking.get('detangling_option'),
                'notes': booking.get('notes'),
                'totalPrice': float(booking.get('total_price', 0)),
                'duration': booking.get('duration'),
                'status': booking.get('status'),
                'depositPaid': float(booking.get('deposit_paid', 0)),
                'stripeSessionId': booking.get('stripe_session_id') or booking.get('payment_session_id'),
                'currentHairImageURL': booking.get('current_hair_image_url'),
                'referenceImageURL': booking.get('reference_image_url'),
                'boxBraidsVariation': booking.get('box_braids_variation'),
                'cornrowsVariation': booking.get('cornrows_variation'),
                'twoStrandTwistsVariation': booking.get('two_strand_twists_variation'),
                'createdAt': booking.get('created_at'),
                'updatedAt': booking.get('updated_at'),
                'cancelledAt': booking.get('cancelled_at'),
            }
            formatted_bookings.append(formatted_booking)

        return jsonify(formatted_bookings)
    except Exception as e:
        print(f"Error fetching bookings: {e}")
        import traceback
        traceback.print_exc()
        return jsonify(error=f"An error occurred while fetching bookings: {e}"), 500


@app.route('/api/get-booking-months', methods=['GET'])
def get_booking_months():
    """
    Returns a sorted list of unique months that have bookings.
    Uses Supabase to query bookings.
    """
    if not supabase:
        return jsonify(error="Database is not configured."), 500
    try:
        # Get all bookings from Supabase
        result = supabase.table('bookings').select('appointment-datetime').execute()
        all_bookings = result.data

        months = set()
        for booking in all_bookings:
            appointment_datetime = booking.get('appointment-datetime')
            if appointment_datetime:
                try:
                    # Parse the datetime string
                    dt = datetime.datetime.fromisoformat(appointment_datetime.split('T')[0])
                    months.add(datetime.date(dt.year, dt.month, 1))
                except (ValueError, TypeError):
                    # Handle cases where the date format might be different or invalid
                    continue

        # Sort dates, newest first
        sorted_months = sorted(list(months), reverse=True)

        # Format for response
        formatted_months = [{'year': d.year, 'month': d.month}
            for d in sorted_months]

        return jsonify(formatted_months)
    except Exception as e:
        print(f"Error fetching booking months: {e}")
        import traceback
        traceback.print_exc()
        return jsonify(error=f"An error occurred: {e}"), 500


@app.route('/api/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """
    Retrieves aggregated statistics for the admin dashboard.
    Uses Supabase to query bookings.
    """
    if not supabase:
        return jsonify(error="Database is not configured."), 500

    try:
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)

        # Get all bookings from Supabase
        result = supabase.table('bookings').select('*').execute()
        all_bookings_raw = result.data

        # Filter by date if specified
        all_bookings_data = []
        for booking in all_bookings_raw:
            appointment_datetime = booking.get('appointment-datetime')
            if not appointment_datetime:
                continue

            try:
                appt_dt = datetime.datetime.fromisoformat(appointment_datetime)
                
                # Apply date filters
                if year and month:
                    start_of_month = datetime.datetime(year, month, 1)
                    if month == 12:
                        end_of_month = datetime.datetime(year + 1, 1, 1)
                    else:
                        end_of_month = datetime.datetime(year, month + 1, 1)
                    if not (start_of_month <= appt_dt < end_of_month):
                        continue
                elif year:
                    start_of_year = datetime.datetime(year, 1, 1)
                    end_of_year = datetime.datetime(year + 1, 1, 1)
                    if not (start_of_year <= appt_dt < end_of_year):
                        continue

                # Convert to frontend format
                formatted_booking = {
                    'id': booking.get('id'),
                    'customerName': booking.get('name'),
                    'phoneNumber': booking.get('phone'),
                    'email': booking.get('email'),
                    'appointmentDateTime': appointment_datetime,
                    'selectedStyle': booking.get('selected_style'),
                    'hairLength': booking.get('hair_length'),
                    'hairOption': booking.get('hair_option'),
                    'preWashOption': booking.get('pre_wash_option'),
                    'detanglingOption': booking.get('detangling_option'),
                    'notes': booking.get('notes'),
                    'totalPrice': float(booking.get('total_price', 0)),
                    'duration': booking.get('duration'),
                    'status': booking.get('status'),
                    'depositPaid': float(booking.get('deposit_paid', 0)),
                    'stripeSessionId': booking.get('stripe_session_id') or booking.get('payment_session_id'),
                    'currentHairImageURL': booking.get('current_hair_image_url'),
                    'referenceImageURL': booking.get('reference_image_url'),
                    'boxBraidsVariation': booking.get('box_braids_variation'),
                    'cornrowsVariation': booking.get('cornrows_variation'),
                    'twoStrandTwistsVariation': booking.get('two_strand_twists_variation'),
                    'createdAt': booking.get('created_at'),
                    'updatedAt': booking.get('updated_at'),
                    'cancelledAt': booking.get('cancelled_at'),
                }
                all_bookings_data.append(formatted_booking)
            except (ValueError, TypeError) as e:
                print(f"Error processing booking: {e}")
                continue

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
        import traceback
        traceback.print_exc()
        return jsonify(error=f"An error occurred while fetching dashboard stats: {e}"), 500

@app.route('/api/get-unavailable-times', methods=['GET'])
def get_unavailable_times():
    """
    Retrieves all booked time slots to prevent double bookings.
    Returns a list of time slots that are already booked.
    Uses Supabase to query confirmed bookings.
    """
    if not supabase:
        return jsonify(error="Database is not configured."), 500

    try:
        # Get the date from query parameters
        date = request.args.get('date')
        if not date:
            return jsonify(error="Date parameter is required"), 400

        # Get start and end of the requested date
        start_date = datetime.datetime.fromisoformat(date)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = datetime.datetime.fromisoformat(date)
        end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Query Supabase for bookings on the specified date
        # Get all confirmed bookings (not cancelled)
        bookings_result = supabase.table('bookings').select('*').eq('status', 'confirmed').execute()
        
        unavailable_times = []
        for booking in bookings_result.data:
            appointment_datetime_str = booking.get('appointment-datetime')
            if not appointment_datetime_str:
                continue

            try:
                appointment_time = datetime.datetime.fromisoformat(appointment_datetime_str)
                
                # Filter by date if provided
                if date:
                    if appointment_time.date() != start_date.date():
                        continue

                # Get duration in minutes (default to 120)
                duration = int(booking.get('duration', 120))

                # Calculate end time
                end_time = appointment_time + datetime.timedelta(minutes=duration)
                
                unavailable_times.append({
                    'start': appointment_time.isoformat(),
                    'end': end_time.isoformat(),
                    'duration': duration,
                })
            except (ValueError, TypeError) as e:
                print(f"Error processing booking {booking.get('id')}: {e}")
                continue

        return jsonify({'unavailableTimes': unavailable_times})

    except Exception as e:
        print(f"Error fetching unavailable times: {e}")
        import traceback
        traceback.print_exc()
        return jsonify(error=f"An error occurred while fetching unavailable times: {e}"), 500


@app.route('/api/lookup-booking', methods=['POST', 'OPTIONS'])
def lookup_booking():
    """
    Lookup a booking by email and phone number.
    Returns booking ID and details if found.
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    if not supabase:
        return jsonify(error="Database is not configured."), 500

    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        phone = (data.get('phone') or '').strip()

        if not email:
            return jsonify(error="Email is required."), 400
        if not phone:
            return jsonify(error="Phone number is required."), 400

        # Normalize phone number (remove spaces, dashes, parentheses)
        phone_normalized = ''.join(filter(str.isdigit, phone))

        # Search for bookings matching email and phone
        # We'll search by email first, then filter by phone
        booking_result = supabase.table('bookings').select('id, booking_reference, name, email, phone, appointment-datetime, selected_style, status').eq('email', email).execute()
        
        if not booking_result.data or len(booking_result.data) == 0:
            return jsonify(error="No booking found with that email address."), 404

        # Filter by phone number (normalize both for comparison)
        matching_bookings = []
        for booking in booking_result.data:
            booking_phone = ''.join(filter(str.isdigit, str(booking.get('phone', ''))))
            if booking_phone == phone_normalized:
                matching_bookings.append(booking)

        if len(matching_bookings) == 0:
            return jsonify(error="No booking found with that email and phone combination."), 404

        # Return the most recent confirmed booking (or first one if multiple)
        # Filter out cancelled bookings unless that's all there is
        active_bookings = [b for b in matching_bookings if b.get('status', '').lower() != 'cancelled']
        if active_bookings:
            booking = active_bookings[0]  # Get most recent active booking
        else:
            booking = matching_bookings[0]  # Return cancelled if that's all there is

        return jsonify({
            'booking_id': booking.get('id'),
            'booking_reference': booking.get('booking_reference'),  # User-friendly reference
            'name': booking.get('name'),
            'appointment_datetime': booking.get('appointment-datetime'),
            'selected_style': booking.get('selected_style'),
            'status': booking.get('status')
        }), 200

    except Exception as e:
        print(f"Error looking up booking: {e}")
        import traceback
        traceback.print_exc()
        return jsonify(error=str(e)), 500


@app.route('/api/cancel-booking', methods=['POST', 'OPTIONS'])
def cancel_booking():
    """
    Cancel a booking by ID. Requires the booking's email for verification.
    Sets status to 'cancelled'. (Google Calendar event deletion can be added when integrated.)
    Uses Supabase to update booking status.
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    if not supabase:
        return jsonify(error="Database is not configured."), 500

    try:
        data = request.get_json() or {}
        booking_id = (data.get('bookingId') or data.get('booking_id') or '').strip()
        email = (data.get('email') or '').strip().lower()

        if not booking_id:
            return jsonify(error="Booking ID is required."), 400
        if not email:
            return jsonify(error="Email is required to cancel."), 400

        # Check if booking_id looks like a UUID
        uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
        booking_result = None
        
        # Try UUID lookup only if it looks like a UUID
        if uuid_pattern.match(booking_id):
            try:
                booking_result = supabase.table('bookings').select('*').eq('id', booking_id).execute()
            except Exception as uuid_error:
                # If UUID lookup fails, try booking_reference instead
                print(f"UUID lookup failed, trying booking_reference: {uuid_error}")
                booking_result = None
        
        # If not found by UUID (or not a UUID), try booking_reference
        if not booking_result or not booking_result.data or len(booking_result.data) == 0:
            try:
                booking_result = supabase.table('bookings').select('*').eq('booking_reference', booking_id.upper()).execute()
            except Exception as ref_error:
                print(f"Booking reference lookup failed: {ref_error}")
                return jsonify(error="Invalid booking ID format. Please check your Booking ID and try again."), 400

        if not booking_result.data or len(booking_result.data) == 0:
            return jsonify(error="Booking not found. Please check your Booking ID."), 404

        booking = booking_result.data[0]
        booking_email = (booking.get('email') or '').strip().lower()
        
        if booking_email != email:
            return jsonify(error="Email does not match this booking."), 403

        current_status = (booking.get('status') or '').lower()
        if current_status == 'cancelled':
            return jsonify(message="Booking was already cancelled.", cancelled=True), 200

        # Remove event from Google Calendar if it was created
        calendar_event_id = booking.get('calendar_event_id')
        if calendar_event_id:
            try:
                success = delete_calendar_event(calendar_event_id)
                if success:
                    print(f"Google Calendar event deleted: {calendar_event_id}")
                else:
                    print(f"Failed to delete Google Calendar event: {calendar_event_id}")
            except Exception as e:
                print(f"Calendar event deletion failed: {e}")
                import traceback
                traceback.print_exc()

        # Update booking status to cancelled
        update_data = {
            'status': 'cancelled',
            'cancelled_at': datetime.datetime.utcnow().isoformat(),
            'updated_at': datetime.datetime.utcnow().isoformat()
        }
        
        supabase.table('bookings').update(update_data).eq('id', booking_id).execute()

        return jsonify(message="Booking cancelled successfully.", cancelled=True), 200
    except Exception as e:
        print(f"Error cancelling booking: {e}")
        import traceback
        traceback.print_exc()
        # Return user-friendly error message
        error_message = str(e)
        if 'uuid' in error_message.lower() or '22P02' in error_message:
            return jsonify(error="Invalid booking ID format. Please check your Booking ID and try again."), 400
        elif 'not found' in error_message.lower():
            return jsonify(error="Booking not found. Please check your Booking ID and try again."), 404
        else:
            return jsonify(error="An error occurred while cancelling your booking. Please try again."), 500


# --- HTML Page Routes ---
# These routes serve static HTML files
# Note: API routes (defined above) take precedence

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

@app.route('/cancel.html')
def serve_cancel():
    return send_file('cancel.html')

@app.route('/booking-details.html')
def serve_booking_details():
    return send_file('booking-details.html')

# Catch-all route for other static files (CSS, JS, images)
# This must come AFTER API routes to avoid conflicts
# IMPORTANT: This route only handles GET requests to prevent intercepting API POST requests
@app.route('/<path:filename>', methods=['GET'])
def serve_static_files(filename):
    # Don't serve API routes as static files
    if filename.startswith('api/'):
        return "API endpoint not found", 404
    
    # Only serve specific file types
    allowed_extensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.json', '.html']
    if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
        return "File type not allowed", 403
    
    try:
        return send_file(filename)
    except FileNotFoundError:
        return "File not found", 404

if __name__ == '__main__':
    app.run(port=5500, debug=True, use_reloader=False) 