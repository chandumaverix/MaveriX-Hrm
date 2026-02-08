"use server";

import { createClient } from "@/lib/supabase/server";

/** Get next employee_id for the given joining date year. If current employee already has an id for that year, keep it. */
async function getEmployeeIdForJoiningDate(
	joiningDate: string,
	currentEmployeeId: string
): Promise<string> {
	const parsed = new Date(joiningDate);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error("Invalid joining date.");
	}
	const year = parsed.getFullYear();
	const prefix = `${year}EMP-`;
	const supabase = await createClient();

	const { data: currentRow } = await supabase
		.from("employees")
		.select("employee_id")
		.eq("id", currentEmployeeId)
		.single();
	const existingId = (currentRow as { employee_id?: string } | null)
		?.employee_id;
	if (existingId && existingId.startsWith(prefix)) {
		return existingId;
	}

	const { data, error } = await supabase
		.from("employees")
		.select("employee_id")
		.like("employee_id", `${prefix}%`)
		.order("employee_id", { ascending: false })
		.limit(1);

	if (error) throw new Error(error.message);

	const last = (data?.[0] as { employee_id?: string })?.employee_id;
	const next = last ? (parseInt(last.replace(prefix, ""), 10) || 0) + 1 : 1;
	return `${prefix}${String(next).padStart(3, "0")}`;
}

export type ProfileUpdateInput = {
	first_name: string;
	last_name: string;
	phone: string | null;
	address: string | null;
	date_of_birth: string | null;
	joining_date: string | null;
};

export async function updateProfile(
	employeeId: string,
	input: ProfileUpdateInput
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const supabase = await createClient();

		const payload: Record<string, unknown> = {
			first_name: input.first_name.trim(),
			last_name: input.last_name.trim(),
			phone: input.phone?.trim() || null,
			address: input.address?.trim() || null,
			date_of_birth: input.date_of_birth || null,
			joining_date: input.joining_date || null,
		};

		if (input.joining_date) {
			payload.employee_id = await getEmployeeIdForJoiningDate(
				input.joining_date,
				employeeId
			);
		}

		const { error } = await supabase
			.from("employees")
			.update(payload)
			.eq("id", employeeId);

		if (error) return { ok: false, error: error.message };
		return { ok: true };
	} catch (e) {
		const message =
			e instanceof Error ? e.message : "Failed to update profile";
		return { ok: false, error: message };
	}
}
