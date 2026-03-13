-- Fix RLS Policies for Supabase
-- Run this SQL in your Supabase SQL Editor to fix the Row Level Security policies

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can manage temp_bookings" ON temp_bookings;
DROP POLICY IF EXISTS "Service role can manage bookings" ON bookings;

-- Create new policies that allow inserts from the backend
-- These policies allow inserts and selects for both anon and service_role keys

-- Policy for temp_bookings: Allow inserts and selects (for backend operations)
CREATE POLICY "Allow backend to manage temp_bookings"
    ON temp_bookings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy for bookings: Allow inserts and selects (for backend operations)
CREATE POLICY "Allow backend to manage bookings"
    ON bookings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Alternative: If you want to be more restrictive, you can use:
-- These policies allow public read but only service role write
-- But for now, the above policies will work for both anon and service_role keys

-- For temp_bookings: Allow public inserts (needed for booking flow)
-- CREATE POLICY "Allow public inserts to temp_bookings"
--     ON temp_bookings
--     FOR INSERT
--     WITH CHECK (true);
--
-- CREATE POLICY "Allow service role to manage temp_bookings"
--     ON temp_bookings
--     FOR ALL
--     USING (auth.role() = 'service_role');

-- For bookings: Allow public reads, service role writes
-- CREATE POLICY "Allow public reads from bookings"
--     ON bookings
--     FOR SELECT
--     USING (true);
--
-- CREATE POLICY "Allow service role to manage bookings"
--     ON bookings
--     FOR ALL
--     USING (auth.role() = 'service_role');

