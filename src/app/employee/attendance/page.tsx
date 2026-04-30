"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, ChevronLeft, ChevronRight, TrendingUp, CheckCircle2, XCircle, Coffee, CalendarDays } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import type { Attendance } from "@/lib/types";

type DayStatus = "present" | "late" | "absent" | "leave" | "week_off";

interface DayRow {
	date: string;
	status: DayStatus;
	record?: Attendance;
}

function getDatesInMonth(year: number, month: number): string[] {
	const dates: string[] = [];
	const days = new Date(year, month + 1, 0).getDate();
	for (let d = 1; d <= days; d++) {
		const y = year.toString();
		const m = month.toString().padStart(2, "0");
		const day = d.toString().padStart(2, "0");
		dates.push(`${y}-${m}-${day}`);
	}
	return dates;
}

function getStatusBadge(status: DayStatus) {
	switch (status) {
		case "present":
			return (
				<div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold'>
					<CheckCircle2 className='h-3.5 w-3.5' />
					Present
				</div>
			);
		case "late":
			return (
				<div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold'>
					<Clock className='h-3.5 w-3.5' />
					Late
				</div>
			);
		case "absent":
			return (
				<div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold'>
					<XCircle className='h-3.5 w-3.5' />
					Absent
				</div>
			);
		case "leave":
			return (
				<div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold'>
					<Coffee className='h-3.5 w-3.5' />
					On Leave
				</div>
			);
		case "week_off":
			return (
				<div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold'>
					<CalendarDays className='h-3.5 w-3.5' />
					Week Off
				</div>
			);
		default:
			return <Badge variant='outline'>{status}</Badge>;
	}
}

function formatTime(s: string | null) {
	if (!s) return "–";
	return new Date(s).toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function EmployeeAttendancePage() {
	const { employee } = useUser();
	const [records, setRecords] = useState<Attendance[]>([]);
	const [selectedMonth, setSelectedMonth] = useState(
		new Date().toISOString().slice(0, 7)
	);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (employee) fetchAttendance();
	}, [employee?.id, selectedMonth]);

	const fetchAttendance = async () => {
		if (!employee) return;
		const [year, month] = selectedMonth.split("-").map(Number);
		const start = `${year}-${String(month).padStart(2, "0")}-01`;
		const end = new Date(year, month + 1, 0).toISOString().split("T")[0];

		const supabase = createClient();
		const { data } = await supabase
			.from("attendance")
			.select("*")
			.eq("employee_id", employee.id)
			.gte("date", start)
			.lte("date", end)
			.order("date", { ascending: false });

		setRecords(data || []);
		setIsLoading(false);
	};

	// Helper functions for month navigation
	const goToPreviousMonth = () => {
		const [year, month] = selectedMonth.split("-").map(Number);
		const prevDate = new Date(year, month - 2, 1);
		const newMonth = `${prevDate.getFullYear()}-${String(
			prevDate.getMonth() + 1
		).padStart(2, "0")}`;
		setSelectedMonth(newMonth);
	};

	const goToNextMonth = () => {
		const [year, month] = selectedMonth.split("-").map(Number);
		const nextDate = new Date(year, month, 1);
		const currentMonth = new Date().toISOString().slice(0, 7);
		const newMonth = `${nextDate.getFullYear()}-${String(
			nextDate.getMonth() + 1
		).padStart(2, "0")}`;
		// Don't allow going beyond current month
		if (newMonth <= currentMonth) {
			setSelectedMonth(newMonth);
		}
	};

	const recordByDate = new Map(records.map((r) => [r.date, r]));

	const [year, month] = selectedMonth.split("-").map(Number);
	const today = new Date().toISOString().slice(0, 10);
	const allDates = getDatesInMonth(year, month);
	const dates = allDates.filter((d) => d <= today);
	const weekOffDay = employee?.week_off_day ?? null;

	const days: DayRow[] = dates.map((date) => {
		const rec = recordByDate.get(date);
		const dayOfWeek = new Date(date + "T12:00:00").getDay();

		if (weekOffDay != null && dayOfWeek === weekOffDay) {
			return { date, status: "week_off" as DayStatus };
		}
		if (rec) {
			return { date, status: rec.status as DayStatus, record: rec };
		}
		return { date, status: "absent" as DayStatus };
	});

	// Most recent first
	days.reverse();

	const stats = {
		present: days.filter((d) => d.status === "present").length,
		late: days.filter((d) => d.status === "late").length,
		absent: days.filter((d) => d.status === "absent").length,
		leave: days.filter((d) => d.status === "leave").length,
		weekOff: days.filter((d) => d.status === "week_off").length,
	};

	// Format month display
	const monthDisplay = new Date(selectedMonth + "-01").toLocaleDateString(
		"en-US",
		{
			month: "long",
			year: "numeric",
		}
	);

	// Check if next button should be disabled
	const currentMonth = new Date().toISOString().slice(0, 7);
	const isCurrentMonth = selectedMonth === currentMonth;

	return (
		<div className='flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950'>
			<DashboardHeader
				title='My Attendance'
				description='Track your attendance history and statistics'
			/>

			<div className='flex-1 space-y-8 p-4 md:p-6 pb-20 md:pb-6'>
				{/* Month Navigation */}
				<Card className='border-2 border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm'>
					<CardContent className='p-6'>
						<div className='flex items-center justify-between gap-4'>
							<Button
								variant='outline'
								size='icon'
								onClick={goToPreviousMonth}
								className='h-10 w-10 shrink-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'>
								<ChevronLeft className='h-5 w-5' />
							</Button>
							<div className='flex items-center gap-3 flex-1 justify-center'>
								<div className='h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30'>
									<Calendar className='h-5 w-5 text-white' />
								</div>
								<h2 className='text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent'>
									{monthDisplay}
								</h2>
							</div>
							<Button
								variant='outline'
								size='icon'
								onClick={goToNextMonth}
								disabled={isCurrentMonth}
								className='h-10 w-10 shrink-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50'>
								<ChevronRight className='h-5 w-5' />
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Stats Cards */}
				<div className='grid gap-4 grid-cols-2 md:grid-cols-5'>
					<Card className='border-2 border-emerald-200/60 dark:border-emerald-900/40 shadow-lg shadow-emerald-200/30 dark:shadow-none bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900/80 hover:shadow-xl hover:shadow-emerald-200/40 transition-all duration-300'>
						<CardContent className='p-5'>
							<div className='space-y-3'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider'>
										Present
									</p>
									<div className='h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30'>
										<CheckCircle2 className='h-5 w-5 text-white' />
									</div>
								</div>
								<p className='text-4xl font-bold text-emerald-600 dark:text-emerald-400'>
									{stats.present}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className='border-2 border-amber-200/60 dark:border-amber-900/40 shadow-lg shadow-amber-200/30 dark:shadow-none bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900/80 hover:shadow-xl hover:shadow-amber-200/40 transition-all duration-300'>
						<CardContent className='p-5'>
							<div className='space-y-3'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider'>
										Late
									</p>
									<div className='h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30'>
										<Clock className='h-5 w-5 text-white' />
									</div>
								</div>
								<p className='text-4xl font-bold text-amber-600 dark:text-amber-400'>
									{stats.late}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className='border-2 border-red-200/60 dark:border-red-900/40 shadow-lg shadow-red-200/30 dark:shadow-none bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-900/80 hover:shadow-xl hover:shadow-red-200/40 transition-all duration-300'>
						<CardContent className='p-5'>
							<div className='space-y-3'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider'>
										Absent
									</p>
									<div className='h-10 w-10 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30'>
										<XCircle className='h-5 w-5 text-white' />
									</div>
								</div>
								<p className='text-4xl font-bold text-red-600 dark:text-red-400'>
									{stats.absent}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className='border-2 border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/30 dark:shadow-none bg-gradient-to-br from-slate-50 to-white dark:from-slate-950/20 dark:to-slate-900/80 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300'>
						<CardContent className='p-5'>
							<div className='space-y-3'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider'>
										Week Off
									</p>
									<div className='h-10 w-10 rounded-xl bg-slate-500 flex items-center justify-center shadow-lg shadow-slate-500/30'>
										<CalendarDays className='h-5 w-5 text-white' />
									</div>
								</div>
								<p className='text-4xl font-bold text-slate-600 dark:text-slate-400'>
									{stats.weekOff}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className='border-2 border-blue-200/60 dark:border-blue-900/40 shadow-lg shadow-blue-200/30 dark:shadow-none bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900/80 hover:shadow-xl hover:shadow-blue-200/40 transition-all duration-300'>
						<CardContent className='p-5'>
							<div className='space-y-3'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider'>
										On Leave
									</p>
									<div className='h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30'>
										<Coffee className='h-5 w-5 text-white' />
									</div>
								</div>
								<p className='text-4xl font-bold text-blue-600 dark:text-blue-400'>
									{stats.leave}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Attendance History Table */}
				<Card className='border-2 border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm'>
					<CardHeader className='pb-4'>
						<div className='flex items-center gap-3'>
							<div className='h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30'>
								<TrendingUp className='h-5 w-5 text-white' />
							</div>
							<div>
								<CardTitle className='text-lg font-bold'>
									Attendance Records
								</CardTitle>
								<p className='text-sm text-muted-foreground'>
									Detailed view of all attendance entries for the selected month
								</p>
							</div>
						</div>
					</CardHeader>
					<CardContent className='px-0 pb-0'>
						{isLoading ? (
							<div className='py-16 text-center'>
								<div className='inline-flex items-center gap-3 text-muted-foreground'>
									<div className='h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500' />
									<span className='font-medium'>Loading attendance data...</span>
								</div>
							</div>
						) : days.length === 0 ? (
							<div className='py-16 text-center text-muted-foreground'>
								<div className='h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4'>
									<Calendar className='h-8 w-8 text-slate-400' />
								</div>
								<p className='font-medium'>No attendance records for this month</p>
							</div>
						) : (
							<div className='overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow className='hover:bg-transparent border-t bg-slate-50/50 dark:bg-slate-800/50'>
											<TableHead className='font-semibold text-slate-700 dark:text-slate-300'>Date</TableHead>
											<TableHead className='font-semibold text-slate-700 dark:text-slate-300'>Status</TableHead>
											<TableHead className='font-semibold text-slate-700 dark:text-slate-300'>Clock In</TableHead>
											<TableHead className='font-semibold text-slate-700 dark:text-slate-300'>Clock Out</TableHead>
											<TableHead className='font-semibold text-slate-700 dark:text-slate-300'>Hours</TableHead>
											<TableHead className='font-semibold text-slate-700 dark:text-slate-300'>Notes</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{days.map((row) => (
											<TableRow
												key={row.date}
												className='hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800'>
												<TableCell className='font-medium'>
													<div className='flex flex-col'>
														<span className='text-sm'>
															{new Date(
																row.date + "T12:00:00"
															).toLocaleDateString(
																"en-US",
																{
																	weekday: "short",
																	month: "short",
																	day: "numeric",
																}
															)}
														</span>
														<span className='text-xs text-muted-foreground'>
															{new Date(
																row.date + "T12:00:00"
															).getFullYear()}
														</span>
													</div>
												</TableCell>
												<TableCell>
													{getStatusBadge(row.status)}
												</TableCell>
												<TableCell className='text-muted-foreground tabular-nums text-sm'>
													{row.record
														? formatTime(
															row.record
																.clock_in
														)
														: "–"}
												</TableCell>
												<TableCell className='text-muted-foreground tabular-nums text-sm'>
													{row.record
														? formatTime(
															row.record
																.clock_out
														)
														: "–"}
												</TableCell>
												<TableCell className='tabular-nums font-medium text-sm'>
													{row.record?.total_hours
														? `${row.record.total_hours}h`
														: "–"}
												</TableCell>
												<TableCell className='max-w-[200px] text-sm text-muted-foreground'>
													<div className='truncate'>
														{row.record?.notes || "–"}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
