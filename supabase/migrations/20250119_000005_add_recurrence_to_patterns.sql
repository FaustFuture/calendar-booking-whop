-- Add recurrence configuration to availability_patterns table
-- This allows admins to configure recurring meetings

-- Add recurrence fields to availability_patterns
ALTER TABLE availability_patterns
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_type text, -- 'daily', 'weekly', 'monthly', 'custom'
ADD COLUMN recurrence_interval integer DEFAULT 1, -- e.g., every 2 weeks
ADD COLUMN recurrence_days_of_week text[], -- For weekly: ['Mon', 'Wed', 'Fri']
ADD COLUMN recurrence_day_of_month integer, -- For monthly: day number (1-31)
ADD COLUMN recurrence_end_type text, -- 'count' or 'date'
ADD COLUMN recurrence_count integer, -- Number of occurrences
ADD COLUMN recurrence_end_date date; -- End date for recurrence

-- Add comments for documentation
COMMENT ON COLUMN availability_patterns.is_recurring IS 'Whether this pattern creates recurring bookings';
COMMENT ON COLUMN availability_patterns.recurrence_type IS 'Type of recurrence: daily, weekly, monthly, custom';
COMMENT ON COLUMN availability_patterns.recurrence_interval IS 'Interval for recurrence (e.g., every 2 weeks)';
COMMENT ON COLUMN availability_patterns.recurrence_days_of_week IS 'Days of week for weekly recurrence (Mon, Tue, etc.)';
COMMENT ON COLUMN availability_patterns.recurrence_day_of_month IS 'Day of month for monthly recurrence (1-31)';
COMMENT ON COLUMN availability_patterns.recurrence_end_type IS 'How recurrence ends: count (number of occurrences) or date';
COMMENT ON COLUMN availability_patterns.recurrence_count IS 'Number of occurrences if recurrence_end_type is count';
COMMENT ON COLUMN availability_patterns.recurrence_end_date IS 'End date if recurrence_end_type is date';

-- Add recurrence_group_id to bookings table to link recurring bookings together
ALTER TABLE bookings
ADD COLUMN recurrence_group_id uuid,
ADD COLUMN recurrence_index integer DEFAULT 0,
ADD COLUMN is_recurring_instance boolean DEFAULT false;

-- Add comments
COMMENT ON COLUMN bookings.recurrence_group_id IS 'Groups recurring bookings together. All occurrences share the same group ID';
COMMENT ON COLUMN bookings.recurrence_index IS 'Index of this occurrence in the series (0 = first, 1 = second, etc.)';
COMMENT ON COLUMN bookings.is_recurring_instance IS 'Whether this booking is part of a recurring series';

-- Create index for querying recurring bookings
CREATE INDEX idx_bookings_recurrence_group ON bookings(recurrence_group_id) WHERE recurrence_group_id IS NOT NULL;

-- Add constraint: if is_recurring is true, recurrence_type and recurrence_end_type must be set
ALTER TABLE availability_patterns
ADD CONSTRAINT check_recurrence_config
CHECK (
  (is_recurring = false) OR
  (is_recurring = true AND recurrence_type IS NOT NULL AND recurrence_end_type IS NOT NULL)
);
