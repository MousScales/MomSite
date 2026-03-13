// Stripe publishable key fallback for local testing.
// Production should use the key returned by /api/stripe-config from Vercel env vars.
var STRIPE_PUBLISHABLE_KEY = 'pk_test_51REifLRqvuBtPAdXr3sOBg5kM3cH3RhEXxQiRGPc4uW9gV3RtZnoiUF2Qvzru3I9fzKmxXUgF22tzJBoYZS3XqYf00QA6fSLqs';

// Firebase Functions API endpoint (legacy)
const API_BASE_URL = 'https://us-central1-connect-2a17c.cloudfunctions.net/api';

// Backend API base URL for production (Vercel, etc.). Set this to your deployed Flask app URL.
// Example: 'https://your-app.railway.app' or 'https://your-app.onrender.com'
// Leave empty if your API is on the same domain (e.g. Vercel serverless /api routes).
var PRODUCTION_API_ORIGIN = '';

// When the page is opened as file://, relative /api/* URLs become file:///E:/api/* and fail.
// When on Vercel, /api/* does not exist unless you add serverless functions, so we use PRODUCTION_API_ORIGIN.
var API_ORIGIN = (function() {
    if (typeof location === 'undefined' || !location.origin) return PRODUCTION_API_ORIGIN || 'http://localhost:5500';
    if (location.protocol === 'file:' || location.origin === 'null') return 'http://localhost:5500';
    var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (isLocal) return ''; // same origin (Flask serves frontend + API)
    return PRODUCTION_API_ORIGIN || ''; // production: use deployed backend URL
})();

// API endpoints (relative paths; API_ORIGIN is prepended when needed)
var ENDPOINTS = {
    GET_BOOKINGS: API_ORIGIN + '/api/get-bookings',
    GET_UNAVAILABLE_TIMES: API_ORIGIN + '/api/get-unavailable-times',
    GET_BOOKING_MONTHS: API_ORIGIN + '/api/get-booking-months',
    GET_DASHBOARD_STATS: API_ORIGIN + '/api/dashboard-stats',
    CREATE_BOOKING: API_ORIGIN + '/api/create-checkout-session',
    CREATE_PAYMENT_INTENT: API_ORIGIN + '/api/create-payment-intent',
    HANDLE_PAYMENT: API_ORIGIN + '/api/handle-payment-success',
    CANCEL_BOOKING: API_ORIGIN + '/api/cancel-booking',
};

// Firebase configuration object (commented out - will use when we have client credentials)
// var firebaseConfig = {
//     apiKey: "AIzaSyAieBgSCbjz8UfQ7nDOsDJ_BQxEEMPqDW8",
//     authDomain: "connect-2a17c.firebaseapp.com",
//     projectId: "connect-2a17c",
//     storageBucket: "connect-2a17c.firebasestorage.app",
//     messagingSenderId: "1028074397799",
//     appId: "1:1028074397799:web:9b2fb8299d1998eacab4c2",
//     measurementId: "G-FTPRM08308"
// };

// Supabase Configuration. Must match Vercel env (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
var SUPABASE_URL = 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbmJkcWtxbHhrZmdoamNidndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQxNjMsImV4cCI6MjA4ODc1MDE2M30.r8jDPCV7C7kTrnHIwGvs4vBq-sf8rvyFxe1Q6_rR2Tg';
var SUPABASE_STORAGE_BUCKET = 'booking-images'; // Name of your storage bucket 