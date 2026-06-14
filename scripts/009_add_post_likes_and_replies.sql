-- =============================================================================
-- Add post_likes and post_replies tables for Social Feed
-- =============================================================================

-- 1. Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Policies for post_likes
CREATE POLICY "post_likes_select" ON public.post_likes 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "post_likes_insert" ON public.post_likes 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "post_likes_delete" ON public.post_likes 
  FOR DELETE TO authenticated USING (auth.uid() = employee_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_employee_id ON public.post_likes(employee_id);


-- 2. Create post_replies table
CREATE TABLE IF NOT EXISTS public.post_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_replies ENABLE ROW LEVEL SECURITY;

-- Policies for post_replies
CREATE POLICY "post_replies_select" ON public.post_replies 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "post_replies_insert" ON public.post_replies 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "post_replies_delete" ON public.post_replies 
  FOR DELETE TO authenticated USING (
    auth.uid() = author_id OR 
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_replies_post_id ON public.post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_post_replies_author_id ON public.post_replies(author_id);
