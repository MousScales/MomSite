// Firebase Functions API endpoint
const API_BASE_URL = 'https://us-central1-connect-2a17c.cloudfunctions.net/api';

// API endpoints
var ENDPOINTS = {
    GET_BOOKINGS: `${API_BASE_URL}/get-bookings`,
    GET_UNAVAILABLE_TIMES: 'https://us-central1-connect-2a17c.cloudfunctions.net/getUnavailableTimes',
    GET_BOOKING_MONTHS: `${API_BASE_URL}/get-booking-months`,
    GET_DASHBOARD_STATS: `${API_BASE_URL}/dashboard-stats`,
    CREATE_BOOKING: 'https://us-central1-connect-2a17c.cloudfunctions.net/createCheckoutSession',
    HANDLE_PAYMENT: 'https://us-central1-connect-2a17c.cloudfunctions.net/handlePaymentSuccess',
    VERIFY_BOOKING: `${API_BASE_URL}/verify-booking`,
    WEBHOOK: `${API_BASE_URL}/webhook`
};

// Firebase configuration object
var firebaseConfig = {
    apiKey: "AIzaSyAieBgSCbjz8UfQ7nDOsDJ_BQxEEMPqDW8",
    authDomain: "connect-2a17c.firebaseapp.com",
    projectId: "connect-2a17c",
    storageBucket: "connect-2a17c.firebasestorage.app",
    messagingSenderId: "1028074397799",
    appId: "1:1028074397799:web:9b2fb8299d1998eacab4c2",
    measurementId: "G-FTPRM08308"
}; 