-- ============================================================
-- SQL script to deploy accurate metadata trigger to activity_logs
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Create a helper function to parse user agents on database level
CREATE OR REPLACE FUNCTION public.parse_user_agent(ua TEXT)
RETURNS JSONB AS $$
DECLARE
  v_browser TEXT := 'Unknown';
  v_os TEXT := 'Unknown';
  v_device TEXT := 'Unknown';
  v_ua_lower TEXT;
BEGIN
  IF ua IS NULL OR ua = '' THEN
    RETURN jsonb_build_object(
      'browser', v_browser,
      'os', v_os,
      'device', v_device
    );
  END IF;

  v_ua_lower := lower(ua);

  -- Parse Operating System
  IF v_ua_lower LIKE '%windows%' THEN
    v_os := 'Windows';
  ELSIF v_ua_lower LIKE '%macintosh%' OR v_ua_lower LIKE '%mac os%' THEN
    v_os := 'macOS';
  ELSIF v_ua_lower LIKE '%iphone%' OR v_ua_lower LIKE '%ipad%' THEN
    v_os := 'iOS';
  ELSIF v_ua_lower LIKE '%android%' THEN
    v_os := 'Android';
  ELSIF v_ua_lower LIKE '%linux%' THEN
    v_os := 'Linux';
  END IF;

  -- Parse Device Category
  IF v_ua_lower LIKE '%mobile%' OR v_ua_lower LIKE '%iphone%' OR v_ua_lower LIKE '%android%' THEN
    v_device := 'Mobile';
  ELSIF v_ua_lower LIKE '%ipad%' OR v_ua_lower LIKE '%tablet%' THEN
    v_device := 'Tablet';
  ELSE
    v_device := 'Desktop';
  END IF;

  -- Parse Browser
  IF v_ua_lower LIKE '%chrome%' OR v_ua_lower LIKE '%crios%' THEN
    v_browser := 'Chrome';
  ELSIF v_ua_lower LIKE '%safari%' AND v_ua_lower NOT LIKE '%chrome%' THEN
    v_browser := 'Safari';
  ELSIF v_ua_lower LIKE '%firefox%' THEN
    v_browser := 'Firefox';
  ELSIF v_ua_lower LIKE '%edge%' THEN
    v_browser := 'Edge';
  END IF;

  RETURN jsonb_build_object(
    'browser', v_browser,
    'os', v_os,
    'device', v_device,
    'user_agent', ua
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Create the before insert trigger function to capture request headers
CREATE OR REPLACE FUNCTION public.process_activity_log_headers()
RETURNS TRIGGER AS $$
DECLARE
  v_ip TEXT;
  v_ua TEXT;
  v_ua_json JSONB;
BEGIN
  -- Populate IP address from request headers if empty
  IF NEW.ip_address IS NULL OR NEW.ip_address = '' THEN
    BEGIN
      v_ip := split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1);
      IF v_ip <> '' THEN
        NEW.ip_address := v_ip;
      ELSE
        NEW.ip_address := 'Unknown';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NEW.ip_address := 'Unknown';
    END;
  END IF;

  -- Enrich metadata with Browser, OS, and Device from client user agent header
  IF NOT (NEW.metadata ? 'user_agent') OR NEW.metadata->>'user_agent' IS NULL OR NEW.metadata->>'user_agent' = '' THEN
    BEGIN
      v_ua := coalesce(current_setting('request.headers', true)::json->>'user-agent', '');
      IF v_ua <> '' THEN
        v_ua_json := public.parse_user_agent(v_ua);
        NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || v_ua_json;
      ELSE
        NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
          'browser', 'Unknown',
          'os', 'Unknown',
          'device', 'Unknown'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
        'browser', 'Unknown',
        'os', 'Unknown',
        'device', 'Unknown'
      );
    END;
  ELSE
    -- If user_agent is already provided in metadata, parse it to ensure browser/os/device properties exist
    BEGIN
      v_ua := NEW.metadata->>'user_agent';
      v_ua_json := public.parse_user_agent(v_ua);
      NEW.metadata := NEW.metadata || v_ua_json;
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach BEFORE INSERT trigger to activity_logs table
DROP TRIGGER IF EXISTS tr_process_activity_log_headers ON public.activity_logs;
CREATE TRIGGER tr_process_activity_log_headers
  BEFORE INSERT ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.process_activity_log_headers();
