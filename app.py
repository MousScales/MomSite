from flask import Flask, request, jsonify, send_file, redirect
from flask_cors import CORS
from google.oauth2 import service_account
from googleapiclient.discovery import build
import datetime
import stripe
import os
from urllib.parse import quote
from werkzeug.utils import secure_filename
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure upload settings
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Create uploads directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

SCOPES = ['https://www.googleapis.com/auth/calendar']
SERVICE_ACCOUNT_FILE = 'service_account.json'  # Place your file in the project root
CALENDAR_ID = 'bizmoustaphagueye@gmail.com'  # Your Google Calendar ID

# --- Stripe Configuration ---
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

# --- Hair Length Data for Pricing/Duration ---
HAIR_LENGTH_DATA = {
    'short': { 
        'price': 175, 
        'deposit': 53, 
        'time': '3 hours', 
        'durationHours': 3,
        'knotlessPrice': 200,
        'knotlessDeposit': 60,
        'addedHairPrice': 225,
        'addedHairDeposit': 68,
        'knotlessAddedHairPrice': 250,
        'knotlessAddedHairDeposit': 75
    },
    'medium': { 
        'price': 250, 
        'deposit': 75, 
        'time': '4 hours', 
        'durationHours': 4,
        'knotlessPrice': 275,
        'knotlessDeposit': 83,
        'addedHairPrice': 300,
        'addedHairDeposit': 90,
        'knotlessAddedHairPrice': 325,
        'knotlessAddedHairDeposit': 98
    },
    'long': { 
        'price': 300, 
        'deposit': 90, 
        'time': '5 hours', 
        'durationHours': 5,
        'knotlessPrice': 325,
        'knotlessDeposit': 98,
        'addedHairPrice': 350,
        'addedHairDeposit': 105,
        'knotlessAddedHairPrice': 375,
        'knotlessAddedHairDeposit': 113
    },
    'extra-long': { 
        'price': 350, 
        'deposit': 105, 
        'time': '6 hours', 
        'durationHours': 6,
        'knotlessPrice': 375,
        'knotlessDeposit': 113,
        'addedHairPrice': 400,
        'addedHairDeposit': 120,
        'knotlessAddedHairPrice': 425,
        'knotlessAddedHairDeposit': 128
    }
}

credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)

service = build('calendar', 'v3', credentials=credentials)

def create_calendar_event(name, phone, style, hair_length, date_str, time_str, notes='', box_braids_variation='', hair_option='', cornrows_variation='', two_strand_twists_variation='', current_hair_image='', reference_image='', promo_code='', discount_amount=0, final_price=0):
    """Helper function to create a Google Calendar event"""
    try:
        # Calculate start and end times
        duration_hours = HAIR_LENGTH_DATA.get(hair_length, {}).get('durationHours', 3)
        
        # Parse the date and time
        appointment_datetime = datetime.datetime.strptime(f'{date_str} {time_str}', '%Y-%m-%d %H:%M')
        
        # Convert to timezone aware datetime (EST/EDT)
        timezone_offset = datetime.timedelta(hours=-5)  # EST is UTC-5
        appointment_datetime_aware = appointment_datetime.replace(tzinfo=datetime.timezone(timezone_offset))
        start_time_iso = appointment_datetime_aware.isoformat()

        end_datetime_aware = appointment_datetime_aware + datetime.timedelta(hours=duration_hours)
        end_time_iso = end_datetime_aware.isoformat()

        # Create the event description
        description_parts = [
            f'Phone: {phone}',
            f'Style: {style}',
            f'Hair Length: {hair_length}'
        ]
        
        if style == 'Box Braids' and box_braids_variation:
            description_parts.append(f'Type: {box_braids_variation.title()} Box Braids')
        
        if style == 'Cornrows' and cornrows_variation:
            cornrows_description = 'Designed Cornrows' if cornrows_variation == 'designed' else 'Straight Back Cornrows'
            description_parts.append(f'Style: {cornrows_description}')
        
        if style == 'Two Strand Twists' and two_strand_twists_variation:
            twists_description = 'Two Strand Twists with Braided Roots' if two_strand_twists_variation == 'braided-roots' else 'Regular Two Strand Twists'
            description_parts.append(f'Style: {twists_description}')
        
        if hair_option:
            hair_description = 'With Hair Extensions' if hair_option == 'added' else 'Natural Hair Only'
            description_parts.append(f'Hair: {hair_description}')
        
        # Add pricing information
        if final_price > 0:
            description_parts.append(f'Total Price: ${final_price}')
            
        if promo_code and discount_amount > 0:
            description_parts.append(f'Promo Code: {promo_code} (Saved ${discount_amount})')
        
        if current_hair_image:
            description_parts.append(f'Current Hair Photo: {current_hair_image} (check uploads folder)')
        
        if reference_image:
            description_parts.append(f'Reference Image: {reference_image} (check uploads folder)')
        
        if notes:
            description_parts.append(f'Notes: {notes}')
            
        description = '\n'.join(description_parts)
        
        # Create the calendar event
        event = {
            'summary': f'Hair Appointment: {name}',
            'description': description,
            'start': {'dateTime': start_time_iso, 'timeZone': 'America/New_York'},
            'end': {'dateTime': end_time_iso, 'timeZone': 'America/New_York'},
            'colorId': '8',  # Use a nice color for hair appointments
        }

        created_event = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()
        print(f'✅ Google Calendar event created successfully: {created_event.get("htmlLink")}')
        return created_event
        
    except Exception as e:
        print(f'❌ Error creating Google Calendar event: {e}')
        raise e

# --- Endpoint to create Stripe Checkout Session ---
@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout_session():
    try:
        # Handle both JSON and FormData
        if request.is_json:
            data = request.json
            uploaded_file = None
            current_hair_file = None
        else:
            # Handle FormData (when file is uploaded)
            data = request.form.to_dict()
            uploaded_file = request.files.get('reference_image')
            current_hair_file = request.files.get('current_hair_image')
        
        name = data.get('name')
        phone = data.get('phone')
        style = data.get('style')
        hair_length = data.get('hair_length')
        date_str = data.get('date')
        time_str = data.get('time')
        notes = data.get('notes', '').strip()
        box_braids_variation = data.get('box_braids_variation', '')
        hair_option = data.get('hair_option', '')
        cornrows_variation = data.get('cornrows_variation', '')
        two_strand_twists_variation = data.get('two_strand_twists_variation', '')
        
        # Handle file uploads
        reference_image_filename = ''
        current_hair_image_filename = ''
        
        if uploaded_file and allowed_file(uploaded_file.filename):
            # Generate a unique filename
            filename = str(uuid.uuid4()) + '_' + secure_filename(uploaded_file.filename)
            uploaded_file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            reference_image_filename = filename
            
        if current_hair_file and allowed_file(current_hair_file.filename):
            # Generate a unique filename
            filename = str(uuid.uuid4()) + '_' + secure_filename(current_hair_file.filename)
            current_hair_file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            current_hair_image_filename = filename

        # Get pricing based on hair length and options
        length_data = HAIR_LENGTH_DATA.get(hair_length, HAIR_LENGTH_DATA['medium'])
        base_price = length_data['price']
        deposit_amount = length_data['deposit']
        
        # Adjust price based on options
        if style == 'Box Braids' and box_braids_variation == 'knotless':
            if hair_option == 'added':
                base_price = length_data['knotlessAddedHairPrice']
                deposit_amount = length_data['knotlessAddedHairDeposit']
            else:
                base_price = length_data['knotlessPrice']
                deposit_amount = length_data['knotlessDeposit']
        elif hair_option == 'added':
            base_price = length_data['addedHairPrice']
            deposit_amount = length_data['addedHairDeposit']

        # Create Stripe checkout session
        success_url = request.host_url.rstrip('/') + '/booking-success?session_id={CHECKOUT_SESSION_ID}'
        cancel_url = request.host_url.rstrip('/') + '/booking.html'

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'Deposit for {style}',
                        'description': f'Hair Length: {hair_length}, Date: {date_str}, Time: {time_str}',
                    },
                    'unit_amount': int(deposit_amount * 100),  # Convert to cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'name': name,
                'phone': phone,
                'style': style,
                'hair_length': hair_length,
                'date': date_str,
                'time': time_str,
                'notes': notes[:500] if notes else '',  # Limit notes to 500 chars for metadata
                'box_braids_variation': box_braids_variation,
                'hair_option': hair_option,
                'cornrows_variation': cornrows_variation,
                'two_strand_twists_variation': two_strand_twists_variation,
                'reference_image': reference_image_filename,
                'current_hair_image': current_hair_image_filename,
                'total_price': str(base_price),
                'deposit_amount': str(deposit_amount)
            }
        )
        
        return jsonify({'id': checkout_session.id})

    except Exception as e:
        print(f'Error creating checkout session: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return 'Invalid signature', 400

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Get customer details from session metadata
        metadata = session.metadata
        name = metadata.get('name', '')
        phone = metadata.get('phone', '')
        style = metadata.get('style', '')
        hair_length = metadata.get('hair_length', '')
        date_str = metadata.get('date', '')
        time_str = metadata.get('time', '')
        notes = metadata.get('notes', '')
        box_braids_variation = metadata.get('box_braids_variation', '')
        hair_option = metadata.get('hair_option', '')
        cornrows_variation = metadata.get('cornrows_variation', '')
        two_strand_twists_variation = metadata.get('two_strand_twists_variation', '')
        reference_image = metadata.get('reference_image', '')
        current_hair_image = metadata.get('current_hair_image', '')
        total_price = float(metadata.get('total_price', 0))
        deposit_amount = float(metadata.get('deposit_amount', 0))
        
        try:
            # Create calendar event
            create_calendar_event(
                name=name,
                phone=phone,
                style=style,
                hair_length=hair_length,
                date_str=date_str,
                time_str=time_str,
                notes=notes,
                box_braids_variation=box_braids_variation,
                hair_option=hair_option,
                cornrows_variation=cornrows_variation,
                two_strand_twists_variation=two_strand_twists_variation,
                current_hair_image=current_hair_image,
                reference_image=reference_image,
                final_price=total_price
            )
            return 'Success', 200
        except Exception as e:
            print(f'Error creating calendar event: {e}')
            return str(e), 500

    return 'Success', 200

@app.route('/api/availability')
def availability():
    # Get month from query param (format: YYYY-MM)
    month = request.args.get('month', '')
    if not month:
        return jsonify({'error': 'Month parameter is required'}), 400
    
    try:
        # Parse the month string to get start and end dates
        year, month = map(int, month.split('-'))
        start_date = datetime.datetime(year, month, 1)
        if month == 12:
            end_date = datetime.datetime(year + 1, 1, 1)
        else:
            end_date = datetime.datetime(year, month + 1, 1)

        # Convert to RFC3339 timestamp
        start_date = start_date.isoformat() + 'Z'  # 'Z' indicates UTC
        end_date = end_date.isoformat() + 'Z'

        # Call the Calendar API
        events_result = service.events().list(
            calendarId=CALENDAR_ID,
            timeMin=start_date,
            timeMax=end_date,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        events = events_result.get('items', [])

        # Format events for frontend
        formatted_events = []
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            formatted_events.append({
                'start': start,
                'end': end
            })

        return jsonify(formatted_events)
    except Exception as e:
        print(f'Error fetching availability: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/debug/test-calendar', methods=['GET'])
def test_calendar():
    try:
        # Test creating a calendar event
        event = create_calendar_event(
            name="Test User",
            phone="123-456-7890",
            style="Test Style",
            hair_length="medium",
            date_str="2024-02-01",
            time_str="10:00",
            notes="This is a test event"
        )
        return jsonify({
            'success': True,
            'message': 'Calendar event created successfully',
            'event': event
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/booking-success.html')
def booking_success_page():
    return send_file('booking-success.html')

@app.route('/booking-success')
def booking_success():
    return redirect('/booking-success.html')

@app.route('/debug/webhook-info')
def webhook_info():
    return jsonify({
        'webhook_url': request.host_url.rstrip('/') + '/webhook',
        'webhook_secret': WEBHOOK_SECRET
    })

@app.route('/styles.css')
def serve_styles_css():
    return send_file('styles.css')

@app.route('/booking.css')
def serve_booking_css():
    return send_file('booking.css')

@app.route('/script.js')
def serve_script_js():
    return send_file('script.js')

@app.route('/booking.js')
def serve_booking_js():
    return send_file('booking.js')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))

@app.route('/')
def home():
    return send_file('index.html')

@app.route('/index.html')
def serve_index():
    return send_file('index.html')

@app.route('/booking.html')
def serve_booking():
    return send_file('booking.html')

@app.route('/catalog.html')
def serve_catalog():
    return send_file('catalog.html')

@app.route('/styles-catalog.html')
def serve_styles_catalog():
    return send_file('styles-catalog.html')

@app.route('/product.html')
def serve_product():
    return send_file('product.html')

@app.route('/images/<filename>')
def serve_images(filename):
    return send_file(os.path.join('images', filename))

@app.route('/header.png')
def serve_header():
    return send_file('header.png')

if __name__ == '__main__':
    app.run(debug=True) 