-- Supabase Database Schema for Maya African Hair Braiding
-- Run this SQL in your Supabase SQL Editor to create the tables

-- Table: temp_bookings
-- Stores temporary bookings while payment is being processed
CREATE TABLE IF NOT EXISTS temp_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    phone TEXT,
    email TEXT,
    "appointment-datetime" TEXT,
    selected_style TEXT,
    hair_length TEXT,
    hair_option TEXT,
    pre_wash_option TEXT,
    detangling_option TEXT,
    notes TEXT,
    total_price DECIMAL(10, 2),
    duration INTEGER,
    current_hair_image_url TEXT,
    reference_image_url TEXT,
    box_braids_variation TEXT,
    cornrows_variation TEXT,
    two_strand_twists_variation TEXT,
    status TEXT DEFAULT 'pending_payment',
    deposit_amount INTEGER, -- in cents
    booking_id TEXT, -- same as id, for compatibility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: bookings
-- Stores confirmed bookings after successful payment
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    phone TEXT,
    email TEXT,
    "appointment-datetime" TEXT,
    selected_style TEXT,
    hair_length TEXT,
    hair_option TEXT,
    pre_wash_option TEXT,
    detangling_option TEXT,
    notes TEXT,
    total_price DECIMAL(10, 2),
    duration INTEGER,
    current_hair_image_url TEXT,
    reference_image_url TEXT,
    box_braids_variation TEXT,
    cornrows_variation TEXT,
    two_strand_twists_variation TEXT,
    status TEXT DEFAULT 'confirmed',
    deposit_paid DECIMAL(10, 2),
    deposit_amount INTEGER, -- in cents
    payment_session_id TEXT,
    stripe_session_id TEXT, -- alias for payment_session_id
    calendar_event_id TEXT, -- Google Calendar event ID
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_appointment_datetime ON bookings("appointment-datetime");
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_temp_bookings_created_at ON temp_bookings(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE temp_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow backend operations (works with both anon and service_role keys)
-- These policies allow all operations for backend use
-- In production, you may want to restrict these further

-- Policy for temp_bookings: Allow all operations (for backend)
CREATE POLICY "Allow backend to manage temp_bookings"
    ON temp_bookings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy for bookings: Allow all operations (for backend)
CREATE POLICY "Allow backend to manage bookings"
    ON bookings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Alternative: If using anon key with proper authentication, you can use:
-- CREATE POLICY "Allow public read access to bookings"
--     ON bookings
--     FOR SELECT
--     USING (true);
--
-- CREATE POLICY "Allow service role to insert bookings"
--     ON bookings
--     FOR INSERT
--     WITH CHECK (auth.role() = 'service_role');

