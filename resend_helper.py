"""
Send booking confirmation email via Resend when using Flask (app.py).
Uses the same HTML template as the Node API (api/emails/maya-booking-confirmation.html).
"""
import os
from datetime import datetime

# Lazy load template and resend to avoid import errors if resend not installed
_template_html = None


def _get_template_html():
    global _template_html
    if _template_html is not None:
        return _template_html
    path = os.path.join(os.path.dirname(__file__), "api", "emails", "maya-booking-confirmation.html")
    try:
        with open(path, "r", encoding="utf-8") as f:
            _template_html = f.read()
    except FileNotFoundError:
        _template_html = ""
    return _template_html


def _format_appointment_datetime(iso_string):
    if not iso_string:
        return "—"
    try:
        if iso_string.endswith("Z"):
            iso_string = iso_string.replace("Z", "+00:00")
        dt = datetime.fromisoformat(iso_string.replace("Z", "+00:00"))
        return dt.strftime("%A, %B %d, %Y at %I:%M %p")
    except (ValueError, TypeError):
        return iso_string


def send_booking_confirmation(
    *,
    to_email,
    customer_name,
    booking_reference,
    appointment_datetime,
    deposit_paid,
    selected_style,
    duration,
    notes,
    lookup_booking_url,
):
    """
    Send the Maya booking confirmation email via Resend.
    Returns True if sent, False if skipped (e.g. Resend not configured).
    """
    to_email = (to_email or "").strip()
    if not to_email or "@" not in to_email:
        print("Resend: no valid recipient email, skipping confirmation")
        return False

    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    if not api_key or not api_key.startswith("re_"):
        print("Resend: RESEND_API_KEY not set or invalid, skipping confirmation email")
        return False

    from_email = (os.getenv("RESEND_FROM") or "Maya African Hair Braiding <onboarding@resend.dev>").strip()

    html = _get_template_html()
    if not html:
        print("Resend: could not load email template, skipping")
        return False

    deposit_str = f"${float(deposit_paid):.2f}" if deposit_paid is not None else "—"
    duration_str = f"{int(duration)} min" if duration else "—"
    notes_str = (notes or "").strip() or "—"

    html = (
        html.replace("{{CUSTOMER_NAME}}", (customer_name or "").strip() or "there")
        .replace("{{BOOKING_REFERENCE}}", booking_reference or "—")
        .replace("{{APPOINTMENT_DATETIME}}", _format_appointment_datetime(appointment_datetime))
        .replace("{{DEPOSIT_PAID}}", deposit_str)
        .replace("{{SELECTED_STYLE}}", selected_style or "—")
        .replace("{{DURATION}}", duration_str)
        .replace("{{NOTES}}", notes_str)
        .replace("{{CUSTOMER_EMAIL}}", to_email or "")
        .replace("{{LOOKUP_BOOKING_URL}}", lookup_booking_url or "#")
    )

    try:
        import resend

        resend.api_key = api_key
        params = {
            "from": from_email,
            "to": [to_email],
            "subject": "Booking confirmed — Maya African Hair Braiding",
            "html": html,
        }
        result = resend.Emails.send(params)
        print(f"Resend: confirmation email sent to {to_email} (id={getattr(result, 'id', result)})")
        return True
    except Exception as e:
        print(f"Resend send failed: {e}")
        import traceback
        traceback.print_exc()
        return False
