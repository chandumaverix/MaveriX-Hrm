"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
				<div className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 text-[10px] font-black uppercase tracking-wider border border-emerald-100/50 dark:border-emerald-900/30 shadow-[0_2px_8px_rgba(16,185,129,0.02)]'>
					<CheckCircle2 className='h-3 w-3' />
					Present
				</div>
			);
		case "late":
			return (
				<div className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-100/50 dark:border-amber-900/30 shadow-[0_2px_8px_rgba(245,158,11,0.02)]'>
					<Clock className='h-3 w-3' />
					Late
				</div>
			);
		case "absent":
			return (
				<div className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-455 text-[10px] font-black uppercase tracking-wider border border-rose-100/50 dark:border-rose-900/30 shadow-[0_2px_8px_rgba(244,63,94,0.02)]'>
					<XCircle className='h-3 w-3' />
					Absent
				</div>
			);
		case "leave":
			return (
				<div className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450 text-[10px] font-black uppercase tracking-wider border border-blue-100/50 dark:border-blue-900/30 shadow-[0_2px_8px_rgba(37,99,235,0.02)]'>
					<Coffee className='h-3 w-3' />
					On Leave
				</div>
			);
		case "week_off":
			return (
				<div className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border border-slate-200/50 dark:border-slate-700/50 shadow-[0_2px_8px_rgba(100,116,139,0.02)]'>
					<CalendarDays className='h-3 w-3' />
					Week Off
				</div>
			);
		default:
			return <Badge variant='outline' className="text-[10px] font-black uppercase tracking-wider">{status}</Badge>;
	}
}

function formatTime(s: string | null) {
	if (!s) return "–";
	return new Date(s).toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export default function EmployeeAttendancePage() {
	const { employee } = useUser();
	const [records, setRecords] = useState<Attendance[]>([]);
	const [selectedDate, setSelectedDate] = useState(
		new Date().toISOString().slice(0, 10)
	);
	const selectedMonth = selectedDate.slice(0, 7);
	const [isLoading, setIsLoading] = useState(true);
	const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
	const dateInputRef = useRef<HTMLInputElement>(null);

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

		const { data: leaves } = await supabase
			.from("leave_requests")
			.select("*")
			.eq("employee_id", employee.id)
			.eq("status", "approved")
			.gte("end_date", start)
			.lte("start_date", end);

		setRecords(data || []);
		setApprovedLeaves(leaves || []);
		setIsLoading(false);
	};

	// Helper functions for month navigation
	const goToPreviousMonth = () => {
		const [year, month] = selectedMonth.split("-").map(Number);
		const prevDate = new Date(year, month - 2, 1);
		const newMonth = `${prevDate.getFullYear()}-${String(
			prevDate.getMonth() + 1
		).padStart(2, "0")}`;
		setSelectedDate(`${newMonth}-01`);
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
			setSelectedDate(`${newMonth}-01`);
		}
	};

	const openDatePicker = () => {
		const input = dateInputRef.current;
		if (!input) return;

		try {
			if (typeof (input as any).showPicker === 'function') {
				(input as any).showPicker();
			} else {
				input.focus();
			}
		} catch (e) {
			input.focus();
		}
	};

	const goToToday = () => {
		setSelectedDate(new Date().toISOString().slice(0, 10));
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
		const isOnLeave = approvedLeaves.some(
			(leave) => date >= leave.start_date && date <= leave.end_date
		);

		if (weekOffDay != null && dayOfWeek === weekOffDay) {
			return { date, status: "week_off" as DayStatus };
		}
		if (rec) {
			return { date, status: rec.status as DayStatus, record: rec };
		}
		if (isOnLeave) {
			return { date, status: "leave" as DayStatus };
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

	// Format date display
	const dateDisplay = new Date(selectedDate).toLocaleDateString(
		"en-US",
		{
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		}
	);

	// Check if next button should be disabled
	const currentMonth = new Date().toISOString().slice(0, 7);
	const isCurrentMonth = selectedMonth === currentMonth;

	return (
		<div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
			<DashboardHeader
				title='My Attendance'
				description='Track your attendance history'
			/>

			<div className='flex-1 space-y-6 p-4 md:p-6 pb-20 md:pb-6'>
				{/* Month Navigation */}
				<Card className="border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
					<CardContent className='p-5'>
						<div className='flex items-center justify-between gap-4'>
							<Button
								variant='outline'
								size='icon'
								onClick={goToPreviousMonth}
								className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
								<ChevronLeft className='h-4.5 w-4.5' />
							</Button>
							<div className='flex flex-col items-center gap-2 flex-1 justify-center min-w-0'>
								<div className='flex items-center gap-3'>
									<button
										type='button'
										onClick={openDatePicker}
										className="h-9 w-9 rounded-xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.05)] hover:opacity-90 transition-opacity shrink-0"
										title='Pick a date'>
										<Calendar className='h-4.5 w-4.5' />
									</button>
									<h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-850 dark:text-white truncate">
										{dateDisplay}
									</h2>
								</div>
								
								<div className='mt-1'>
									<Input
										ref={dateInputRef}
										type='date'
										value={selectedDate}
										max={today}
										onChange={(e) => {
											if (e.target.value) {
												setSelectedDate(e.target.value);
											}
										}}
										className="h-8 w-[170px] text-xs rounded-lg border-slate-205 dark:border-slate-800"
									/>
								</div>
								
								{selectedDate !== today && (
									<button
										onClick={goToToday}
										className='mt-1.5 text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors flex items-center gap-1 bg-blue-50/80 dark:bg-blue-950/20 px-2 py-0.5 rounded-full border border-blue-100/40 dark:border-blue-900/20 shadow-[0_2px_8px_rgba(37,99,235,0.02)]'>
										<div className='h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse' />
										Today
									</button>
								)}
							</div>
							<Button
								variant='outline'
								size='icon'
								onClick={goToNextMonth}
								disabled={isCurrentMonth}
								className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors disabled:opacity-50">
								<ChevronRight className='h-4.5 w-4.5' />
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Stats Cards */}
				<div className='grid gap-4 grid-cols-2 md:grid-cols-5'>
					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition-all duration-300 group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500'>Present</p>
								<p className='text-2xl font-black mt-2 tabular-nums text-emerald-600 dark:text-emerald-450 leading-none'>{stats.present}</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-[0_2px_8px_rgba(16,185,129,0.05)] group-hover:scale-105 transition-transform'><CheckCircle2 className='h-4.5 w-4.5' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition-all duration-300 group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500'>Late</p>
								<p className='text-2xl font-black mt-2 tabular-nums text-amber-600 dark:text-amber-450 leading-none'>{stats.late}</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shadow-[0_2px_8px_rgba(245,158,11,0.05)] group-hover:scale-105 transition-transform'><Clock className='h-4.5 w-4.5' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition-all duration-300 group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500'>Absent</p>
								<p className='text-2xl font-black mt-2 tabular-nums text-rose-600 dark:text-rose-450 leading-none'>{stats.absent}</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 text-rose-550 dark:text-rose-400 flex items-center justify-center shadow-[0_2px_8px_rgba(244,63,94,0.05)] group-hover:scale-105 transition-transform'><XCircle className='h-4.5 w-4.5' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition-all duration-300 group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550'>Week Off</p>
								<p className='text-2xl font-black mt-2 tabular-nums text-slate-600 dark:text-slate-400 leading-none'>{stats.weekOff}</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900/30 text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-[0_2px_8px_rgba(100,116,139,0.05)] group-hover:scale-105 transition-transform'><CalendarDays className='h-4.5 w-4.5' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition-all duration-300 group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550'>On Leave</p>
								<p className='text-2xl font-black mt-2 tabular-nums text-blue-600 dark:text-blue-450 leading-none'>{stats.leave}</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.05)] group-hover:scale-105 transition-transform'><Coffee className='h-4.5 w-4.5' /></div>
						</div>
					</div>
				</div>

				{/* Attendance History Table */}
				<Card className="border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden">
					<CardHeader className='pb-4 border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/10'>
						<div className='flex items-center gap-3'>
							<div className='h-10 w-10 rounded-xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-450 flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.05)] animate-pulse'>
								<TrendingUp className='h-5 w-5' />
							</div>
							<div>
								<CardTitle className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white">
									Attendance Records
								</CardTitle>
								<p className='text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5'>
									Detailed view of all attendance entries for the selected month
								</p>
							</div>
						</div>
					</CardHeader>
					<CardContent className='px-0 pb-0'>
						{isLoading ? (
							<div className='py-16 text-center'>
								<div className='inline-flex items-center gap-3 text-slate-400 dark:text-slate-650'>
									<div className='h-5 w-5 animate-spin rounded-full border-2 border-slate-350 border-t-blue-500' />
									<span className='text-xs font-bold uppercase tracking-wider'>Loading attendance data...</span>
								</div>
							</div>
						) : days.length === 0 ? (
							<div className='py-16 text-center text-slate-400 dark:text-slate-600'>
								<div className='h-16 w-16 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-850/50 flex items-center justify-center mx-auto mb-4'>
									<Calendar className='h-8 w-8 text-slate-350 dark:text-slate-700' />
								</div>
								<p className='text-xs font-bold uppercase tracking-wider'>No attendance records for this month</p>
							</div>
						) : (
							<div className='overflow-x-auto'>
								<Table className='w-full'>
									<TableHeader>
										<TableRow className='hover:bg-transparent border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/20'>
											<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Date</TableHead>
											<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Status</TableHead>
											<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Clock In</TableHead>
											<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Clock Out</TableHead>
											<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Hours</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{days.map((row) => {
											const isSelected = row.date === selectedDate;
											return (
												<TableRow
													key={row.date}
													className={`transition-colors border-b border-slate-100 dark:border-slate-800/40 ${
														isSelected
															? "bg-blue-50/30 dark:bg-blue-900/10 border-l-2 border-l-blue-500"
															: "hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-l-2 border-l-transparent"
													}`}>
													<TableCell className='font-medium'>
													<div className='flex flex-col'>
														<span className="text-xs text-slate-750 dark:text-slate-250 font-bold">
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
														<span className='text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5'>
															{new Date(
																row.date + "T12:00:00"
															).getFullYear()}
														</span>
													</div>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-1.5">
														{getStatusBadge(row.status)}
														{row.record?.is_wfh && (
															<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border border-sky-100/50 dark:border-sky-900/30 shadow-[0_2px_8px_rgba(14,165,233,0.02)]">
																WFH
															</span>
														)}
													</div>
												</TableCell>
												<TableCell className='text-slate-500 dark:text-slate-400 tabular-nums text-xs font-semibold'>
													{row.record
														? formatTime(
															row.record
																.clock_in
														)
														: "–"}
												</TableCell>
												<TableCell className='text-slate-500 dark:text-slate-400 tabular-nums text-xs font-semibold'>
													{row.record
														? formatTime(
															row.record
																.clock_out
														)
														: "–"}
												</TableCell>
												<TableCell className='tabular-nums font-bold text-xs text-slate-750 dark:text-slate-250'>
													{row.record?.total_hours
														? `${row.record.total_hours}h`
														: "–"}
												</TableCell>
											</TableRow>
											);
										})}
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
