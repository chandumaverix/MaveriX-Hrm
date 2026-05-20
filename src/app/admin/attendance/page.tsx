"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { useUser } from "@/contexts/user-context";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Calendar,
	Clock,
	Search,
	UserCheck,
	UserX,
	Timer,
	Coffee,
	CalendarOff,
	Zap,
	Loader2,
	ChevronLeft,
	ChevronRight,
	TrendingUp,
	Users,
	LogOut,
	DownloadIcon,
} from "lucide-react";
import type { Attendance, Employee } from "@/lib/types";
import { applyLatePolicyForAllEmployees } from "./actions";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface AttendanceWithEmployee extends Attendance {
	employee?: Employee;
}

/** Local date as YYYY-MM-DD (avoids UTC shift for "today" and time checks). */
function toLocalDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
		2,
		"0",
	)}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AttendancePage() {
	const { employee } = useUser();
	const { settings, isLoading: settingsLoading } = useSettings();
	const [attendanceRecords, setAttendanceRecords] = useState<
		AttendanceWithEmployee[]
	>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
	const [selectedDate, setSelectedDate] = useState(() =>
		toLocalDateStr(new Date()),
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [isLoading, setIsLoading] = useState(true);
	const [applyingPolicy, setApplyingPolicy] = useState(false);
	const dateInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (settingsLoading || !settings) return;
		let cancelled = false;
		(async () => {
			try {
				setIsLoading(true);
				await fetchEmployees();
				if (cancelled) return;
				await fetchApprovedLeaves();
				if (cancelled) return;
				await fetchAttendance();
				if (cancelled) return;
			} catch (e) {
				console.error(e);
				toast.error(
					e instanceof Error
						? e.message
						: "Failed to load attendance data",
				);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [selectedDate, settings, settingsLoading]);

	const fetchAttendance = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("attendance")
			.select("*, employee:employees(*)")
			.eq("date", selectedDate)
			.order("clock_in", { ascending: true });

		const records = (data as unknown as AttendanceWithEmployee[]) || [];
		setAttendanceRecords(records);
	};

	const fetchEmployees = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select("*")
			.eq("is_active", true)
			.neq("role", "admin");
		setEmployees(data || []);
	};

	const fetchApprovedLeaves = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("leave_requests")
			.select("*, employee:employees!leave_requests_employee_id_fkey(*)")
			.eq("status", "approved")
			.lte("start_date", selectedDate)
			.gte("end_date", selectedDate);
		setApprovedLeaves(data || []);
	};

	const handleClockOut = async (attendanceId: string) => {
		const supabase = createClient();
		const now = new Date();
		const record = attendanceRecords.find((r) => r.id === attendanceId);
		if (!record?.clock_in) return;

		const clockIn = new Date(record.clock_in);
		const totalHours = (
			(now.getTime() - clockIn.getTime()) /
			(1000 * 60 * 60)
		).toFixed(2);

		await supabase
			.from("attendance")
			.update({
				clock_out: now.toISOString(),
				total_hours: parseFloat(totalHours),
			})
			.eq("id", attendanceId);

		await fetchAttendance();
	};

	const handleApplyLatePolicy = async () => {
		setApplyingPolicy(true);
		try {
			const now = new Date();
			const year = now.getFullYear();
			const month = now.getMonth() + 1;
			const result = await applyLatePolicyForAllEmployees(year, month);
			if (result.success) {
				toast.success(result.message);
			} else {
				toast.error(result.message);
			}
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to apply policy",
			);
		} finally {
			setApplyingPolicy(false);
		}
	};

	const goToPreviousDay = () => {
		const currentDate = new Date(selectedDate);
		currentDate.setDate(currentDate.getDate() - 1);
		setSelectedDate(toLocalDateStr(currentDate));
	};

	const goToNextDay = () => {
		const currentDate = new Date(selectedDate);
		const today = toLocalDateStr(new Date());
		currentDate.setDate(currentDate.getDate() + 1);
		const newDate = toLocalDateStr(currentDate);
		if (newDate <= today) {
			setSelectedDate(newDate);
		}
	};

	const openDatePicker = () => {
		if (!dateInputRef.current) return;
		// showPicker is supported in modern browsers; fallback focuses input.
		if (typeof dateInputRef.current.showPicker === "function") {
			dateInputRef.current.showPicker();
			return;
		}
		dateInputRef.current.focus();
	};

	// Selected date day-of-week
	const selectedDayOfWeek = new Date(selectedDate).getDay();
	const isEmployeeWeekOff = (emp: Employee) =>
		emp.week_off_day != null && emp.week_off_day === selectedDayOfWeek;

	// Check if employee has approved leave on selected date
	const getEmployeeLeave = (empId: string) => {
		return approvedLeaves.find((leave) => leave.employee_id === empId);
	};

	type RowRecord = AttendanceWithEmployee & { _synthetic?: boolean };
	const allEmployeeRows: RowRecord[] = employees
		.map((emp) => {
			const existing = attendanceRecords.find(
				(r) => r.employee_id === emp.id,
			);
			if (existing) {
				return { ...existing, employee: emp, _synthetic: false };
			}

			// Check for approved leave
			const leaveRecord = getEmployeeLeave(emp.id);
			if (leaveRecord) {
				return {
					id: `leave-${emp.id}`,
					employee_id: emp.id,
					date: selectedDate,
					clock_in: null,
					clock_out: null,
					total_hours: null,
					status: "leave" as const,
					notes: leaveRecord.reason || null,
					created_at: "",
					updated_at: "",
					employee: emp,
					_synthetic: true,
					_leaveType: leaveRecord.leave_type?.name || null,
				} as any;
			}

			if (isEmployeeWeekOff(emp)) {
				return {
					id: `wo-${emp.id}`,
					employee_id: emp.id,
					date: selectedDate,
					clock_in: null,
					clock_out: null,
					total_hours: null,
					status: "week_off" as const,
					notes: null,
					created_at: "",
					updated_at: "",
					employee: emp,
					_synthetic: true,
				};
			}
			return {
				id: `abs-${emp.id}`,
				employee_id: emp.id,
				date: selectedDate,
				clock_in: null,
				clock_out: null,
				total_hours: null,
				status: "absent" as const,
				notes: null,
				created_at: "",
				updated_at: "",
				employee: emp,
				_synthetic: true,
			};
		})
		.sort((a, b) => {
			if (a.clock_in && b.clock_in) {
				return (
					new Date(a.clock_in).getTime() -
					new Date(b.clock_in).getTime()
				);
			}
			if (a.clock_in) return -1;
			if (b.clock_in) return 1;
			return 0;
		});

	const stats = {
		present: allEmployeeRows.filter((r) => r.status === "present").length,
		absent: allEmployeeRows.filter((r) => r.status === "absent").length,
		late: allEmployeeRows.filter((r) => r.status === "late").length,
		onLeave: allEmployeeRows.filter((r) => r.status === "leave").length,
		weekOff: allEmployeeRows.filter((r) => r.status === "week_off").length,
		wfh: allEmployeeRows.filter((r) => r.is_wfh).length,
	};

	const total = allEmployeeRows.length;
	const presentRate =
		total > 0
			? Math.round(((stats.present + stats.late) / total) * 100)
			: 0;

	const filteredRecords: RowRecord[] = allEmployeeRows.filter((record) => {
		const matchesSearch =
			record.employee?.first_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			record.employee?.last_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase());
		const matchesStatus =
			statusFilter === "all" ||
			(statusFilter === "wfh" ? !!record.is_wfh : record.status === statusFilter);
		return matchesSearch && matchesStatus;
	});

	const dateDisplay = new Date(selectedDate + "T12:00:00").toLocaleDateString(
		"en-US",
		{
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		},
	);

	const today = toLocalDateStr(new Date());
	const isToday = selectedDate === today;

	const formatTime = (timeString: string | null) => {
		if (!timeString) return null;
		return new Date(timeString).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const STATUS_CONFIG = {
		present: {
			label: "Present",
			pill: "bg-emerald-50 text-emerald-700 border border-emerald-200",
			dot: "bg-emerald-500",
			row: "border-l-4 border-l-emerald-400",
		},
		absent: {
			label: "Absent",
			pill: "bg-red-50 text-red-700 border border-red-200",
			dot: "bg-red-500",
			row: "border-l-4 border-l-red-400",
		},
		late: {
			label: "Late",
			pill: "bg-amber-50 text-amber-700 border border-amber-200",
			dot: "bg-amber-500",
			row: "border-l-4 border-l-amber-400",
		},
		leave: {
			label: "On Leave",
			pill: "bg-violet-50 text-violet-700 border border-violet-200",
			dot: "bg-violet-500",
			row: "border-l-4 border-l-violet-400",
		},
		week_off: {
			label: "Week Off",
			pill: "bg-slate-100 text-slate-600 border border-slate-200",
			dot: "bg-slate-400",
			row: "border-l-4 border-l-slate-300",
		},
	} as const;

	type StatusKey = keyof typeof STATUS_CONFIG;

	const getStatusConfig = (status: string) =>
		STATUS_CONFIG[status as StatusKey] ?? {
			label: status,
			pill: "bg-slate-100 text-slate-700 border border-slate-200",
			dot: "bg-slate-400",
			row: "border-l-4 border-l-slate-300",
		};

	if (settingsLoading || !settings) {
		return (
			<div className='flex min-h-screen items-center justify-center'>
				<div className='flex flex-col items-center gap-3'>
					<Loader2 className='h-10 w-10 animate-spin text-primary' />
					<p className='text-sm text-muted-foreground'>
						Loading settings…
					</p>
				</div>
			</div>
		);
	}

	const FILTER_TABS = [
		{ value: "all", label: "All", count: total },
		{
			value: "present",
			label: "Present",
			count: stats.present,
			color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40",
		},
		{
			value: "wfh",
			label: "WFH",
			count: stats.wfh,
			color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40",
		},
		{
			value: "late",
			label: "Late",
			count: stats.late,
			color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40",
		},
		{
			value: "absent",
			label: "Absent",
			count: stats.absent,
			color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40",
		},
		{
			value: "leave",
			label: "On Leave",
			count: stats.onLeave,
			color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/40",
		},
		{
			value: "week_off",
			label: "Week Off",
			count: stats.weekOff,
			color: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40",
		},
	];

	return (
		<div className='flex flex-col min-h-screen bg-transparent text-slate-800 dark:text-slate-200'>
			<DashboardHeader
				title='Attendance Management'
				description='Track and manage employee attendance records'
			/>

			<div className='flex-1 p-4 md:p-6 pb-20 md:pb-8 space-y-5'>
				{/* ── Quick Access Button ── */}
				<div className='flex justify-end'>
					<Link
						href={
							employee?.role === "hr"
								? "/hr/attendance/records"
								: "/admin/attendance/records"
						}
						className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.01)] active:scale-[0.98]'>
						<DownloadIcon className='h-3.5 w-3.5' />
						Download Report
					</Link>
				</div>

				{/* ── Date Navigator ── */}
				<div className='flex items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] border border-slate-100 dark:border-slate-800/40'>
					<button
						onClick={goToPreviousDay}
						className='h-9 w-9 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 shrink-0 cursor-pointer text-slate-600 dark:text-slate-400 active:scale-95'>
						<ChevronLeft className='h-4 w-4' />
					</button>

					<div className='flex flex-col items-center gap-0.5 flex-1 min-w-0'>
						<div className='flex items-center gap-2'>
							<button
								type='button'
								onClick={openDatePicker}
								className='h-7 w-7 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 shrink-0 flex items-center justify-center'
								title='Pick a date'>
								<Calendar className='h-4 w-4 text-primary shrink-0' />
							</button>
							<h2 className='text-base sm:text-lg font-semibold tracking-tight text-foreground text-center truncate'>
								{dateDisplay}
							</h2>
						</div>
						<div className='mt-1'>
							<Input
								ref={dateInputRef}
								type='date'
								value={selectedDate}
								max={today}
								onChange={(e) =>
									setSelectedDate(e.target.value)
								}
								className='h-8 w-[170px] text-xs bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 focus:border-primary/50 focus:ring-primary/20'
							/>
						</div>
						{isToday && (
							<span className='inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2.5 py-0.5 mt-0.5'>
								<span className='h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block' />
								Today
							</span>
						)}
					</div>

					<button
						onClick={goToNextDay}
						disabled={isToday}
						className='h-9 w-9 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-600 dark:text-slate-400 active:scale-95'>
						<ChevronRight className='h-4 w-4' />
					</button>
				</div>

				{/* ── Stat Cards ── */}
				<div className='grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'>
					{/* Present */}
					<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-md transition-all duration-200 flex flex-col gap-3 group'>
						<div className='flex items-center justify-between'>
							<span className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
								Present
							</span>
							<div className='w-8 h-8 rounded-lg flex items-center justify-center border border-emerald-100 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform'>
								<UserCheck className='h-4 w-4' />
							</div>
						</div>
						<div>
							<p className='text-3xl font-black text-slate-800 dark:text-white leading-none tabular-nums'>
								{stats.present}
							</p>
							<div className='mt-3 h-1 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden'>
								<div
									className='h-full bg-emerald-500 rounded-full transition-all duration-700'
									style={{
										width: `${total > 0 ? (stats.present / total) * 100 : 0}%`,
									}}
								/>
							</div>
						</div>
					</div>

					{/* Absent */}
					<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-md transition-all duration-200 flex flex-col gap-3 group'>
						<div className='flex items-center justify-between'>
							<span className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
								Absent
							</span>
							<div className='w-8 h-8 rounded-lg flex items-center justify-center border border-rose-100 dark:border-rose-800/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform'>
								<UserX className='h-4 w-4' />
							</div>
						</div>
						<div>
							<p className='text-3xl font-black text-slate-800 dark:text-white leading-none tabular-nums'>
								{stats.absent}
							</p>
							<div className='mt-3 h-1 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden'>
								<div
									className='h-full bg-rose-500 rounded-full transition-all duration-700'
									style={{
										width: `${total > 0 ? (stats.absent / total) * 100 : 0}%`,
									}}
								/>
							</div>
						</div>
					</div>

					{/* Late */}
					<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-md transition-all duration-200 flex flex-col gap-3 group'>
						<div className='flex items-center justify-between'>
							<span className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
								Late
							</span>
							<div className='w-8 h-8 rounded-lg flex items-center justify-center border border-amber-100 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform'>
								<Timer className='h-4 w-4' />
							</div>
						</div>
						<div>
							<p className='text-3xl font-black text-slate-800 dark:text-white leading-none tabular-nums'>
								{stats.late}
							</p>
							<div className='mt-3 h-1 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden'>
								<div
									className='h-full bg-amber-500 rounded-full transition-all duration-700'
									style={{
										width: `${total > 0 ? (stats.late / total) * 100 : 0}%`,
									}}
								/>
							</div>
						</div>
					</div>

					{/* Week Off */}
					<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-md transition-all duration-200 flex flex-col gap-3 group'>
						<div className='flex items-center justify-between'>
							<span className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
								Week Off
							</span>
							<div className='w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800/30 bg-slate-50 dark:bg-slate-900 text-slate-500 group-hover:scale-110 transition-transform'>
								<CalendarOff className='h-4 w-4' />
							</div>
						</div>
						<div>
							<p className='text-3xl font-black text-slate-800 dark:text-white leading-none tabular-nums'>
								{stats.weekOff}
							</p>
							<div className='mt-3 h-1 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden'>
								<div
									className='h-full bg-slate-400 rounded-full transition-all duration-700'
									style={{
										width: `${total > 0 ? (stats.weekOff / total) * 100 : 0}%`,
									}}
								/>
							</div>
						</div>
					</div>

					{/* On Leave */}
					<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-md transition-all duration-200 flex flex-col gap-3 group col-span-2 sm:col-span-1'>
						<div className='flex items-center justify-between'>
							<span className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
								On Leave
							</span>
							<div className='w-8 h-8 rounded-lg flex items-center justify-center border border-violet-100 dark:border-violet-800/30 bg-violet-50/50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform'>
								<Coffee className='h-4 w-4' />
							</div>
						</div>
						<div>
							<p className='text-3xl font-black text-slate-800 dark:text-white leading-none tabular-nums'>
								{stats.onLeave}
							</p>
							<div className='mt-3 h-1 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden'>
								<div
									className='h-full bg-violet-500 rounded-full transition-all duration-700'
									style={{
										width: `${total > 0 ? (stats.onLeave / total) * 100 : 0}%`,
									}}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* ── Summary Banner ── */}
				<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] px-5 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-5'>
					{/* Rate pill */}
					<div className='flex items-center gap-3 flex-1 min-w-0'>
						<div className='w-10 h-10 rounded-xl flex items-center justify-center border border-primary/10 bg-primary/5 text-primary shrink-0'>
							<TrendingUp className='h-4 w-4' />
						</div>
						<div className='min-w-0'>
							<p className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
								Attendance Rate
							</p>
							<div className='flex items-end gap-2 mt-0.5'>
								<span className='text-3xl font-black text-slate-800 dark:text-white leading-none'>
									{presentRate}%
								</span>
								<span className='text-xs text-muted-foreground mb-0.5'>
									({stats.present + stats.late} / {total}{" "}
									employees)
								</span>
							</div>
							{/* Track bar */}
							<div className='mt-2.5 h-1 w-48 max-w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden'>
								<div
									className='h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-700'
									style={{ width: `${presentRate}%` }}
								/>
							</div>
						</div>
					</div>

					<div className='flex items-center gap-2 shrink-0'>
						<div className='w-10 h-10 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500'>
							<Users className='h-4 w-4' />
						</div>
						<div>
							<p className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
								Total Employees
							</p>
							<p className='text-xl font-bold text-slate-800 dark:text-white leading-none mt-0.5'>
								{total}
							</p>
						</div>
					</div>

					{/* Apply Late Policy */}
					<Button
						onClick={handleApplyLatePolicy}
						disabled={applyingPolicy}
						className='gap-2 rounded-xl h-10 px-4 text-xs font-bold bg-primary text-white hover:bg-primary/95 shrink-0 shadow-sm transition-all active:scale-[0.98]'>
						{applyingPolicy ? (
							<Loader2 className='h-4 w-4 animate-spin' />
						) : (
							<Zap className='h-4 w-4' />
						)}
						{applyingPolicy ? "Applying…" : "Apply Late Policy"}
					</Button>
				</div>

				{/* ── Filters ── */}
				<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] px-5 py-4 space-y-4'>
					{/* Search */}
					<div className='relative max-w-sm'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
						<Input
							placeholder='Search employees…'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='pl-9 rounded-xl h-10 bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 focus:border-primary/50 focus:ring-primary/20 text-slate-800 dark:text-slate-200'
						/>
					</div>

					{/* Status pills */}
					<div className='flex flex-wrap gap-2'>
						{FILTER_TABS.map((tab) => (
							<button
								key={tab.value}
								onClick={() => setStatusFilter(tab.value)}
								className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border ${
									statusFilter === tab.value
										? tab.value === "all"
											? "bg-primary text-white border-primary shadow-sm"
											: `${tab.color} shadow-sm`
										: "bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
								}`}>
								{tab.label}
								<span
									className={`inline-flex items-center justify-center h-4.5 min-w-[1.25rem] text-[10px] font-black rounded-full px-1.5 ${
										statusFilter === tab.value &&
										tab.value === "all"
											? "bg-white/20 text-white"
											: "bg-background/80 text-foreground"
									}`}>
									{tab.count}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* ── Attendance Records ── */}
				<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden'>
					{/* Card header */}
					<div className='flex items-center justify-between px-6 py-5 border-b border-slate-50 dark:border-slate-800/40'>
						<div className='flex items-center gap-2.5'>
							<div className='w-8 h-8 rounded-lg flex items-center justify-center border border-primary/10 bg-primary/5 text-primary'>
								<Clock className='h-4 w-4' />
							</div>
							<div>
								<h3 className='text-sm font-bold text-slate-800 dark:text-white'>
									Attendance Records
								</h3>
								<p className='text-xs text-muted-foreground'>
									{filteredRecords.length} employee
									{filteredRecords.length !== 1
										? "s"
										: ""}{" "}
									shown
								</p>
							</div>
						</div>
					</div>

					{/* Body */}
					{isLoading ? (
						<div className='py-20 flex flex-col items-center gap-3 text-muted-foreground'>
							<div className='h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin' />
							<p className='text-sm'>Loading attendance data…</p>
						</div>
					) : filteredRecords.length === 0 ? (
						<div className='py-20 flex flex-col items-center gap-3 text-muted-foreground'>
							<div className='h-16 w-16 rounded-2xl bg-muted flex items-center justify-center'>
								<Calendar className='h-8 w-8 opacity-40' />
							</div>
							<p className='text-sm'>
								No employees match the current filters
							</p>
						</div>
					) : (
						<>
							{/* Desktop table */}
							<div className='w-full overflow-x-auto'>
								<table className='w-full text-sm'>
									<thead>
										<tr className='bg-slate-50/30 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/40'>
											<th className='text-left text-[10px] font-black uppercase tracking-wider text-slate-400 px-6 py-3.5'>
												Employee
											</th>
											<th className='text-left text-[10px] font-black uppercase tracking-wider text-slate-400 px-4 py-3.5'>
												Status
											</th>
											<th className='text-left text-[10px] font-black uppercase tracking-wider text-slate-400 px-4 py-3.5'>
												Clock In
											</th>
											<th className='text-left text-[10px] font-black uppercase tracking-wider text-slate-400 px-4 py-3.5'>
												Clock Out
											</th>
											<th className='text-left text-[10px] font-black uppercase tracking-wider text-slate-400 px-4 py-3.5'>
												Hours
											</th>
											<th className='text-left text-[10px] font-black uppercase tracking-wider text-slate-400 px-4 py-3.5'>
												Actions
											</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-slate-100 dark:divide-slate-800/40'>
										{filteredRecords.map((record) => {
											const cfg = getStatusConfig(
												record.status,
											);
											const clockIn = formatTime(
												record.clock_in,
											);
											const clockOut = formatTime(
												record.clock_out,
											);
											return (
												<tr
													key={record.id}
													className={`${cfg.row} hover:bg-muted/30 transition-colors group`}>
													{/* Employee */}
													<td className='px-6 py-3.5'>
														<div className='flex items-center gap-3'>
															<Avatar className='h-9 w-9 shrink-0'>
																{record.employee
																	?.avatar_url && (
																	<AvatarImage
																		height={
																			36
																		}
																		width={
																			36
																		}
																		className='object-cover'
																		src={
																			record
																				.employee
																				.avatar_url
																		}
																		alt='Profile'
																	/>
																)}
																<AvatarFallback className='text-xs font-semibold bg-primary/10 text-primary'>
																	{
																		record
																			.employee
																			?.first_name?.[0]
																	}
																	{
																		record
																			.employee
																			?.last_name?.[0]
																	}
																</AvatarFallback>
															</Avatar>
															<div>
																<p className='font-semibold text-foreground text-sm leading-tight'>
																	{
																		record
																			.employee
																			?.first_name
																	}{" "}
																	{
																		record
																			.employee
																			?.last_name
																	}
																</p>
																{record.employee
																	?.designation && (
																	<p className='text-xs text-muted-foreground truncate max-w-[160px]'>
																		{
																			record
																				.employee
																				.designation
																		}
																	</p>
																)}
															</div>
														</div>
													</td>

													{/* Status */}
													<td className='px-4 py-3.5'>
														<div className="flex flex-wrap items-center gap-1.5">
															<span
																className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.pill}`}>
																<span
																	className={`h-1.5 w-1.5 rounded-full ${cfg.dot} inline-block`}
																/>
																{cfg.label}
															</span>
															{record.is_wfh && (
																<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
																	WFH
																</span>
															)}
														</div>
													</td>

													{/* Clock In */}
													<td className='px-4 py-3.5'>
														{clockIn ? (
															<span className='inline-flex items-center gap-1 text-sm font-mono font-medium text-foreground'>
																<Clock className='h-3 w-3 text-muted-foreground' />
																{clockIn}
															</span>
														) : (
															<span className='text-muted-foreground text-sm'>
																—
															</span>
														)}
													</td>

													{/* Clock Out */}
													<td className='px-4 py-3.5'>
														{clockOut ? (
															<span className='inline-flex items-center gap-1 text-sm font-mono font-medium text-foreground'>
																<LogOut className='h-3 w-3 text-muted-foreground' />
																{clockOut}
															</span>
														) : record.clock_in &&
														  !record.clock_out ? (
															<span className='inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5'>
																<span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block' />
																Active
															</span>
														) : (
															<span className='text-muted-foreground text-sm'>
																—
															</span>
														)}
													</td>

													{/* Hours */}
													<td className='px-4 py-3.5'>
														{record.total_hours ? (
															<span className='font-semibold text-foreground tabular-nums'>
																{
																	record.total_hours
																}
																<span className='text-muted-foreground font-normal text-xs ml-0.5'>
																	h
																</span>
															</span>
														) : (
															<span className='text-muted-foreground text-sm'>
																—
															</span>
														)}
													</td>

													{/* Actions */}
													<td className='px-4 py-3.5'>
														<div className='flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity'>
															{!record._synthetic &&
																record.clock_in &&
																!record.clock_out && (
																	<button
																		onClick={() =>
																			handleClockOut(
																				record.id,
																			)
																		}
																		className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer'>
																		<LogOut className='h-3 w-3' />
																		Clock
																		Out
																	</button>
																)}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
