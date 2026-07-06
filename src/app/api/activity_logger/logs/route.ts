import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const body = await request.json();
    console.log("[Logs Proxy] Request body received:", JSON.stringify(body));

    const { type, page = 0, pageSize = 20, role, cat, focusedUserId, search, dateRange } = body;

    // Fetch employees for name & avatar mappings
    const { data: emps, error: empErr } = await supabaseAdmin
      .from("employees")
      .select("id, first_name, last_name, avatar_url");
    
    if (empErr) {
      console.error("[Logs Proxy] Error fetching employees list:", empErr);
    }

    const nameMap: Record<string, string> = {};
    const avatarMap: Record<string, string> = {};

    if (emps) {
      emps.forEach((emp) => {
        nameMap[emp.id] = `${emp.first_name} ${emp.last_name}`.trim();
        if (emp.avatar_url) avatarMap[emp.id] = emp.avatar_url;
      });
    }

    if (type === "counts") {
      const activeCategories = ["auth", "employee", "leave", "payroll", "role", "document", "attendance", "announcement", "resignation", "finance", "settings", "team"];
      const tempCounts: Record<string, number> = {};

      await Promise.all(
        activeCategories.map(async (category) => {
          let q = supabaseAdmin
            .from("activity_logs")
            .select("*", { count: "exact", head: true })
            .eq("category", category);

          if (role && role !== "all") q = q.eq("user_role", role);
          if (focusedUserId) q = q.eq("user_id", focusedUserId);
          if (search) q = q.ilike("description", `%${search}%`);

          if (dateRange === "today") {
            const d = new Date(); d.setHours(0, 0, 0, 0);
            q = q.gte("created_at", d.toISOString());
          } else if (dateRange === "week") {
            const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            q = q.gte("created_at", d.toISOString());
          } else if (dateRange === "month") {
            const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            q = q.gte("created_at", d.toISOString());
          }

          const { count, error } = await q;
          if (error) {
            console.error(`[Logs Proxy] Error querying count for ${category}:`, error);
          }
          tempCounts[category] = (!error && count !== null) ? count : 0;
        })
      );

      console.log("[Logs Proxy] Computed category counts:", JSON.stringify(tempCounts));

      return NextResponse.json({
        counts: tempCounts,
        employeeNames: nameMap,
        avatars: avatarMap
      });
    }

    if (type === "logs") {
      let q = supabaseAdmin
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (role && role !== "all") q = q.eq("user_role", role);
      if (cat && cat !== "all") q = q.eq("category", cat);
      if (focusedUserId) q = q.eq("user_id", focusedUserId);
      if (search) q = q.ilike("description", `%${search}%`);

      if (dateRange === "today") {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        q = q.gte("created_at", d.toISOString());
      } else if (dateRange === "week") {
        const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        q = q.gte("created_at", d.toISOString());
      } else if (dateRange === "month") {
        const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        q = q.gte("created_at", d.toISOString());
      }

      const { data, error } = await q;
      if (error) {
        console.error("[Logs Proxy] Error querying logs:", error);
        throw error;
      }

      console.log(`[Logs Proxy] Retrieved ${data?.length || 0} logs for page ${page}`);

      return NextResponse.json({
        logs: data || [],
        employeeNames: nameMap,
        avatars: avatarMap
      });
    }

    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  } catch (e) {
    console.error("[Logs Proxy] POST handler exception:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
