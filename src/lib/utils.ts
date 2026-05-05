import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// ── Extracted & timezone-safe helper
export function determineAttendanceStatus(
	now: Date,
	maxClockingTime?: string | null,
): "present" | "late" {
	if (!maxClockingTime?.trim()) return "present";

	try {
		const cleaned = maxClockingTime.trim();

		// Matches: "9:00", "09:00", "9:00 AM", "9:00PM", "9:5 am"
		const match = cleaned.match(/^(\d{1,2}):(\d{1,2})\s*(AM|PM)?$/i);
		if (!match) {
			console.warn("Unrecognised max_clocking_time format:", cleaned);
			return "present"; // fail-open: don't wrongly mark late
		}

		let hours = parseInt(match[1], 10);
		const minutes = parseInt(match[2], 10);
		const meridiem = match[3]?.toUpperCase();

		// Convert to 24-hour — only when AM/PM is explicitly provided
		if (meridiem === "PM" && hours !== 12) hours += 12;
		else if (meridiem === "AM" && hours === 12) hours = 0;

		// Build threshold in LOCAL wall-clock time (same timezone as the device)
		const threshold = new Date(now);
		threshold.setHours(hours, minutes, 0, 0);

		return now > threshold ? "late" : "present";
	} catch (err) {
		console.error("Error parsing max_clocking_time:", err);
		return "present"; // fail-open
	}
}
