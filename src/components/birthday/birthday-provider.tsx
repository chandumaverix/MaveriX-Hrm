"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/user-context";
import { BirthdayAlert } from "./birthday-alert";
import { BirthdayBar } from "./birthday-bar";
import type { Employee } from "@/lib/types";

const BIRTHDAY_SEEN_KEY = "birthday-wish-seen-date";

function todayLocalKey() {
	const d = new Date();
	return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Returns true if employee's date_of_birth (YYYY-MM-DD) falls on today (local date). */
function isBirthdayToday(dob: string | null): boolean {
	if (!dob) return false;
	const [y, mo, day] = dob.split("-").map(Number);
	if (isNaN(mo) || isNaN(day)) return false;
	const today = new Date();
	return today.getMonth() === mo - 1 && today.getDate() === day;
}

export function BirthdayProvider({ children }: { children: React.ReactNode }) {
	const { employee } = useUser();
	const [todayBirthdays, setTodayBirthdays] = useState<Employee[]>([]);

	const fetchTodayBirthdays = useCallback(async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select("*")
			.not("date_of_birth", "is", null)
			.eq("is_active", true);
		const list = (data as Employee[]) || [];
		const withBirthdayToday = list.filter((e) =>
			isBirthdayToday(e.date_of_birth)
		);
		setTodayBirthdays(withBirthdayToday);
	}, []);

	useEffect(() => {
		fetchTodayBirthdays();
	}, [fetchTodayBirthdays]);

	const [showPopup, setShowPopup] = useState(false);
	const todayKey = todayLocalKey();

	// Auto-show popup once per day for the birthday person
	useEffect(() => {
		if (todayBirthdays.length === 0 || !employee) return;
		const isCurrentUserBirthday = todayBirthdays.some(
			(e) => e.id === employee.id
		);
		if (!isCurrentUserBirthday) return;
		const seen =
			typeof window !== "undefined"
				? sessionStorage.getItem(BIRTHDAY_SEEN_KEY)
				: null;
		if (seen !== todayKey) setShowPopup(true);
	}, [todayBirthdays, employee, todayKey]);

	const handleDismissPopup = useCallback(() => {
		if (typeof window !== "undefined")
			sessionStorage.setItem(BIRTHDAY_SEEN_KEY, todayKey);
		setShowPopup(false);
	}, [todayKey]);

	const isCurrentUserBirthday =
		employee && todayBirthdays.some((e) => e.id === employee.id);
	const currentEmployee =
		employee && todayBirthdays.find((e) => e.id === employee.id);

	return (
		<>
			{todayBirthdays.length > 0 && (
				<BirthdayBar birthdayEmployees={todayBirthdays} />
			)}
			{children}
			{showPopup && isCurrentUserBirthday && currentEmployee && (
				<BirthdayAlert
					employee={currentEmployee}
					onDismiss={handleDismissPopup}
				/>
			)}
		</>
	);
}
