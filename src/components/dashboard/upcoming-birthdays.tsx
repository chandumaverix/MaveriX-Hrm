"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Gift, Cake, Sparkles } from "lucide-react";
import type { Employee } from "@/lib/types";

const MONTHS_AHEAD = 3;

interface BirthdayEntry {
	employee: Employee;
	nextBirthday: Date;
	displayLabel: string;
	diffDays: number;
}

function getUpcomingBirthdays(employees: Employee[]): BirthdayEntry[] {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const endDate = new Date(today);
	endDate.setMonth(endDate.getMonth() + MONTHS_AHEAD);

	const entries: BirthdayEntry[] = [];

	for (const emp of employees) {
		const dob = emp.date_of_birth;
		if (!dob) continue;

		const [year, monthStr, dayStr] = dob.split("-");
		const month = parseInt(monthStr, 10) - 1;
		const day = parseInt(dayStr, 10);
		if (isNaN(month) || isNaN(day)) continue;

		let nextBirthday = new Date(today.getFullYear(), month, day);
		if (nextBirthday < today) {
			nextBirthday = new Date(today.getFullYear() + 1, month, day);
		}

		if (nextBirthday > endDate) continue;

		const diffMs = nextBirthday.getTime() - today.getTime();
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

		let displayLabel: string;
		if (diffDays === 0) {
			displayLabel = "Today";
		} else if (diffDays === 1) {
			displayLabel = "Tomorrow";
		} else if (diffDays <= 7) {
			displayLabel = `In ${diffDays} days`;
		} else {
			displayLabel = nextBirthday.toLocaleDateString("en-IN", {
				month: "short",
				day: "numeric",
			});
		}

		entries.push({ employee: emp, nextBirthday, displayLabel, diffDays });
	}

	entries.sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime());
	return entries;
}

function BirthdayBadge({
	displayLabel,
	diffDays,
}: {
	displayLabel: string;
	diffDays: number;
}) {
	const isToday = diffDays === 0;
	const isTomorrow = diffDays === 1;

	const style = isToday
		? "bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-450 border border-rose-100/50 dark:border-rose-900/30 text-[8px]"
		: isTomorrow
		? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border border-amber-100/50 dark:border-amber-900/30 text-[8px]"
		: "bg-slate-50 dark:bg-slate-950/40 text-slate-550 dark:text-slate-400 border border-slate-100/80 dark:border-slate-800 text-[8px]";

	return (
		<span
			className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-black uppercase tracking-wider ${style}`}>
			{isToday && <Sparkles className='h-2.5 w-2.5' />}
			{isTomorrow && <Cake className='h-2.5 w-2.5' />}
			{displayLabel}
		</span>
	);
}

export function UpcomingBirthdays() {
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchEmployees = async () => {
			const supabase = createClient();
			const { data } = await supabase
				.from("employees")
				.select("*")
				.not("date_of_birth", "is", null)
				.eq("is_active", true);
			setEmployees((data as Employee[]) || []);
			setLoading(false);
		};
		fetchEmployees();
	}, []);

	const upcoming = getUpcomingBirthdays(employees);

	return (
		<Card className="h-full flex flex-col rounded-2xl border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
			<CardHeader className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800/40 flex-shrink-0 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50/80 dark:bg-pink-950/20 border border-pink-100/50 dark:border-pink-900/30 text-pink-500 dark:text-pink-400 shadow-[0_2px_8px_rgba(244,63,94,0.05)]">
						<Gift className="h-4.5 w-4.5" />
					</div>
					<div className="text-left">
						<CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Upcoming Birthdays</CardTitle>
						{!loading && upcoming.length > 0 && (
							<p className="text-[9px] text-slate-400 font-bold mt-0.5">Next {MONTHS_AHEAD} months</p>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className='p-5 flex-grow flex flex-col min-h-0'>
				{loading ? (
					<div className='space-y-2.5 flex-grow'>
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className='flex items-center gap-3 rounded-xl p-2.5 border border-slate-50 dark:border-slate-850 bg-white dark:bg-slate-900'>
								<div className='h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800' />
								<div className='flex-1 space-y-1.5'>
									<div className='h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800' />
									<div className='h-2.5 w-14 animate-pulse rounded bg-slate-100/70 dark:bg-slate-800/70' />
								</div>
							</div>
						))}
					</div>
				) : upcoming.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-8 text-center flex-grow'>
						<div className='mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 text-slate-400'>
							<Cake className='h-6 w-6 text-slate-400 dark:text-slate-550' />
						</div>
						<p className='text-xs font-bold text-slate-700 dark:text-slate-300'>
							No birthdays soon
						</p>
						<p className='text-[10px] text-slate-400 font-bold mt-1 max-w-[180px]'>
							Birthdays in the next {MONTHS_AHEAD} months will appear here
						</p>
					</div>
				) : (
					<ul className='space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide flex-grow'>
						{upcoming.map(
							({ employee, displayLabel, diffDays }) => {
								const isToday = diffDays === 0;
								const name = `${employee.first_name ?? ""} ${
									employee.last_name ?? ""
								}`.trim();
								return (
									<li
										key={employee.id}
										className={
											isToday
												? "flex items-center gap-3 rounded-xl border border-pink-100/80 dark:border-pink-900/30 bg-pink-50/10 dark:bg-pink-950/10 p-2.5 transition-all hover:shadow-[0_2px_12px_rgba(244,63,94,0.03)]"
												: "flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 p-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-850 hover:shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
										}>
										<Avatar
											className={
												isToday
													? "h-8 w-8 shrink-0 ring-2 ring-pink-400/50 dark:ring-pink-500/50 border border-white dark:border-slate-900"
													: "h-8 w-8 shrink-0 border border-slate-100 dark:border-slate-800"
											}>
											{employee.avatar_url ? (
												<AvatarImage
													className="object-cover"
													src={employee.avatar_url}
													alt={name}
												/>
											) : null}
											<AvatarFallback className='text-[9px] font-black bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'>
												{employee.first_name?.[0]}
												{employee.last_name?.[0]}
											</AvatarFallback>
										</Avatar>
										<div className='flex-1 min-w-0 text-left'>
											<p className={`text-[10px] font-bold truncate ${isToday ? "text-pink-700 dark:text-pink-400" : "text-slate-800 dark:text-slate-200"}`}>
												{name}
											</p>
											{employee.designation && (
												<p className='text-[9px] text-slate-400 font-bold truncate mt-0.5'>
													{employee.designation}
												</p>
											)}
										</div>
										<BirthdayBadge
											displayLabel={displayLabel}
											diffDays={diffDays}
										/>
									</li>
								);
							}
						)}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
