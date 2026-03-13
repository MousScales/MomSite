/**
 * Send a test booking confirmation email offline.
 * Loads .env from project root, then sends one email via Resend.
 *
 * Usage (from project root):
 *   node scripts/test-resend-email.js
 *   node scripts/test-resend-email.js your@email.com
 *
 * Or set TEST_EMAIL in .env and run:
 *   node scripts/test-resend-email.js
 */

const path = require('path');
const fs = require('fs');

// Load .env from project root (no extra dependency)
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
try {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    }
  });
} catch (e) {
  console.warn('No .env found at', envPath);
}

const { sendBookingConfirmation } = require(path.join(root, 'api', '_resend'));

const to = process.argv[2] || process.env.TEST_EMAIL;
if (!to || !to.includes('@')) {
  console.log('Usage: node scripts/test-resend-email.js <your@email.com>');
  console.log('   Or set TEST_EMAIL in .env and run: node scripts/test-resend-email.js');
  process.exit(1);
}

const testData = {
  to,
  customerName: 'Test Customer',
  bookingReference: 'TEST-' + Date.now(),
  appointmentDatetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  depositPaid: 25.0,
  selectedStyle: 'Knotless Box Braids',
  duration: '120 min',
  notes: 'Test booking – please ignore.',
  lookupBookingUrl: 'https://mayaafricanhairbraid.com/cancel.html?bookingId=TEST',
};

async function main() {
  console.log('Sending test confirmation email to:', to);
  const result = await sendBookingConfirmation(testData);
  if (result.success) {
    console.log('Done. Check your inbox (and spam) for the email.');
  } else {
    console.error('Failed:', result.error);
    process.exit(1);
  }
}

main();
