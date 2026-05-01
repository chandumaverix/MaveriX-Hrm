"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { useUser } from "@/contexts/user-context";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
	Download,
	TrendingUp,
	Users,
	LogOut,
	CalendarDays,
	DownloadIcon,
} from "lucide-react";
import { useMemo } from "react";
import type { Attendance, Employee } from "@/lib/types";
import { applyLatePolicyForAllEmployees } from "./actions";
import { toast } from "react-hot-toast";

interface AttendanceWithEmployee extends Attendance {
	employee?: Employee;
}

/** Local date as YYYY-MM-DD (avoids UTC shift for "today" and time checks). */
function toLocalDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
		2,
		"0"
	)}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AttendancePage() {
	const { employee } = useUser();
	const { settings, isLoading: settingsLoading } = useSettings();
	const attendanceRecordsPath = employee?.role === 'hr' ? '/hr/attendance/records' : '/admin/attendance/records';
	const [attendanceRecords, setAttendanceRecords] = useState<
		AttendanceWithEmployee[]
	>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
	const [selectedDate, setSelectedDate] = useState(() =>
		toLocalDateStr(new Date())
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [isLoading, setIsLoading] = useState(true);
	const [applyingPolicy, setApplyingPolicy] = useState(false);

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
					e instanceof Error ? e.message : "Failed to load attendance data"
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
				err instanceof Error ? err.message : "Failed to apply policy"
			);
		} finally {
			setApplyingPolicy(false);
		}
	};

	const handleDownloadAttendance = async (employeeId: string) => {
		try {
			const response = await fetch(
				`/api/attendance/export?employeeId=${employeeId}`
			);

			if (!response.ok) {
				const error = await response.json();
				toast.error(error.error || "Failed to download attendance");
				return;
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = response.headers
				.get("Content-Disposition")
				?.split('filename="')[1]
				.replace(/"/g, "") || "attendance.csv";
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
			toast.success("Attendance downloaded successfully");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to download attendance"
			);
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

	// Selected date day-of-week
	const selectedDayOfWeek = new Date(selectedDate).getDay();
	const isEmployeeWeekOff = (emp: Employee) =>
		emp.week_off_day != null && emp.week_off_day === selectedDayOfWeek;

	// Check if employee has approved leave on selected date
	const getEmployeeLeave = (empId: string) => {
		return approvedLeaves.find((leave) => leave.employee_id === empId);
	};

	type RowRecord = AttendanceWithEmployee & { _synthetic?: boolean };
	const allEmployeeRows: RowRecord[] = employees.map((emp) => {
		const existing = attendanceRecords.find(
			(r) => r.employee_id === emp.id
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
	}).sort((a, b) => {
		if (a.clock_in && b.clock_in) {
			return new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime();
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
	};

	const total = allEmployeeRows.length;
	const presentRate = total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 0;

	const filteredRecords: RowRecord[] = allEmployeeRows.filter((record) => {
		const matchesSearch =
			record.employee?.first_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			record.employee?.last_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase());
		const matchesStatus =
			statusFilter === "all" || record.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	const dateDisplay = new Date(selectedDate + "T12:00:00").toLocaleDateString(
		"en-US",
		{
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		}
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
					<p className='text-sm text-muted-foreground'>Loading settings…</p>
				</div>
			</div>
		);
	}

	const FILTER_TABS = [
		{ value: "all", label: "All", count: total },
		{ value: "present", label: "Present", count: stats.present, color: "text-emerald-600 bg-emerald-50 border border-emerald-200" },
		{ value: "late", label: "Late", count: stats.late, color: "text-amber-600 bg-amber-50 border border-amber-200" },
		{ value: "absent", label: "Absent", count: stats.absent, color: "text-red-600 bg-red-50 border border-red-200" },
		{ value: "leave", label: "On Leave", count: stats.onLeave, color: "text-violet-600 bg-violet-50 border border-violet-200" },
		{ value: "week_off", label: "Week Off", count: stats.weekOff, color: "text-slate-600 bg-slate-100 border border-slate-200" },
	];

	return (
		<div className='flex flex-col min-h-screen bg-background'>
			<DashboardHeader
				title='Attendance Management'
				description='Track and manage employee attendance records'
			/>

			<div className='flex-1 p-4 md:p-6 pb-20 md:pb-8 space-y-5'>
				{/* ── Quick Access Button ── */}
				<div className='flex justify-end'>
					<a
						href={attendanceRecordsPath} target="_blank"
						className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white text-sm font-semibold hover:from-primary/90 hover:to-indigo-600/90 transition-all shadow-md hover:shadow-lg'
					>
						<DownloadIcon className='h-4 w-4' />
						Download Report
					</a>
				</div>

				{/* ── Date Navigator ── */}
				<div className='flex items-center justify-between gap-4 bg-card rounded-2xl px-5 py-4 shadow-sm border border-border/60'>
					<button
						onClick={goToPreviousDay}
						className='h-9 w-9 rounded-xl flex items-center justify-center border border-border bg-background hover:bg-muted transition-colors shrink-0 cursor-pointer'
					>
						<ChevronLeft className='h-4 w-4' />
					</button>

					<div className='flex flex-col items-center gap-0.5 flex-1 min-w-0'>
						<div className='flex items-center gap-2'>
							<Calendar className='h-4 w-4 text-primary shrink-0' />
							<h2 className='text-base sm:text-lg font-semibold tracking-tight text-foreground text-center truncate'>
								{dateDisplay}
							</h2>
						</div>
						{isToday && (
							<span className='inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5 mt-0.5'>
								<span className='h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block' />
								Today
							</span>
						)}
					</div>

					<button
						onClick={goToNextDay}
						disabled={isToday}
						className='h-9 w-9 rounded-xl flex items-center justify-center border border-border bg-background hover:bg-muted transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
					>
						<ChevronRight className='h-4 w-4' />
					</button>
				</div>

				{/* ── Stat Cards ── */}
				<div className='grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'>
					{/* Present */}
					<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow group'>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>Present</span>
							<div className='h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform'>
								<UserCheck className='h-4 w-4 text-emerald-600' />
							</div>
						</div>
						<div>
							<p className='text-4xl font-bold text-emerald-600 leading-none'>{stats.present}</p>
							<div className='mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden'>
								<div
									className='h-full bg-emerald-500 rounded-full transition-all duration-700'
									style={{ width: `${total > 0 ? (stats.present / total) * 100 : 0}%` }}
								/>
							</div>
						</div>
					</div>

					{/* Absent */}
					<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow group'>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>Absent</span>
							<div className='h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform'>
								<UserX className='h-4 w-4 text-red-600' />
							</div>
						</div>
						<div>
							<p className='text-4xl font-bold text-red-600 leading-none'>{stats.absent}</p>
							<div className='mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden'>
								<div
									className='h-full bg-red-500 rounded-full transition-all duration-700'
									style={{ width: `${total > 0 ? (stats.absent / total) * 100 : 0}%` }}
								/>
							</div>
						</div>
					</div>

					{/* Late */}
					<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow group'>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>Late</span>
							<div className='h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform'>
								<Timer className='h-4 w-4 text-amber-600' />
							</div>
						</div>
						<div>
							<p className='text-4xl font-bold text-amber-600 leading-none'>{stats.late}</p>
							<div className='mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden'>
								<div
									className='h-full bg-amber-500 rounded-full transition-all duration-700'
									style={{ width: `${total > 0 ? (stats.late / total) * 100 : 0}%` }}
								/>
							</div>
						</div>
					</div>

					{/* Week Off */}
					<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow group'>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>Week Off</span>
							<div className='h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform'>
								<CalendarOff className='h-4 w-4 text-slate-500' />
							</div>
						</div>
						<div>
							<p className='text-4xl font-bold text-slate-600 leading-none'>{stats.weekOff}</p>
							<div className='mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden'>
								<div
									className='h-full bg-slate-400 rounded-full transition-all duration-700'
									style={{ width: `${total > 0 ? (stats.weekOff / total) * 100 : 0}%` }}
								/>
							</div>
						</div>
					</div>

					{/* On Leave */}
					<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow group col-span-2 sm:col-span-1'>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>On Leave</span>
							<div className='h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center group-hover:scale-110 transition-transform'>
								<Coffee className='h-4 w-4 text-violet-600' />
							</div>
						</div>
						<div>
							<p className='text-4xl font-bold text-violet-600 leading-none'>{stats.onLeave}</p>
							<div className='mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden'>
								<div
									className='h-full bg-violet-500 rounded-full transition-all duration-700'
									style={{ width: `${total > 0 ? (stats.onLeave / total) * 100 : 0}%` }}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* ── Summary Banner ── */}
				<div className='bg-card rounded-2xl border border-border/60 shadow-sm px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4'>
					{/* Rate pill */}
					<div className='flex items-center gap-3 flex-1 min-w-0'>
						<div className='h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0'>
							<TrendingUp className='h-5 w-5 text-primary' />
						</div>
						<div className='min-w-0'>
							<p className='text-xs text-muted-foreground font-medium uppercase tracking-wider'>Attendance Rate</p>
							<div className='flex items-end gap-2 mt-0.5'>
								<span className='text-3xl font-bold text-foreground leading-none'>{presentRate}%</span>
								<span className='text-xs text-muted-foreground mb-0.5'>({stats.present + stats.late} / {total} employees)</span>
							</div>
							{/* Track bar */}
							<div className='mt-2 h-2 w-48 max-w-full bg-muted rounded-full overflow-hidden'>
								<div
									className='h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-700'
									style={{ width: `${presentRate}%` }}
								/>
							</div>
						</div>
					</div>

					<div className='flex items-center gap-2 shrink-0'>
						<div className='h-10 w-10 rounded-xl bg-slate-50 border border-border flex items-center justify-center'>
							<Users className='h-4 w-4 text-muted-foreground' />
						</div>
						<div>
							<p className='text-xs text-muted-foreground font-medium'>Total Employees</p>
							<p className='text-xl font-bold text-foreground leading-none'>{total}</p>
						</div>
					</div>

					{/* Apply Late Policy */}
					<Button
						onClick={handleApplyLatePolicy}
						disabled={applyingPolicy}
						className='gap-2 rounded-xl h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-sm'
					>
						{applyingPolicy ? (
							<Loader2 className='h-4 w-4 animate-spin' />
						) : (
							<Zap className='h-4 w-4' />
						)}
						{applyingPolicy ? "Applying…" : "Apply Late Policy"}
					</Button>
				</div>
				
				{/* ── Filters ── */}
				<div className='bg-card rounded-2xl border border-border/50 shadow-sm px-5 py-4 space-y-4'>
					{/* Search */}
					<div className='relative max-w-sm'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
						<Input
							placeholder='Search employees…'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='pl-9 rounded-xl h-10 bg-background border-border/70 focus:border-primary/50 focus:ring-primary/20'
						/>
					</div>

					{/* Status pills */}
					<div className='flex flex-wrap gap-2'>
						{FILTER_TABS.map((tab) => (
							<button
								key={tab.value}
								onClick={() => setStatusFilter(tab.value)}
								className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer border ${statusFilter === tab.value
									? tab.value === "all"
										? "bg-primary text-primary-foreground border-primary shadow-sm"
										: `${tab.color} shadow-sm font-semibold`
									: "bg-background text-muted-foreground border-border hover:bg-muted"
									}`}
							>
								{tab.label}
								<span className={`inline-flex items-center justify-center h-4.5 min-w-[1.25rem] text-[11px] font-bold rounded-full px-1.5 ${statusFilter === tab.value && tab.value === "all"
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
				<div className='bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden'>
					{/* Card header */}
					<div className='flex items-center justify-between px-5 py-4 border-b border-border/60'>
						<div className='flex items-center gap-2.5'>
							<div className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center'>
								<Clock className='h-4 w-4 text-primary' />
							</div>
							<div>
								<h3 className='text-base font-semibold text-foreground'>Attendance Records</h3>
								<p className='text-xs text-muted-foreground'>
									{filteredRecords.length} employee{filteredRecords.length !== 1 ? "s" : ""} shown
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
							<p className='text-sm'>No employees match the current filters</p>
						</div>
					) : (
						<>
							{/* Desktop table */}
							<div className='hidden md:block overflow-x-auto'>
								<table className='w-full text-sm'>
									<thead>
										<tr className='bg-muted/40 border-b border-border/50'>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3'>Employee</th>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3'>Status</th>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3'>Clock In</th>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3'>Clock Out</th>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3'>Hours</th>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3'>Actions</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-border/40'>
										{filteredRecords.map((record) => {
											const cfg = getStatusConfig(record.status);
											const clockIn = formatTime(record.clock_in);
											const clockOut = formatTime(record.clock_out);
											return (
												<tr
													key={record.id}
													className={`${cfg.row} hover:bg-muted/30 transition-colors group`}
												>
													{/* Employee */}
													<td className='px-5 py-3.5'>
														<div className='flex items-center gap-3'>
															<Avatar className='h-9 w-9 shrink-0'>
																{record.employee?.avatar_url && (
																	<AvatarImage
																		height={36}
																		width={36}
																		className='object-cover'
																		src={record.employee.avatar_url}
																		alt='Profile'
																	/>
																)}
																<AvatarFallback className='text-xs font-semibold bg-primary/10 text-primary'>
																	{record.employee?.first_name?.[0]}
																	{record.employee?.last_name?.[0]}
																</AvatarFallback>
															</Avatar>
															<div>
																<p className='font-semibold text-foreground text-sm leading-tight'>
																	{record.employee?.first_name} {record.employee?.last_name}
																</p>
																{record.employee?.designation && (
																	<p className='text-xs text-muted-foreground truncate max-w-[160px]'>
																		{record.employee.designation}
																	</p>
																)}
															</div>
														</div>
													</td>

													{/* Status */}
													<td className='px-4 py-3.5'>
														<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.pill}`}>
															<span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} inline-block`} />
															{cfg.label}
														</span>
													</td>

													{/* Clock In */}
													<td className='px-4 py-3.5'>
														{clockIn ? (
															<span className='inline-flex items-center gap-1 text-sm font-mono font-medium text-foreground'>
																<Clock className='h-3 w-3 text-muted-foreground' />
																{clockIn}
															</span>
														) : (
															<span className='text-muted-foreground text-sm'>—</span>
														)}
													</td>

													{/* Clock Out */}
													<td className='px-4 py-3.5'>
														{clockOut ? (
															<span className='inline-flex items-center gap-1 text-sm font-mono font-medium text-foreground'>
																<LogOut className='h-3 w-3 text-muted-foreground' />
																{clockOut}
															</span>
														) : record.clock_in && !record.clock_out ? (
															<span className='inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5'>
																<span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block' />
																Active
															</span>
														) : (
															<span className='text-muted-foreground text-sm'>—</span>
														)}
													</td>

													{/* Hours */}
													<td className='px-4 py-3.5'>
														{record.total_hours ? (
															<span className='font-semibold text-foreground tabular-nums'>
																{record.total_hours}
																<span className='text-muted-foreground font-normal text-xs ml-0.5'>h</span>
															</span>
														) : (
															<span className='text-muted-foreground text-sm'>—</span>
														)}
													</td>

													{/* Actions */}
													<td className='px-4 py-3.5'>
														<div className='flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity'>
															{!record._synthetic && record.clock_in && !record.clock_out && (
																<button
																	onClick={() => handleClockOut(record.id)}
																	className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer'
																>
																	<LogOut className='h-3 w-3' />
																	Clock Out
																</button>
															)}
															{/* <button
																onClick={() => handleDownloadAttendance(record.employee_id)}
																className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-colors cursor-pointer'
															>
																<Download className='h-3 w-3' />
																CSV
															</button> */}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{/* Mobile card list */}
							<div className='md:hidden divide-y divide-border/40'>
								{filteredRecords.map((record) => {
									const cfg = getStatusConfig(record.status);
									const clockIn = formatTime(record.clock_in);
									const clockOut = formatTime(record.clock_out);
									return (
										<div
											key={record.id}
											className={`${cfg.row} px-4 py-4 hover:bg-muted/20 transition-colors`}
										>
											<div className='flex items-start justify-between gap-3'>
												<div className='flex items-center gap-3 flex-1 min-w-0'>
													<Avatar className='h-10 w-10 shrink-0'>
														{record.employee?.avatar_url && (
															<AvatarImage
																height={40}
																width={40}
																className='object-cover'
																src={record.employee.avatar_url}
																alt='Profile'
															/>
														)}
														<AvatarFallback className='text-xs font-semibold bg-primary/10 text-primary'>
															{record.employee?.first_name?.[0]}
															{record.employee?.last_name?.[0]}
														</AvatarFallback>
													</Avatar>
													<div className='min-w-0'>
														<p className='font-semibold text-foreground text-sm leading-tight truncate'>
															{record.employee?.first_name} {record.employee?.last_name}
														</p>
														{record.employee?.designation && (
															<p className='text-xs text-muted-foreground truncate'>
																{record.employee.designation}
															</p>
														)}
													</div>
												</div>
												<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${cfg.pill}`}>
													<span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} inline-block`} />
													{cfg.label}
												</span>
											</div>

											<div className='mt-3 flex items-center gap-4 text-xs text-muted-foreground'>
												<div className='flex items-center gap-1'>
													<Clock className='h-3 w-3' />
													<span className='font-mono'>{clockIn ?? "—"}</span>
												</div>
												<span>→</span>
												<div className='flex items-center gap-1'>
													<LogOut className='h-3 w-3' />
													{clockOut ? (
														<span className='font-mono'>{clockOut}</span>
													) : record.clock_in && !record.clock_out ? (
														<span className='text-emerald-600 font-medium'>Active</span>
													) : (
														<span>—</span>
													)}
												</div>
												{record.total_hours && (
													<span className='ml-auto font-semibold text-foreground'>
														{record.total_hours}h
													</span>
												)}
											</div>

											<div className='mt-3 flex items-center gap-2'>
												{!record._synthetic && record.clock_in && !record.clock_out && (
													<button
														onClick={() => handleClockOut(record.id)}
														className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer flex-1 justify-center'
													>
														<LogOut className='h-3 w-3' />
														Clock Out
													</button>
												)}
												<button
													onClick={() => handleDownloadAttendance(record.employee_id)}
													className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-colors cursor-pointer flex-1 justify-center'
												>
													<Download className='h-3 w-3' />
													Download CSV
												</button>
											</div>
										</div>
									);
								})}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
