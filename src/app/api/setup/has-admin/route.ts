import { NextResponse } from "next/server";

/**
 * Returns whether any admin exists. Used by register-admin page to show form only when no admin exists.
 * Uses service role when available; otherwise returns false so first-time setup still works.
 */
export async function GET() {
	try {
		const { createAdminClient } = await import(
			"@/lib/supabase/server-admin"
		);
		const supabase = createAdminClient();
		const { count } = await supabase
			.from("employees")
			.select("*", { count: "exact", head: true })
			.eq("role", "admin")
			.limit(1);
		return NextResponse.json({ hasAdmin: (count ?? 0) > 0 });
	} catch {
		return NextResponse.json({ hasAdmin: false });
	}
}
