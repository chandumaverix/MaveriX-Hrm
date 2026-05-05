CREATE TABLE IF NOT EXISTS activity_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name     TEXT NOT NULL,
  user_role     TEXT NOT NULL CHECK (user_role IN ('admin', 'hr', 'employee')),
  action        TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN (
    'auth', 'employee', 'leave', 'payroll', 'role',
    'document', 'attendance', 'announcement', 'resignation', 'finance', 'settings', 'team'
  )),
  description   TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  ip_address    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id    ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category   ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_role  ON activity_logs(user_role);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Everyone can see everything
DROP POLICY IF EXISTS "view_all_logs" ON activity_logs;
CREATE POLICY "view_all_logs" ON activity_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Anyone authenticated can insert
DROP POLICY IF EXISTS "insert_own_logs" ON activity_logs;
CREATE POLICY "insert_own_logs" ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 007_activity_triggers.sql
-- Drop trigger if it exists
DROP TRIGGER IF EXISTS tr_log_activity_employees ON public.employees;
DROP TRIGGER IF EXISTS tr_log_activity_attendance ON public.attendance;
DROP TRIGGER IF EXISTS tr_log_activity_leave_requests ON public.leave_requests;
DROP TRIGGER IF EXISTS tr_log_activity_resignations ON public.resignations;
DROP TRIGGER IF EXISTS tr_log_activity_finance_records ON public.finance_records;
DROP TRIGGER IF EXISTS tr_log_activity_teams ON public.teams;
DROP TRIGGER IF EXISTS tr_log_activity_announcements ON public.announcements;
DROP TRIGGER IF EXISTS tr_log_activity_posts ON public.posts;
DROP TRIGGER IF EXISTS tr_log_activity_late_deductions_log ON public.late_deductions_log;
DROP TRIGGER IF EXISTS tr_log_activity_leave_balances ON public.leave_balances;
DROP TRIGGER IF EXISTS tr_log_activity_leave_types ON public.leave_types;
DROP TRIGGER IF EXISTS tr_log_activity_settings ON public.settings;
DROP TRIGGER IF EXISTS tr_log_activity_team_members ON public.team_members;

-- Create the smart logger function
CREATE OR REPLACE FUNCTION public.smart_activity_logger()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_user_name text;
  v_user_role text;
  v_action text;
  v_category text;
  v_description text;
  v_record jsonb;
  v_old_record jsonb;
  
  -- Variables for descriptive lookups
  v_target_name text;
  v_team_name text;
  v_leave_type_name text;
BEGIN
  -- Get user ID from Supabase auth context
  v_user_id := auth.uid();
  
  IF TG_OP = 'DELETE' THEN 
    v_record := to_jsonb(OLD); 
    v_old_record := to_jsonb(OLD);
  ELSE 
    v_record := to_jsonb(NEW); 
    IF TG_OP = 'UPDATE' THEN v_old_record := to_jsonb(OLD); END IF;
  END IF;

  -- If system action, try to attribute it from record fields if possible
  IF v_user_id IS NULL THEN
    IF v_record ? 'employee_id' AND v_record->>'employee_id' IS NOT NULL THEN 
      v_user_id := (v_record->>'employee_id')::uuid;
    ELSIF v_record ? 'author_id' AND v_record->>'author_id' IS NOT NULL THEN 
      v_user_id := (v_record->>'author_id')::uuid;
    ELSIF TG_TABLE_NAME = 'employees' AND v_record->>'id' IS NOT NULL THEN 
      v_user_id := (v_record->>'id')::uuid;
    END IF;
  END IF;

  -- Still no user context? Cannot log without throwing FK error or leaving it blank
  IF v_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Fetch user metadata
  SELECT first_name || ' ' || last_name, role INTO v_user_name, v_user_role 
  FROM public.employees WHERE id = v_user_id;

  v_category := TG_TABLE_NAME;
  
  -- ---------------------------------------------------------------------------
  -- Smart logic for specific tables
  -- ---------------------------------------------------------------------------

  IF TG_TABLE_NAME = 'attendance' THEN
    SELECT first_name || ' ' || last_name INTO v_target_name FROM public.employees WHERE id = (v_record->>'employee_id')::uuid;
    IF TG_OP = 'INSERT' THEN
      v_action := 'Clocked In';
      v_description := v_target_name || ' clocked in at ' || to_char((v_record->>'clock_in')::timestamptz AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM');
    ELSIF TG_OP = 'UPDATE' AND v_record->>'clock_out' IS NOT NULL AND v_old_record->>'clock_out' IS NULL THEN
      v_action := 'Clocked Out';
      v_description := v_target_name || ' clocked out at ' || to_char((v_record->>'clock_out')::timestamptz AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') || ' (Total: ' || (v_record->>'total_hours') || ' hrs)';
    END IF;
    v_category := 'attendance';

  ELSIF TG_TABLE_NAME = 'leave_requests' THEN
    SELECT first_name || ' ' || last_name INTO v_target_name FROM public.employees WHERE id = (v_record->>'employee_id')::uuid;
    IF TG_OP = 'INSERT' THEN
      v_action := 'Submitted Leave Request';
      v_description := v_target_name || ' requested leave from ' || (v_record->>'start_date') || ' to ' || (v_record->>'end_date');
    ELSIF TG_OP = 'UPDATE' AND v_record->>'status' != v_old_record->>'status' THEN
      v_action := 'Updated Leave Request';
      v_description := 'Leave request for ' || v_target_name || ' changed to ' || (v_record->>'status');
    END IF;
    v_category := 'leave';

  ELSIF TG_TABLE_NAME = 'resignations' THEN
    SELECT first_name || ' ' || last_name INTO v_target_name FROM public.employees WHERE id = (v_record->>'employee_id')::uuid;
    IF TG_OP = 'INSERT' THEN
      v_action := 'Submitted Resignation';
      v_description := v_target_name || ' submitted a resignation request (LWD: ' || (v_record->>'last_working_day') || ')';
    ELSIF TG_OP = 'UPDATE' AND v_record->>'status' != v_old_record->>'status' THEN
      v_action := 'Updated Resignation';
      v_description := 'Resignation for ' || v_target_name || ' changed to ' || (v_record->>'status');
    END IF;
    v_category := 'resignation';

  ELSIF TG_TABLE_NAME = 'posts' THEN
    SELECT first_name || ' ' || last_name INTO v_target_name FROM public.employees WHERE id = (v_record->>'author_id')::uuid;
    IF TG_OP = 'INSERT' THEN
      v_action := 'Created Feed Post';
      v_description := v_target_name || ' posted a new update in the feed';
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'Deleted Feed Post';
      v_description := v_target_name || ' deleted a feed post';
    END IF;
    v_category := 'team';

  ELSIF TG_TABLE_NAME = 'announcements' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'Created Announcement';
      v_description := 'Created announcement: ' || (v_record->>'title');
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'Deleted Announcement';
      v_description := 'Deleted announcement: ' || (v_old_record->>'title');
    END IF;
    v_category := 'announcement';

  ELSIF TG_TABLE_NAME = 'employees' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'Created Employee';
      v_description := 'Created new employee profile for ' || (v_record->>'first_name') || ' ' || (v_record->>'last_name') || ' (' || (v_record->>'employee_id') || ')';
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := 'Updated Employee';
      v_description := 'Updated profile details for ' || (v_record->>'first_name') || ' ' || (v_record->>'last_name');
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'Deleted Employee';
      v_description := 'Removed employee ' || (v_old_record->>'first_name') || ' ' || (v_old_record->>'last_name') || ' from the system';
    END IF;
    v_category := 'employee';
  
  ELSIF TG_TABLE_NAME = 'finance_records' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'Added Finance Record';
      v_description := 'Added ' || (v_record->>'type') || ' record of ' || (v_record->>'amount');
    END IF;
    v_category := 'finance';

  ELSIF TG_TABLE_NAME = 'late_deductions_log' THEN
    SELECT first_name || ' ' || last_name INTO v_target_name FROM public.employees WHERE id = (v_record->>'employee_id')::uuid;
    IF TG_OP = 'INSERT' THEN
      v_action := 'Logged Late Deduction';
      v_description := 'Deducted ' || (v_record->>'deduction_amount') || ' from ' || v_target_name || ' for late arrival';
    END IF;
    v_category := 'payroll';

  ELSIF TG_TABLE_NAME = 'leave_balances' THEN
    SELECT first_name || ' ' || last_name INTO v_target_name FROM public.employees WHERE id = (v_record->>'employee_id')::uuid;
    IF TG_OP = 'UPDATE' THEN
      v_action := 'Updated Leave Balance';
      v_description := 'Leave balance for ' || v_target_name || ' adjusted to ' || (v_record->>'total_days') || ' total days';
    END IF;
    v_category := 'leave';

  ELSIF TG_TABLE_NAME = 'leave_types' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'Created Leave Type';
      v_description := 'Added new leave type: ' || (v_record->>'name');
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := 'Updated Leave Type';
      v_description := 'Modified leave type: ' || (v_record->>'name');
    END IF;
    v_category := 'leave';

  ELSIF TG_TABLE_NAME = 'settings' THEN
    IF TG_OP = 'UPDATE' THEN
      v_action := 'Updated Settings';
      v_description := 'System settings were updated by ' || v_user_name;
    END IF;
    v_category := 'settings';

  ELSIF TG_TABLE_NAME = 'team_members' THEN
    SELECT name INTO v_team_name FROM public.teams WHERE id = (v_record->>'team_id')::uuid;
    SELECT first_name || ' ' || last_name INTO v_target_name FROM public.employees WHERE id = (v_record->>'employee_id')::uuid;
    IF TG_OP = 'INSERT' THEN
      v_action := 'Added Team Member';
      v_description := 'Added ' || v_target_name || ' to the ' || v_team_name || ' team';
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'Removed Team Member';
      v_description := 'Removed ' || v_target_name || ' from the ' || v_team_name || ' team';
    END IF;
    v_category := 'team';

  ELSIF TG_TABLE_NAME = 'teams' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'Created Team';
      v_description := 'Created new team: ' || (v_record->>'name');
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := 'Updated Team';
      v_description := 'Updated details for team: ' || (v_record->>'name');
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'Deleted Team';
      v_description := 'Deleted team: ' || (v_old_record->>'name');
    END IF;
    v_category := 'team';

  END IF;

  -- ---------------------------------------------------------------------------
  -- Generic fallback (only triggers if specific logic missed it)
  -- ---------------------------------------------------------------------------
  IF v_action IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'Created Record';
      v_description := 'Created a new record in ' || TG_TABLE_NAME;
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := 'Updated Record';
      v_description := 'Updated a record in ' || TG_TABLE_NAME;
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'Deleted Record';
      v_description := 'Deleted a record from ' || TG_TABLE_NAME;
    END IF;
  END IF;

  -- Only insert if we have minimum valid data
  IF v_action IS NOT NULL THEN
    INSERT INTO public.activity_logs (user_id, user_name, user_role, action, category, description, created_at)
    VALUES (v_user_id, COALESCE(v_user_name, 'System'), COALESCE(v_user_role, 'admin'), v_action, v_category, v_description, NOW());
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Catch any errors so the trigger doesn't break the main transaction
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to tables
CREATE TRIGGER tr_log_activity_employees AFTER INSERT OR UPDATE OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_attendance AFTER INSERT OR UPDATE OR DELETE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_leave_requests AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_resignations AFTER INSERT OR UPDATE OR DELETE ON public.resignations FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_finance_records AFTER INSERT OR UPDATE OR DELETE ON public.finance_records FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_teams AFTER INSERT OR UPDATE OR DELETE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_announcements AFTER INSERT OR UPDATE OR DELETE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_posts AFTER INSERT OR UPDATE OR DELETE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_late_deductions_log AFTER INSERT OR UPDATE OR DELETE ON public.late_deductions_log FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_leave_balances AFTER INSERT OR UPDATE OR DELETE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_leave_types AFTER INSERT OR UPDATE OR DELETE ON public.leave_types FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_settings AFTER INSERT OR UPDATE OR DELETE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
CREATE TRIGGER tr_log_activity_team_members AFTER INSERT OR UPDATE OR DELETE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.smart_activity_logger();
