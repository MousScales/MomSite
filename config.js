// Stripe publishable key (Test Mode)
// Configured with client's Stripe test key
// For production, replace with live key (pk_live_...) from Stripe Dashboard
var STRIPE_PUBLISHABLE_KEY = 'pk_live_51REifLRqvuBtPAdXaNce44j5Fe7h0Z1G0pqr1x4i6TRK4Z1TppknBz0lU8jmb48a1epPphqTY558sMO5rBzG5z62007VHMn2IL';

// Firebase Functions API endpoint (legacy)
const API_BASE_URL = 'https://us-central1-connect-2a17c.cloudfunctions.net/api';

// When the page is opened as file://, relative /api/* URLs become file:///E:/api/* and fail.
// Use this base so API calls go to the Flask server (must match app.py port). Leave empty when page is served over HTTP.
var API_ORIGIN = (function() {
    if (typeof location === 'undefined' || !location.origin) return 'http://localhost:5500';
    if (location.protocol === 'file:' || location.origin === 'null') return 'http://localhost:5500';
    return ''; // same origin
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

// Supabase Configuration
var SUPABASE_URL = 'https://ecnbdqkqlxkfghjcbvwj.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbmJkcWtxbHhrZmdoamNidndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQxNjMsImV4cCI6MjA4ODc1MDE2M30.r8jDPCV7C7kTrnHIwGvs4vBq-sf8rvyFxe1Q6_rR2Tg';
var SUPABASE_STORAGE_BUCKET = 'booking-images'; // Name of your storage bucket 