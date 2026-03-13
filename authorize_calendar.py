"""
Script to complete first-time Google Calendar OAuth authorization.
Run this once to authorize the app and create calendar_token.json.
"""

import os
from dotenv import load_dotenv

load_dotenv()

from calendar_helper_oauth import get_calendar_service_oauth

print("=" * 60)
print("Google Calendar OAuth Authorization")
print("=" * 60)
print()
print("This script will:")
print("1. Open a browser window for Google sign-in")
print("2. Ask you to authorize calendar access")
print("3. Create calendar_token.json for future use")
print()
print("Press Enter to continue...")
input()

try:
    service, calendar_id = get_calendar_service_oauth()
    
    if service and calendar_id:
        print()
        print("✅ SUCCESS! Authorization completed.")
        print(f"✅ Calendar ID: {calendar_id}")
        print("✅ calendar_token.json has been created")
        print()
        print("You can now make bookings and calendar events will be created automatically!")
    else:
        print()
        print("❌ FAILED: Could not complete authorization")
        print("Check the error messages above for details.")
        print()
        print("Common issues:")
        print("- Make sure calendar_credentials.json exists")
        print("- Make sure Google Calendar API is enabled")
        print("- Make sure you're signing in with the correct Google account")
        
except Exception as e:
    print()
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()

