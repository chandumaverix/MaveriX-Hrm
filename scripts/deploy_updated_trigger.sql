-- ============================================================
-- Run this in Supabase SQL Editor to deploy the updated trigger
-- ============================================================

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
  v_metadata jsonb := '{}';
  v_changes jsonb := '[]';
  v_key text;
  
  -- Variables for descriptive lookups
  v_target_name text;
  v_team_name text;
  v_leave_type_name text;

  -- Columns to skip when computing diffs (internal / noisy)
  v_skip_cols text[] := ARRAY['id','created_at','updated_at','auth_uid'];
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

  -- Still no user context?
  IF v_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Fetch user metadata
  SELECT first_name || ' ' || last_name, role INTO v_user_name, v_user_role 
  FROM public.employees WHERE id = v_user_id;

  v_category := TG_TABLE_NAME;

  -- ---------------------------------------------------------------------------
  -- Build structured change diff for UPDATE operations
  -- ---------------------------------------------------------------------------
  IF TG_OP = 'UPDATE' AND v_old_record IS NOT NULL THEN
    FOR v_key IN SELECT jsonb_object_keys(v_record) LOOP
      IF v_key = ANY(v_skip_cols) THEN CONTINUE; END IF;
      IF (v_old_record->v_key)::text IS DISTINCT FROM (v_record->v_key)::text THEN
        v_changes := v_changes || jsonb_build_object(
          'field', v_key,
          'from', COALESCE(v_old_record->>v_key, '(empty)'),
          'to', COALESCE(v_record->>v_key, '(empty)')
        );
      END IF;
    END LOOP;
  END IF;

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
    SELECT name INTO v_leave_type_name FROM public.leave_types WHERE id = (v_record->>'leave_type_id')::uuid;
    IF TG_OP = 'INSERT' THEN
      v_action := 'Submitted Leave Request';
      v_description := v_target_name || ' requested ' || COALESCE(v_leave_type_name, 'leave') || ' from ' || (v_record->>'start_date') || ' to ' || (v_record->>'end_date');
    ELSIF TG_OP = 'UPDATE' AND v_record->>'status' != v_old_record->>'status' THEN
      v_action := 'Updated Leave Request';
      v_description := COALESCE(v_leave_type_name, 'Leave') || ' request for ' || v_target_name || ' changed to ' || (v_record->>'status');
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
    v_target_name := (v_record->>'first_name') || ' ' || (v_record->>'last_name');
    IF TG_OP = 'INSERT' THEN
      v_action := 'Created Employee';
      v_description := 'Created new employee profile for ' || v_target_name || ' (' || (v_record->>'employee_id') || ')';
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := 'Updated Employee';
      v_description := 'Updated profile details for ' || v_target_name;
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'Deleted Employee';
      v_target_name := (v_old_record->>'first_name') || ' ' || (v_old_record->>'last_name');
      v_description := 'Removed employee ' || v_target_name || ' from the system';
    END IF;
    v_category := 'employee';
  
  ELSIF TG_TABLE_NAME = 'finance_records' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT first_name || ' ' || last_name INTO v_target_name FROM public.employees WHERE id = (v_old_record->>'employee_id')::uuid;
    ELSE
      SELECT first_name || ' ' || last_name INTO v_target_name FROM public.employees WHERE id = (v_record->>'employee_id')::uuid;
    END IF;

    IF TG_OP = 'INSERT' THEN
      v_action := 'Added Finance Record';
      v_description := 'Added ' || COALESCE(v_record->>'type', 'finance') || ' record of ' || COALESCE(v_record->>'amount', '0') || ' for ' || v_target_name;
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := 'Updated Finance Record';
      v_description := 'Updated ' || COALESCE(v_record->>'type', 'finance') || ' record for ' || v_target_name;
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'Deleted Finance Record';
      v_description := 'Deleted ' || COALESCE(v_old_record->>'type', 'finance') || ' record for ' || v_target_name;
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
    SELECT name INTO v_leave_type_name FROM public.leave_types WHERE id = (v_record->>'leave_type_id')::uuid;
    IF TG_OP = 'UPDATE' THEN
      v_action := 'Updated Leave Balance';
      v_description := COALESCE(v_leave_type_name, 'Leave') || ' balance for ' || v_target_name || ' adjusted to ' || (v_record->>'total_days') || ' total days';
    ELSIF TG_OP = 'INSERT' THEN
      v_action := 'Created Leave Balance';
      v_description := COALESCE(v_leave_type_name, 'Leave') || ' balance created for ' || v_target_name || ' with ' || (v_record->>'total_days') || ' days';
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

  -- Generic fallback
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

  -- Build final metadata payload
  v_metadata := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'target_name', COALESCE(v_target_name, ''),
    'changes', v_changes
  );

  -- Insert log
  IF v_action IS NOT NULL THEN
    INSERT INTO public.activity_logs (user_id, user_name, user_role, action, category, description, metadata, created_at)
    VALUES (v_user_id, COALESCE(v_user_name, 'System'), COALESCE(v_user_role, 'admin'), v_action, v_category, v_description, v_metadata, NOW());
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
EXCEPTION WHEN OTHERS THEN
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
