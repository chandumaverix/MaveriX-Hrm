# Supabase schema scripts

Use these when setting up a **new** Supabase project (e.g. moving to another account). Run in order in the SQL Editor.

## Order

1. **001_full_schema.sql** – All tables, RLS, trigger, and default leave types. Single run; no ALTERs needed later.
    - **NEW**: Settings table for app configuration (attendance times, late policy, company info)
    - **NEW**: Late deductions log for tracking automatic leave deductions based on late policy
2. **002_storage_rls.sql** – Storage policies for the `employee-documents` bucket. Run after creating that bucket in Dashboard → Storage.

## Notes

-   `001_full_schema.sql` is self-contained: employees, teams, attendance, leave, finance, resignations, posts, announcements, settings, late_deductions_log, and all columns (address, week_off_day, documents, half-day leave, etc.) are created in one go.
-   If you already have an existing database, the old per-table and ALTER scripts in this folder were merged into `001_full_schema.sql` and can be ignored.
-   After setup, admins/HR can configure system settings via `/admin/settings` or `/hr/settings` for clock-in times, late policy, and company information.
