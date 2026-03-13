"""
Script to create a calendar event for an existing booking that doesn't have one.
This is useful for bookings that were created before OAuth authorization was complete.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from calendar_helper_oauth import create_calendar_event_oauth

load_dotenv()

# Initialize Supabase (using same defaults as app.py)
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://ecnbdqkqlxkfghjcbvwj.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbmJkcWtxbHhrZmdoamNidndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQxNjMsImV4cCI6MjA4ODc1MDE2M30.r8jDPCV7C7kTrnHIwGvs4vBq-sf8rvyFxe1Q6_rR2Tg')

if not SUPABASE_KEY:
    print("[ERROR] Supabase key not found in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 60)
print("Create Calendar Event for Existing Booking")
print("=" * 60)
print()

# Get bookings without calendar events
print("Fetching bookings without calendar events...")
result = supabase.table('bookings').select('*').is_('calendar_event_id', 'null').eq('status', 'confirmed').execute()

if not result.data or len(result.data) == 0:
    print("[INFO] No bookings found without calendar events.")
    print("       All confirmed bookings already have calendar events.")
    exit(0)

print(f"[OK] Found {len(result.data)} booking(s) without calendar events:")
print()

for i, booking in enumerate(result.data, 1):
    booking_id = booking.get('id')
    name = booking.get('name', 'Unknown')
    appointment_datetime = booking.get('appointment-datetime')
    selected_style = booking.get('selected_style', 'Appointment')
    
    print(f"{i}. Booking ID: {booking_id[:20]}...")
    print(f"   Name: {name}")
    print(f"   Style: {selected_style}")
    print(f"   Date/Time: {appointment_datetime}")
    print()

print("Creating calendar events for these bookings...")
print()

for booking in result.data:
    booking_id = booking.get('id')
    name = booking.get('name', 'Unknown')
    
    try:
        print(f"Creating calendar event for booking: {name}...")
        event_id = create_calendar_event_oauth(booking)
        
        if event_id:
            # Update booking with calendar event ID
            supabase.table('bookings').update({
                'calendar_event_id': event_id
            }).eq('id', booking_id).execute()
            
            print(f"[OK] Calendar event created: {event_id}")
            print(f"     Booking updated with calendar_event_id")
        else:
            print(f"[WARNING] Failed to create calendar event for booking {booking_id}")
    except Exception as e:
        print(f"[ERROR] Error creating calendar event: {e}")
        import traceback
        traceback.print_exc()
    
    print()

print("=" * 60)
print("[SUCCESS] Done! Check your Google Calendar for the new events.")
print("=" * 60)

