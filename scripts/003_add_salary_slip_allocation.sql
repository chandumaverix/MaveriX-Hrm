-- =============================================================================
-- Add salary_slip_allocated column to finance_records table
-- This allows admin to control which salary records can be downloaded as slips
-- =============================================================================

-- Add salary_slip_allocated column to finance_records
ALTER TABLE public.finance_records 
ADD COLUMN IF NOT EXISTS salary_slip_allocated boolean DEFAULT false;

-- Add comment for the new column
COMMENT ON COLUMN public.finance_records.salary_slip_allocated IS 'Whether admin has allocated salary slip download for this record';

-- Create index for faster queries on allocated slips
CREATE INDEX IF NOT EXISTS idx_finance_records_salary_slip_allocated 
ON public.finance_records(employee_id, salary_slip_allocated) 
WHERE salary_slip_allocated = true;
