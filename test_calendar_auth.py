"""
Simple script to test and complete Google Calendar OAuth authorization.
"""

import os
from dotenv import load_dotenv

load_dotenv()

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar.events']
TOKEN_FILE = 'calendar_token.json'
CREDENTIALS_FILE = 'calendar_credentials.json'

calendar_id = os.getenv('GOOGLE_CALENDAR_ID')
if not calendar_id:
    print("[ERROR] GOOGLE_CALENDAR_ID not set in .env file")
    exit(1)

print(f"[OK] Calendar ID: {calendar_id}")

if not os.path.exists(CREDENTIALS_FILE):
    print(f"[ERROR] {CREDENTIALS_FILE} not found!")
    exit(1)

print(f"[OK] Found {CREDENTIALS_FILE}")

creds = None
if os.path.exists(TOKEN_FILE):
    print(f"[OK] Found existing {TOKEN_FILE}")
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

if not creds or not creds.valid:
    if creds and creds.expired and creds.refresh_token:
        print("[INFO] Refreshing expired token...")
        creds.refresh(Request())
    else:
        print("[INFO] Starting OAuth flow...")
        print("       A browser window will open for authorization...")
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
        creds = flow.run_local_server(port=0)
    
    print(f"[INFO] Saving token to {TOKEN_FILE}...")
    with open(TOKEN_FILE, 'w') as token:
        token.write(creds.to_json())
    print("[OK] Token saved!")

try:
    service = build('calendar', 'v3', credentials=creds)
    print("[OK] Calendar service initialized successfully!")
    print()
    print("[SUCCESS] Authorization complete! Calendar events will now be created automatically.")
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()

