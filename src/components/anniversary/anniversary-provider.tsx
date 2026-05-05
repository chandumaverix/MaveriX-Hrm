"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/user-context";
import { AnniversaryBar } from "./anniversary-bar";
import type { Employee } from "@/lib/types";

/** Returns true if employee's joining_date falls on today (local date) and year is different. */
function isAnniversaryToday(joiningDate: string | null): boolean {
	if (!joiningDate) return false;
	const d = new Date(joiningDate);
	if (isNaN(d.getTime())) return false;
	
	const today = new Date();
	// Check if month and day match today
	if (today.getMonth() !== d.getMonth() || today.getDate() !== d.getDate()) return false;
	
	return true;
}

export function AnniversaryProvider({ children }: { children: React.ReactNode }) {
	const { employee } = useUser();
	const [todayAnniversaries, setTodayAnniversaries] = useState<Employee[]>([]);

	const fetchTodayAnniversaries = useCallback(async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select("*")
			.not("joining_date", "is", null)
			.eq("is_active", true);
		const list = (data as Employee[]) || [];
		const withAnniversaryToday = list.filter((e) =>
			isAnniversaryToday(e.joining_date)
		);
		setTodayAnniversaries(withAnniversaryToday);
	}, []);

	useEffect(() => {
		fetchTodayAnniversaries();
	}, [fetchTodayAnniversaries]);

	const isAdminOrHr = employee?.role === "admin" || employee?.role === "hr";

	return (
		<>
			{isAdminOrHr && todayAnniversaries.length > 0 && (
				<AnniversaryBar anniversaryEmployees={todayAnniversaries} />
			)}
			{children}
		</>
	);
}
