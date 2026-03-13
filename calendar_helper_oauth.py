"""
Google Calendar helper functions using OAuth 2.0 authentication.
Alternative to service account when organization policy blocks key creation.
"""

import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import datetime
import json

# Google Calendar API scope
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

# Token file to store OAuth credentials
TOKEN_FILE = 'calendar_token.json'
CREDENTIALS_FILE = 'calendar_credentials.json'


def get_calendar_service_oauth():
    """
    Get Google Calendar API service using OAuth 2.0 authentication.
    This method uses user credentials instead of service account.
    
    Returns:
        tuple: (calendar_service, calendar_id) or (None, None) if not configured
    """
    calendar_id = os.getenv('GOOGLE_CALENDAR_ID')
    if not calendar_id:
        print("GOOGLE_CALENDAR_ID not set; calendar integration disabled")
        return None, None
    
    creds = None
    
    # Check if we have stored credentials
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    
    # If there are no (valid) credentials available, let the user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                print(f"OAuth credentials file not found: {CREDENTIALS_FILE}")
                print("Please download OAuth credentials from Google Cloud Console")
                return None, None
            
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for the next run
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        return service, calendar_id
    except Exception as e:
        print(f"Error initializing Google Calendar service: {e}")
        return None, None


def create_calendar_event_oauth(booking_data):
    """
    Create a Google Calendar event using OAuth 2.0.
    Same functionality as service account version.
    """
    service, calendar_id = get_calendar_service_oauth()
    if not service or not calendar_id:
        return None
    
    try:
        appointment_datetime = booking_data.get('appointment-datetime')
        if not appointment_datetime:
            print("No appointment datetime provided")
            return None
        
        try:
            if isinstance(appointment_datetime, str):
                start_time = datetime.datetime.fromisoformat(appointment_datetime.replace('Z', '+00:00'))
            else:
                start_time = appointment_datetime
        except (ValueError, AttributeError):
            try:
                start_time = datetime.datetime.strptime(appointment_datetime, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                print(f"Invalid datetime format: {appointment_datetime}")
                return None
        
        duration_minutes = int(booking_data.get('duration', 120))
        end_time = start_time + datetime.timedelta(minutes=duration_minutes)
        
        style = booking_data.get('selected_style', 'Appointment')
        name = booking_data.get('name', '')
        if name:
            title = f"{style} – {name}"
        else:
            title = style
        
        description_parts = []
        if booking_data.get('email'):
            description_parts.append(f"Email: {booking_data.get('email')}")
        if booking_data.get('phone'):
            description_parts.append(f"Phone: {booking_data.get('phone')}")
        if booking_data.get('notes'):
            description_parts.append(f"Notes: {booking_data.get('notes')}")
        
        description = '\n'.join(description_parts) if description_parts else ''
        
        event = {
            'summary': title,
            'description': description,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'America/New_York',
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'America/New_York',
            },
        }
        
        created_event = service.events().insert(
            calendarId=calendar_id,
            body=event
        ).execute()
        
        event_id = created_event.get('id')
        print(f"Calendar event created successfully: {event_id}")
        return event_id
        
    except HttpError as error:
        print(f"Error creating calendar event: {error}")
        return None
    except Exception as e:
        print(f"Unexpected error creating calendar event: {e}")
        import traceback
        traceback.print_exc()
        return None


def delete_calendar_event_oauth(event_id):
    """
    Delete a Google Calendar event using OAuth 2.0.
    """
    if not event_id:
        return True
    
    service, calendar_id = get_calendar_service_oauth()
    if not service or not calendar_id:
        return True
    
    try:
        service.events().delete(
            calendarId=calendar_id,
            eventId=event_id
        ).execute()
        
        print(f"Calendar event deleted successfully: {event_id}")
        return True
        
    except HttpError as error:
        if error.resp.status == 404:
            print(f"Calendar event not found (already deleted?): {event_id}")
            return True
        else:
            print(f"Error deleting calendar event: {error}")
            return False
    except Exception as e:
        print(f"Unexpected error deleting calendar event: {e}")
        import traceback
        traceback.print_exc()
        return False

