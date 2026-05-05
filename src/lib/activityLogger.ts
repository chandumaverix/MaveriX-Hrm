import { createClient } from "@/lib/supabase/client";

export type ActivityCategory =
  | 'auth' | 'employee' | 'leave' | 'payroll' | 'role'
  | 'document' | 'attendance' | 'announcement' | 'resignation'
  | 'finance' | 'settings' | 'team'

interface LogParams {
  action: string
  category: ActivityCategory
  description: string
  metadata?: Record<string, any>
}

import { SupabaseClient } from '@supabase/supabase-js'

export async function logActivity(params: LogParams, customSupabase?: SupabaseClient) {
  const supabase = customSupabase ?? createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('employees')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) return

  const fullName = `${profile.first_name} ${profile.last_name}`.trim()

  await supabase.from('activity_logs').insert({
    user_id:     user.id,
    user_name:   fullName,
    user_role:   profile.role,
    action:      params.action,
    category:    params.category,
    description: params.description,
    metadata:    params.metadata ?? {},
  })
}