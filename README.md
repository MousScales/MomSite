# Maya African Hair Braiding

Professional website for Maya African Hair Braiding salon, featuring an online booking system and showcase of hairstyles.

## Features

- Online booking system
- Hairstyle catalog with detailed information
- Search functionality
- Meta Pixel integration for analytics
- Mobile-responsive design

## Technologies Used

- HTML5/CSS3
- JavaScript
- Python (Flask)
- Meta Pixel for tracking
- Responsive design

## Setup

1. Clone the repository:
```bash
git clone https://github.com/MousScales/MomSite.git
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
- Create a `.env` file (see `env.template`)
- Add necessary API keys and configuration (Stripe, Firebase service account, optional Google Calendar)

4. Run the application:
```bash
python app.py
```

## Booking & cancellation

- **Book**: Fill the form on `booking.html`, pay the deposit via Stripe; the booking is stored in Firestore. If Google Calendar is configured, an event is created (see `SETUP_GOOGLE_CALENDAR.md`).
- **Cancel**: Use `cancel.html` (Booking ID + email) or in Admin open a booking and click **Mark as Cancelled**. Cancellations are reflected in Firestore and in Google Calendar when configured.

## Stripe (client account)

- Ensure `config.js` and the Cloud Run / Firebase function use the **client’s** Stripe keys (test or live).
- **Deposit**: The site mentions a 10% deposit in places; the booking form shows 30%. Align in `booking.js` and in `functions/index.js` (`createCheckoutSession`) if you want a single percentage.
- **Test flow**: Book → pay with Stripe test card (e.g. `4242 4242 4242 4242`) → confirm redirect and that the booking appears in Firestore (and on Google Calendar if set up).

## Contact

For inquiries, please contact:
- Email: bizmoustaphagueye@gmail.com

## License

© 2025 Maya African Hair Braiding. All rights reserved. 