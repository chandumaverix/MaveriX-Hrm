-- =============================================================================
-- Add salary_slip_sent column to finance_records table
-- This allows admin to control when a generated salary slip is sent to the employee
-- and made available for them to download.
-- =============================================================================

-- Add salary_slip_sent column to finance_records
ALTER TABLE public.finance_records 
ADD COLUMN IF NOT EXISTS salary_slip_sent boolean DEFAULT false;

-- Add comment for the new column
COMMENT ON COLUMN public.finance_records.salary_slip_sent IS 'Whether the salary slip has been sent/shared with the employee and is downloadable by them';

-- Create index for faster queries on sent slips
CREATE INDEX IF NOT EXISTS idx_finance_records_salary_slip_sent 
ON public.finance_records(employee_id, salary_slip_sent) 
WHERE salary_slip_sent = true;
