import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const IST_OFFSET_MINUTES = 330; // Asia/Kolkata (UTC+05:30), no DST

export async function POST(request: NextRequest) {
	const requestMeta = {
		method: request.method,
		url: request.url,
		userAgent: request.headers.get("user-agent"),
		hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
		timestamp: new Date().toISOString(),
	};

	const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
	const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
	if (!hasSupabaseUrl || !hasServiceRoleKey) {
		console.error("[AutoClockOut] Missing required environment variables", {
			hasSupabaseUrl,
			hasServiceRoleKey,
		});
		return Response.json(
			{
				error: "Missing required environment variables",
				debug: { ...requestMeta, hasSupabaseUrl, hasServiceRoleKey },
			},
			{ status: 500 },
		);
	}

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
	);

	try {
		// ── 1. Fetch settings ────────────────────────────────────────────────────
		const { data: settings, error: settingsError } = await supabase
			.from("settings")
			.select("auto_clock_out_time")
			.limit(1)
			.single();

		if (settingsError || !settings?.auto_clock_out_time) {
			console.warn("[AutoClockOut] Settings missing or invalid", {
				settingsError,
				auto_clock_out_time: settings?.auto_clock_out_time ?? null,
			});
			return Response.json(
				{
					message: "Auto clock-out time not configured",
					debug: {
						...requestMeta,
						settingsError,
						auto_clock_out_time:
							settings?.auto_clock_out_time ?? null,
					},
				},
				{ status: 200 },
			);
		}

		// ── 2. Parse the stored time (e.g. "7:30 PM", "7:30PM", "19:30") ────────
		const parsed = parseTime(settings.auto_clock_out_time);
		if (!parsed) {
			console.error("[AutoClockOut] Invalid auto_clock_out_time", {
				raw: settings.auto_clock_out_time,
			});
			return Response.json(
				{
					error: "Invalid auto clock-out time format",
					debug: {
						...requestMeta,
						auto_clock_out_time: settings.auto_clock_out_time,
					},
				},
				{ status: 400 },
			);
		}
		console.log("[AutoClockOut] Parsed configured time", {
			raw: settings.auto_clock_out_time,
			parsed,
		});

		// ── 3. Build clock-out datetime using IST explicitly (Vercel runs in UTC) ─
		const now = new Date(); // UTC-based timestamp
		const istNow = getIstNow(now);
		const todayStr = toLocalDateStr(istNow); // IST date string
		const clockOutDateTime = buildIstTimeAsUtcDate(istNow, parsed.hours, parsed.minutes);

		// Safety guard: if cron fires early (clock hasn't reached the set time yet)
		if (now < clockOutDateTime) {
			console.log("[AutoClockOut] Time not reached yet", {
				now: now.toISOString(),
				nowIST: istNow.toISOString(),
				clockOutDateTime: clockOutDateTime.toISOString(),
				todayStr,
			});
			return Response.json(
				{
					message: "Auto clock-out time not reached yet",
					debug: {
						...requestMeta,
						now: now.toISOString(),
						nowIST: istNow.toISOString(),
						clockOutDateTime: clockOutDateTime.toISOString(),
						todayStr,
					},
				},
				{ status: 200 },
			);
		}

		// ── 4. Fetch all unclosed records for today in one query ─────────────────
		const { data: unclosedRecords, error: attendanceError } = await supabase
			.from("attendance")
			.select("id, clock_in")
			.eq("date", todayStr)
			.not("clock_in", "is", null)
			.is("clock_out", null);

		if (attendanceError) {
			console.error(
				"[AutoClockOut] Error fetching attendance",
				attendanceError,
			);
			return Response.json(
				{
					error: "Failed to fetch attendance records",
					debug: { ...requestMeta, todayStr, attendanceError },
				},
				{ status: 500 },
			);
		}
		console.log("[AutoClockOut] Unclosed records fetched", {
			todayStr,
			count: unclosedRecords?.length ?? 0,
		});

		if (!unclosedRecords?.length) {
			return Response.json(
				{
					message: "No unclosed attendance records found",
					debug: { ...requestMeta, todayStr, count: 0 },
				},
				{ status: 200 },
			);
		}

		// ── 5. Compute total_hours per record, then bulk update ──────────────────
		const clockOutISO = clockOutDateTime.toISOString();

		const updates = unclosedRecords
			.filter((r) => r.id && r.clock_in) // skip malformed rows
			.map((record) => {
				const clockIn = new Date(record.clock_in);
				const totalHours = Math.max(
					0,
					parseFloat(
						(
							(clockOutDateTime.getTime() - clockIn.getTime()) /
							3_600_000
						).toFixed(2),
					),
				);
				return {
					id: record.id,
					clock_out: clockOutISO,
					total_hours: totalHours,
				};
			});

		// IMPORTANT: use update-by-id, not upsert.
		// Upsert with partial payload can try inserting rows and fail on required columns.
		const results = await Promise.all(
			updates.map((u) =>
				supabase
					.from("attendance")
					.update({
						clock_out: u.clock_out,
						total_hours: u.total_hours,
					})
					.eq("id", u.id),
			),
		);

		const failed = results.filter((r) => r.error);
		if (failed.length > 0) {
			console.error(
				"[AutoClockOut] Update errors",
				failed.map((r) => r.error),
			);
			return Response.json(
				{
					error: "Failed to update attendance records",
					debug: {
						...requestMeta,
						todayStr,
						attempted: updates.length,
						failed: failed.length,
						errors: failed.map((r) => r.error),
					},
				},
				{ status: 500 },
			);
		}

		console.log(
			`[AutoClockOut] ${updates.length} records closed at ${clockOutISO}`,
		);

		return Response.json(
			{
				message: `Auto clock-out complete`,
				processedCount: updates.length,
				clockOutTime: clockOutISO,
				debug: {
					...requestMeta,
					todayStr,
					unclosedCount: unclosedRecords.length,
					processedCount: updates.length,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[AutoClockOut] Unexpected error", error);
		return Response.json(
			{
				error: "Internal server error",
				debug: {
					...requestMeta,
					error:
						error instanceof Error ? error.message : String(error),
				},
			},
			{ status: 500 },
		);
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parses "7:30 PM", "7:30PM", "19:30", "7:30 pm" → { hours, minutes } */
function parseTime(raw: string): { hours: number; minutes: number } | null {
	if (!raw?.trim()) return null;

	// Normalise: collapse whitespace, uppercase
	const s = raw.trim().toUpperCase().replace(/\s+/g, " ");

	// Regex handles: "7:30 PM", "7:30PM", "19:30", "07:30"
	const match = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
	if (!match) return null;

	let hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2], 10);
	const meridiem = match[3]; // "AM" | "PM" | undefined

	if (meridiem === "PM" && hours !== 12) hours += 12;
	else if (meridiem === "AM" && hours === 12) hours = 0;

	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

	return { hours, minutes };
}

/** Returns "YYYY-MM-DD" in local time (avoids UTC date shift) */
function toLocalDateStr(date: Date): string {
	return [
		date.getUTCFullYear(),
		String(date.getUTCMonth() + 1).padStart(2, "0"),
		String(date.getUTCDate()).padStart(2, "0"),
	].join("-");
}

/** Converts a UTC Date to an IST-shifted Date (use UTC getters on returned value). */
function getIstNow(utcNow: Date): Date {
	return new Date(utcNow.getTime() + IST_OFFSET_MINUTES * 60_000);
}

/**
 * Builds a UTC Date for "today in IST at HH:mm".
 * Example: IST 17:00 becomes UTC 11:30.
 */
function buildIstTimeAsUtcDate(
	istNow: Date,
	hours: number,
	minutes: number,
): Date {
	const utcMs = Date.UTC(
		istNow.getUTCFullYear(),
		istNow.getUTCMonth(),
		istNow.getUTCDate(),
		hours,
		minutes,
		0,
		0,
	);
	return new Date(utcMs - IST_OFFSET_MINUTES * 60_000);
}
