import { createClient } from "@/lib/supabase/client";
import { getCachedGPSLocation, updateGPSLocation } from "@/lib/locationCache";

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

  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;
  
  let browser = "Unknown";
  let os = "Unknown";
  let device = "Unknown";

  if (userAgent) {
    const uaLower = userAgent.toLowerCase();
    
    // Parse OS
    if (uaLower.includes("windows")) os = "Windows";
    else if (uaLower.includes("macintosh") || uaLower.includes("mac os")) os = "macOS";
    else if (uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";
    else if (uaLower.includes("android")) os = "Android";
    else if (uaLower.includes("linux")) os = "Linux";

    // Parse Device
    if (uaLower.includes("mobile") || uaLower.includes("iphone") || uaLower.includes("android")) {
      device = "Mobile";
    } else if (uaLower.includes("ipad") || uaLower.includes("tablet")) {
      device = "Tablet";
    } else {
      device = "Desktop";
    }

    // Parse Browser
    if (uaLower.includes("chrome") || uaLower.includes("crios")) browser = "Chrome";
    else if (uaLower.includes("safari") && !uaLower.includes("chrome")) browser = "Safari";
    else if (uaLower.includes("firefox")) browser = "Firefox";
    else if (uaLower.includes("edge")) browser = "Edge";
  }

  let cachedLoc = getCachedGPSLocation();
  if (!cachedLoc && typeof window !== 'undefined' && 'geolocation' in navigator) {
    try {
      let isGranted = false;
      if (navigator.permissions && navigator.permissions.query) {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        isGranted = (perm.state === 'granted');
      } else {
        isGranted = true;
      }

      if (isGranted) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000
          });
        });
        const geoData = await updateGPSLocation(position.coords.latitude, position.coords.longitude);
        if (geoData) {
          cachedLoc = geoData;
        }
      }
    } catch (e) {
      // Ignore geolocating errors
    }
  }

  const finalMetadata = {
    ...(params.metadata ?? {}),
    browser,
    os,
    device,
    user_agent: userAgent || "Unknown",
    ...(cachedLoc ? {
      latitude: cachedLoc.latitude,
      longitude: cachedLoc.longitude,
      area: cachedLoc.area,
      street: cachedLoc.street,
      city: cachedLoc.city,
      district: cachedLoc.district,
      state: cachedLoc.state,
      country: cachedLoc.country,
      postal_code: cachedLoc.postal_code
    } : {})
  };

  await supabase.from('activity_logs').insert({
    user_id:     user.id,
    user_name:   fullName,
    user_role:   profile.role,
    action:      params.action,
    category:    params.category,
    description: params.description,
    metadata:    finalMetadata
  })
}