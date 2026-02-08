-- =============================================================================
-- Storage RLS: employee-documents bucket (run after creating the bucket)
-- =============================================================================
-- 1. In Supabase Dashboard → Storage: create bucket named "employee-documents".
-- 2. Run this script in SQL Editor.
-- =============================================================================

create policy "Users can upload to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'employee-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can read own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'employee-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'employee-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'employee-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
