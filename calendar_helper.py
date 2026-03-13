"""
Google Calendar helper functions for creating and deleting events.
Uses service account authentication for HilWebWorks Google Calendar.
"""

import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import datetime

# Google Calendar API scope
SCOPES = ['https://www.googleapis.com/auth/calendar.events']


def get_calendar_service():
    """
    Get Google Calendar API service using service account or OAuth 2.0.
    Tries service account first, falls back to OAuth if service account is not available.
    
    Returns:
        tuple: (calendar_service, calendar_id) or (None, None) if not configured
    """
    # Get calendar ID from environment
    calendar_id = os.getenv('GOOGLE_CALENDAR_ID')
    if not calendar_id:
        print("GOOGLE_CALENDAR_ID not set; calendar integration disabled")
        return None, None
    
    # Try service account first (if available)
    service_account_file = os.getenv('GOOGLE_SERVICE_ACCOUNT_FILE', 'service-account-key.json')
    
    if os.path.exists(service_account_file):
        try:
            # Load service account credentials
            credentials = service_account.Credentials.from_service_account_file(
                service_account_file,
                scopes=SCOPES
            )
            
            # Build the Calendar API service
            service = build('calendar', 'v3', credentials=credentials)
            
            return service, calendar_id
        except Exception as e:
            print(f"Error with service account: {e}")
            print("Falling back to OAuth 2.0...")
    
    # Fall back to OAuth 2.0 if service account not available
    try:
        from calendar_helper_oauth import get_calendar_service_oauth
        return get_calendar_service_oauth()
    except ImportError:
        print("OAuth helper not available. Please set up either:")
        print("1. Service account key file, OR")
        print("2. OAuth 2.0 credentials (see GOOGLE_CALENDAR_SETUP_OAUTH.md)")
        return None, None
    except Exception as e:
        print(f"Error with OAuth authentication: {e}")
        return None, None


def create_calendar_event(booking_data):
    """
    Create a Google Calendar event for a booking.
    
    Args:
        booking_data (dict): Booking data containing:
            - appointment-datetime (str): ISO format datetime string
            - duration (int): Duration in minutes
            - name (str): Customer name
            - selected_style (str): Hairstyle name
            - email (str, optional): Customer email
            - phone (str, optional): Customer phone
            - notes (str, optional): Additional notes
    
    Returns:
        str or None: Calendar event ID if successful, None otherwise
    """
    service, calendar_id = get_calendar_service()
    if not service or not calendar_id:
        return None
    
    try:
        # Parse appointment datetime
        appointment_datetime = booking_data.get('appointment-datetime')
        if not appointment_datetime:
            print("No appointment datetime provided")
            return None
        
        # Parse datetime (handle both ISO format and custom formats)
        try:
            if isinstance(appointment_datetime, str):
                # Try ISO format first
                start_time = datetime.datetime.fromisoformat(appointment_datetime.replace('Z', '+00:00'))
            else:
                start_time = appointment_datetime
        except (ValueError, AttributeError):
            # Try alternative format
            try:
                start_time = datetime.datetime.strptime(appointment_datetime, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                print(f"Invalid datetime format: {appointment_datetime}")
                return None
        
        # Calculate end time
        duration_minutes = int(booking_data.get('duration', 120))
        end_time = start_time + datetime.timedelta(minutes=duration_minutes)
        
        # Create event title
        style = booking_data.get('selected_style', 'Appointment')
        name = booking_data.get('name', '')
        if name:
            title = f"{style} – {name}"
        else:
            title = style
        
        # Create event description
        description_parts = []
        if booking_data.get('email'):
            description_parts.append(f"Email: {booking_data.get('email')}")
        if booking_data.get('phone'):
            description_parts.append(f"Phone: {booking_data.get('phone')}")
        if booking_data.get('notes'):
            description_parts.append(f"Notes: {booking_data.get('notes')}")
        
        description = '\n'.join(description_parts) if description_parts else ''
        
        # Create calendar event
        event = {
            'summary': title,
            'description': description,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'America/New_York',  # Adjust timezone as needed
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'America/New_York',
            },
        }
        
        # Insert event into calendar
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


def delete_calendar_event(event_id):
    """
    Delete a Google Calendar event by ID.
    
    Args:
        event_id (str): Google Calendar event ID
    
    Returns:
        bool: True if deleted successfully or event not found, False on error
    """
    if not event_id:
        return True
    
    service, calendar_id = get_calendar_service()
    if not service or not calendar_id:
        return True  # Return True if calendar not configured (no error)
    
    try:
        service.events().delete(
            calendarId=calendar_id,
            eventId=event_id
        ).execute()
        
        print(f"Calendar event deleted successfully: {event_id}")
        return True
        
    except HttpError as error:
        if error.resp.status == 404:
            # Event not found - consider it deleted
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

