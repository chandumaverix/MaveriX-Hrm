-- Create leave_deductions table to track leave deductions
CREATE TABLE IF NOT EXISTS leave_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    days_deducted DECIMAL(3,1) NOT NULL CHECK (days_deducted > 0),
    deduction_date DATE NOT NULL,
    reason TEXT NOT NULL,
    deducted_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_deductions_employee_id ON leave_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_deductions_leave_type_id ON leave_deductions(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_deductions_deduction_date ON leave_deductions(deduction_date);

-- Enable RLS
ALTER TABLE leave_deductions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin and HR can view all deductions
CREATE POLICY "Admins and HR can view all leave deductions"
    ON leave_deductions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE employees.id = auth.uid()
            AND employees.role IN ('admin', 'hr')
        )
    );

-- Employees can view their own deductions
CREATE POLICY "Employees can view their own leave deductions"
    ON leave_deductions FOR SELECT
    TO authenticated
    USING (employee_id = auth.uid());

-- Only admin and HR can insert deductions
CREATE POLICY "Only admin and HR can insert leave deductions"
    ON leave_deductions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees
            WHERE employees.id = auth.uid()
            AND employees.role IN ('admin', 'hr')
        )
    );

-- Only admin and HR can update deductions
CREATE POLICY "Only admin and HR can update leave deductions"
    ON leave_deductions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE employees.id = auth.uid()
            AND employees.role IN ('admin', 'hr')
        )
    );

-- Only admin and HR can delete deductions
CREATE POLICY "Only admin and HR can delete leave deductions"
    ON leave_deductions FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE employees.id = auth.uid()
            AND employees.role IN ('admin', 'hr')
        )
    );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_leave_deductions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
CREATE TRIGGER trigger_update_leave_deductions_updated_at
    BEFORE UPDATE ON leave_deductions
    FOR EACH ROW
    EXECUTE FUNCTION update_leave_deductions_updated_at();
