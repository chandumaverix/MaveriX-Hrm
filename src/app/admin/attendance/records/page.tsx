"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/user-context";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Calendar,
	Clock,
	Search,
	UserCheck,
	UserX,
	Timer,
	Coffee,
	Loader2,
	Download,
	Filter,
	CalendarDays,
	LogOut,
} from "lucide-react";
import { toast } from "react-hot-toast";
import type { Attendance, Employee } from "@/lib/types";

interface AttendanceWithEmployee extends Attendance {
	employee?: Employee;
}

/** Local date as YYYY-MM-DD */
function toLocalDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
		2,
		"0"
	)}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AttendanceRecordsPage() {
	const { employee } = useUser();
	const [attendanceRecords, setAttendanceRecords] = useState<AttendanceWithEmployee[]>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Filter states
	const [filterEmployeeId, setFilterEmployeeId] = useState<string>("all");
	const [filterDateFrom, setFilterDateFrom] = useState<string>(() => {
		const d = new Date();
		d.setDate(d.getDate() - 30);
		return toLocalDateStr(d);
	});
	const [filterDateTo, setFilterDateTo] = useState<string>(() => toLocalDateStr(new Date()));
	const [filterStatus, setFilterStatus] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");

	// Pagination - 15 records per page
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 200;

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		setIsLoading(true);
		try {
			const supabase = createClient();

			// Fetch all active employees
			const { data: employeesData } = await supabase
				.from("employees")
				.select("*")
				.eq("is_active", true)
				.neq("role", "admin")
				.order("first_name", { ascending: true });

			setEmployees(employeesData || []);

			// Fetch attendance records
			await fetchAttendanceRecords(supabase);
		} catch (error) {
			console.error(error);
			toast.error("Failed to load attendance records");
		} finally {
			setIsLoading(false);
		}
	};

	const fetchAttendanceRecords = async (supabase: any) => {
		try {
			let query = supabase
				.from("attendance")
				.select("*, employee:employees(*)")
				.order("date", { ascending: false })
				.order("clock_in", { ascending: false });

			// Apply filters
			if (filterEmployeeId !== "all") {
				query = query.eq("employee_id", filterEmployeeId);
			}
			if (filterDateFrom) {
				query = query.gte("date", filterDateFrom);
			}
			if (filterDateTo) {
				query = query.lte("date", filterDateTo);
			}

			const { data, error } = await query;
			if (error) throw error;

			const rawRecords = (data as unknown as AttendanceWithEmployee[]) || [];

			// Build a set of existing records (employee_id + date)
			const recordSet = new Set(rawRecords.map((r) => `${r.employee_id}_${r.date}`));

			// Determine date range
			const startDateStr = filterDateFrom || toLocalDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
			const endDateStr = filterDateTo || toLocalDateStr(new Date());

			const sDate = new Date(startDateStr + "T00:00:00");
			const eDate = new Date(endDateStr + "T23:59:59");

			// Determine which employees to include
			const targetEmployees = filterEmployeeId === "all"
				? employees
				: employees.filter(e => e.id === filterEmployeeId);

			// Generate synthetic records for missing dates
			const syntheticRecords: AttendanceWithEmployee[] = [];

			for (const emp of targetEmployees) {
				const curr = new Date(sDate);
				let limit = 0;
				
				while (curr <= eDate && limit < 366) {
					const dateStr = toLocalDateStr(curr);
					const key = `${emp.id}_${dateStr}`;

					// If no record exists for this employee on this date
					if (!recordSet.has(key)) {
						const isWeekOff = emp.week_off_day != null && curr.getDay() === emp.week_off_day;
						const statusStr = isWeekOff ? "week_off" : "absent";

						syntheticRecords.push({
							id: `syn-${emp.id}-${dateStr}`,
							employee_id: emp.id,
							date: dateStr,
							clock_in: null,
							clock_out: null,
							total_hours: null,
							status: statusStr,
							notes: null,
							created_at: "",
							updated_at: "",
							employee: emp,
							_synthetic: true,
						} as any);
					}

					curr.setDate(curr.getDate() + 1);
					limit++;
				}
			}

			// Combine actual and synthetic records
			const allRecords = [...rawRecords, ...syntheticRecords];
			
			// Sort by date (newest first)
			allRecords.sort((a, b) => {
				const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
				if (dateCompare !== 0) return dateCompare;
				// If same date, sort by employee name
				const nameA = `${a.employee?.first_name || ''} ${a.employee?.last_name || ''}`;
				const nameB = `${b.employee?.first_name || ''} ${b.employee?.last_name || ''}`;
				return nameA.localeCompare(nameB);
			});

			setAttendanceRecords(allRecords);
			setCurrentPage(1); // Reset to first page when filters change
		} catch (error) {
			console.error(error);
			toast.error("Failed to fetch attendance records");
		}
	};

	useEffect(() => {
		if (employees.length > 0) {
			const supabase = createClient();
			fetchAttendanceRecords(supabase);
		}
	}, [filterEmployeeId, filterDateFrom, filterDateTo]);

	const filteredRecords = useMemo(() => {
		let records = attendanceRecords;

		// Filter by status
		if (filterStatus !== "all") {
			records = records.filter((r) => r.status === filterStatus);
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			records = records.filter((r) => {
				const fullName = `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.toLowerCase();
				const email = r.employee?.email?.toLowerCase() || "";
				const designation = r.employee?.designation?.toLowerCase() || "";
				return (
					fullName.includes(query) ||
					email.includes(query) ||
					designation.includes(query)
				);
			});
		}

		return records;
	}, [attendanceRecords, filterStatus, searchQuery]);

	// Pagination
	const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
	const paginatedRecords = filteredRecords.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);

	const downloadCSV = () => {
		if (filteredRecords.length === 0) {
			toast.error("No records to download");
			return;
		}

		const escape = (v: string | number | null | undefined) => {
			const s = String(v ?? "").replace(/"/g, '""');
			return `"${s}"`;
		};

		const headers = [
			"Date",
			"Day",
			"Employee Name",
			"Email",
			"Designation",
			"Department",
			"Clock In",
			"Clock Out",
			"Total Hours",
			"Status",
			"Notes"
		];

		const rows = filteredRecords.map((record) => {
			const clockIn = record.clock_in
				? new Date(record.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
				: "-";
			const clockOut = record.clock_out
				? new Date(record.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
				: "-";
			const dayName = new Date(record.date + "T00:00:00").toLocaleDateString('en-US', { weekday: 'long' });

			return [
				escape(record.date),
				escape(dayName),
				escape(`${record.employee?.first_name ?? ""} ${record.employee?.last_name ?? ""}`),
				escape(record.employee?.email ?? ""),
				escape(record.employee?.designation ?? ""),
				escape(record.employee?.department ?? ""),
				escape(clockIn),
				escape(clockOut),
				escape(record.total_hours ? `${record.total_hours}h` : ""),
				escape(record.status),
				escape(record.notes ?? "")
			].join(",");
		});

		const csv = [headers.join(","), ...rows].join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;

		const empName = filterEmployeeId !== "all"
			? (employees.find((e) => e.id === filterEmployeeId)?.first_name ?? "employee")
			: "all-employees";
		a.download = `attendance-records-${empName}-${filterDateFrom}-to-${filterDateTo}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("Attendance records downloaded successfully");
	};

	const formatTime = (timeString: string | null) => {
		if (!timeString) return null;
		return new Date(timeString).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const STATUS_CONFIG = {
		present: {
			label: "Present",
			pill: "bg-emerald-50 text-emerald-700 border border-emerald-200",
			dot: "bg-emerald-500",
		},
		absent: {
			label: "Absent",
			pill: "bg-red-50 text-red-700 border border-red-200",
			dot: "bg-red-500",
		},
		late: {
			label: "Late",
			pill: "bg-amber-50 text-amber-700 border border-amber-200",
			dot: "bg-amber-500",
		},
		leave: {
			label: "On Leave",
			pill: "bg-violet-50 text-violet-700 border border-violet-200",
			dot: "bg-violet-500",
		},
		week_off: {
			label: "Week Off",
			pill: "bg-slate-100 text-slate-600 border border-slate-200",
			dot: "bg-slate-400",
		},
	} as const;

	type StatusKey = keyof typeof STATUS_CONFIG;

	const getStatusConfig = (status: string) =>
		STATUS_CONFIG[status as StatusKey] ?? {
			label: status,
			pill: "bg-slate-100 text-slate-700 border border-slate-200",
			dot: "bg-slate-400",
		};

	const stats = useMemo(() => {
		return {
			total: filteredRecords.length,
			present: filteredRecords.filter((r) => r.status === "present").length,
			absent: filteredRecords.filter((r) => r.status === "absent").length,
			late: filteredRecords.filter((r) => r.status === "late").length,
			leave: filteredRecords.filter((r) => r.status === "leave").length,
			weekOff: filteredRecords.filter((r) => r.status === "week_off").length,
		};
	}, [filteredRecords]);

	const handleResetFilters = () => {
		setFilterEmployeeId("all");
		setFilterStatus("all");
		setSearchQuery("");
		const d = new Date();
		d.setDate(d.getDate() - 30);
		setFilterDateFrom(toLocalDateStr(d));
		setFilterDateTo(toLocalDateStr(new Date()));
	};

	const isAdminOrHR = employee?.role === "admin" || employee?.role === "hr";

	if (!isAdminOrHR) {
		return (
			<div className='flex min-h-screen items-center justify-center'>
				<div className='text-center'>
					<h2 className='text-2xl font-bold text-foreground mb-2'>Access Denied</h2>
					<p className='text-muted-foreground'>Only Admin and HR can access this page.</p>
				</div>
			</div>
		);
	}

	return (
		<div className='flex flex-col min-h-screen bg-background'>
			<DashboardHeader
				title='Attendance Records'
				description='View and filter all employee attendance records'
			/>

			<div className='flex-1 p-4 md:p-6 pb-20 md:pb-8 space-y-5'>
				{/* Stats Cards */}
				<div className='grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'>
					<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-4'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-xs font-semibold text-muted-foreground'>Total</span>
							<CalendarDays className='h-4 w-4 text-muted-foreground' />
						</div>
						<p className='text-3xl font-bold text-foreground'>{stats.total}</p>
					</div>
					<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-4'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-xs font-semibold text-muted-foreground'>Present</span>
							<UserCheck className='h-4 w-4 text-emerald-600' />
						</div>
						<p className='text-3xl font-bold text-emerald-600'>{stats.present}</p>
					</div>
					<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-4'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-xs font-semibold text-muted-foreground'>Absent</span>
							<UserX className='h-4 w-4 text-red-600' />
						</div>
						<p className='text-3xl font-bold text-red-600'>{stats.absent}</p>
					</div>
					<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-4'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-xs font-semibold text-muted-foreground'>Late</span>
							<Timer className='h-4 w-4 text-amber-600' />
						</div>
						<p className='text-3xl font-bold text-amber-600'>{stats.late}</p>
					</div>
					<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-4'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-xs font-semibold text-muted-foreground'>On Leave</span>
							<Coffee className='h-4 w-4 text-violet-600' />
						</div>
						<p className='text-3xl font-bold text-violet-600'>{stats.leave}</p>
					</div>
					<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-4'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-xs font-semibold text-muted-foreground'>Week Off</span>
							<Calendar className='h-4 w-4 text-slate-600' />
						</div>
						<p className='text-3xl font-bold text-slate-600'>{stats.weekOff}</p>
					</div>
				</div>

				{/* Filters */}
				<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-5 space-y-4'>
					<div className='flex items-center gap-2 mb-2'>
						<Filter className='h-4 w-4 text-primary' />
						<h3 className='font-semibold text-foreground'>Filters</h3>
					</div>

					<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
						{/* Employee Filter */}
						<div className='space-y-1.5'>
							<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Employee</label>
							<Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
								<SelectTrigger className='h-10 rounded-xl'>
									<SelectValue placeholder='All Employees' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All Employees</SelectItem>
									{employees.map((emp) => (
										<SelectItem key={emp.id} value={emp.id}>
											{emp.first_name} {emp.last_name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Date From */}
						<div className='space-y-1.5'>
							<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>From Date</label>
							<Input
								type='date'
								value={filterDateFrom}
								onChange={(e) => setFilterDateFrom(e.target.value)}
								className='h-10 rounded-xl'
							/>
						</div>

						{/* Date To */}
						<div className='space-y-1.5'>
							<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>To Date</label>
							<Input
								type='date'
								value={filterDateTo}
								onChange={(e) => setFilterDateTo(e.target.value)}
								className='h-10 rounded-xl'
							/>
						</div>

						{/* Status Filter */}
						<div className='space-y-1.5'>
							<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Status</label>
							<Select value={filterStatus} onValueChange={setFilterStatus}>
								<SelectTrigger className='h-10 rounded-xl'>
									<SelectValue placeholder='All Status' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All Status</SelectItem>
									<SelectItem value='present'>Present</SelectItem>
									<SelectItem value='absent'>Absent</SelectItem>
									<SelectItem value='late'>Late</SelectItem>
									<SelectItem value='leave'>On Leave</SelectItem>
									<SelectItem value='week_off'>Week Off</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Search and Actions */}
					<div className='flex flex-wrap items-center gap-3 pt-2'>
						<div className='relative flex-1 min-w-[200px] max-w-md'>
							<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
							<Input
								placeholder='Search by name, email, or designation...'
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setCurrentPage(1);
								}}
								className='pl-9 h-10 rounded-xl'
							/>
						</div>
						<button
							type='button'
							onClick={handleResetFilters}
							className='h-10 px-4 rounded-xl text-xs font-semibold border border-border bg-background text-muted-foreground hover:bg-muted transition-colors cursor-pointer'>
							Reset Filters
						</button>
						<Button
							onClick={downloadCSV}
							disabled={filteredRecords.length === 0}
							className='gap-2 rounded-xl h-10 px-5'>
							<Download className='h-4 w-4' />
							Download CSV ({filteredRecords.length})
						</Button>
					</div>
				</div>

				{/* Records Table */}
				<div className='bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden'>
					<div className='flex items-center justify-between px-5 py-4 border-b border-border/60'>
						<div className='flex items-center gap-2.5'>
							<div className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center'>
								<Clock className='h-4 w-4 text-primary' />
							</div>
							<div>
								<h3 className='text-base font-semibold text-foreground'>Attendance Records</h3>
								<p className='text-xs text-muted-foreground'>
									Showing {paginatedRecords.length} of {filteredRecords.length} records
								</p>
							</div>
						</div>
					</div>

					{isLoading ? (
						<div className='py-20 flex flex-col items-center gap-3 text-muted-foreground'>
							<Loader2 className='h-8 w-8 animate-spin text-primary' />
							<p className='text-sm'>Loading attendance records...</p>
						</div>
					) : filteredRecords.length === 0 ? (
						<div className='py-20 flex flex-col items-center gap-3 text-muted-foreground'>
							<div className='h-16 w-16 rounded-2xl bg-muted flex items-center justify-center'>
								<Calendar className='h-8 w-8 opacity-40' />
							</div>
							<p className='text-sm'>No attendance records match your filters</p>
							<button
								onClick={handleResetFilters}
								className='text-sm text-primary hover:underline cursor-pointer'>
								Reset filters
							</button>
						</div>
					) : (
						<>
							{/* Desktop Table */}
							<div className='hidden md:block overflow-x-auto'>
								<table className='w-full text-sm'>
									<thead>
										<tr className='bg-muted/40 border-b border-border/50'>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3'>Date</th>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3'>Employee</th>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3'>Status</th>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3'>Clock In</th>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3'>Clock Out</th>
											<th className='text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3'>Hours</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-border/40'>
										{(() => {
											let lastDate = '';
											return paginatedRecords.map((record, index) => {
												const cfg = getStatusConfig(record.status);
												const clockIn = formatTime(record.clock_in);
												const clockOut = formatTime(record.clock_out);
												const showDateDivider = record.date !== lastDate;
												lastDate = record.date;

												return (
													<React.Fragment key={`${record.id}-${record.employee_id}-${index}`}>
														{showDateDivider && (
															<tr className='bg-primary/5 border-y border-primary/20'>
																<td colSpan={6} className='px-5 py-3'>
																	<div className='flex items-center gap-2'>
																		<CalendarDays className='h-4 w-4 text-primary' />
																		<span className='font-bold text-primary text-sm'>
																			{new Date(record.date + "T00:00:00").toLocaleDateString('en-US', { 
																				weekday: 'long',
																				year: 'numeric',
																				month: 'long',
																				day: 'numeric'
																			})}
																		</span>
																	</div>
																</td>
															</tr>
														)}
														<tr className='hover:bg-muted/30 transition-colors'>
															<td className='px-5 py-3.5'>
																<div className='font-medium text-foreground text-sm'>
																	{record.date}
																</div>
																<div className='text-xs text-muted-foreground mt-0.5'>
																	{new Date(record.date + "T00:00:00").toLocaleDateString('en-US', { weekday: 'short' })}
																</div>
															</td>
															<td className='px-4 py-3.5'>
																<div className='flex items-center gap-3'>
																	<Avatar className='h-9 w-9 shrink-0'>
																		{record.employee?.avatar_url && (
																			<AvatarImage
																				src={record.employee.avatar_url}
																				className='object-cover'
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
																		<p className='text-xs text-muted-foreground'>
																			{record.employee?.designation || "N/A"}
																		</p>
																	</div>
																</div>
															</td>
															<td className='px-4 py-3.5'>
																<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.pill}`}>
																	<span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} inline-block`} />
																	{cfg.label}
																</span>
															</td>
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
														</tr>
													</React.Fragment>
												);
											});
										})()}
									</tbody>
								</table>
							</div>

							{/* Mobile Card List */}
							<div className='md:hidden divide-y divide-border/40'>
								{(() => {
									let lastDate = '';
									return paginatedRecords.map((record, index) => {
										const cfg = getStatusConfig(record.status);
										const clockIn = formatTime(record.clock_in);
										const clockOut = formatTime(record.clock_out);
										const showDateDivider = record.date !== lastDate;
										lastDate = record.date;

										return (
											<React.Fragment key={`${record.id}-mobile-${record.employee_id}-${index}`}>
												{showDateDivider && (
													<div className='bg-primary/5 border-y border-primary/20 px-4 py-3'>
														<div className='flex items-center gap-2'>
															<CalendarDays className='h-4 w-4 text-primary' />
															<span className='font-bold text-primary text-sm'>
																{new Date(record.date + "T00:00:00").toLocaleDateString('en-US', { 
																	weekday: 'long',
																	month: 'long',
																	day: 'numeric'
																})}
															</span>
														</div>
													</div>
												)}
												<div className='px-4 py-4 hover:bg-muted/20 transition-colors'>
													<div className='flex items-start justify-between gap-3'>
														<div className='flex items-center gap-3 flex-1 min-w-0'>
															<Avatar className='h-10 w-10 shrink-0'>
																{record.employee?.avatar_url && (
																	<AvatarImage
																		src={record.employee.avatar_url}
																		className='object-cover'
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
																<p className='text-xs text-muted-foreground'>
																	{record.date} - {new Date(record.date + "T00:00:00").toLocaleDateString('en-US', { weekday: 'short' })}
																</p>
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
												</div>
											</React.Fragment>
										);
									});
								})()}
							</div>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className='flex items-center justify-between px-5 py-4 border-t border-border/60'>
									<p className='text-sm text-muted-foreground'>
										Page {currentPage} of {totalPages}
									</p>
									<div className='flex items-center gap-2'>
										<Button
											variant='outline'
											size='sm'
											onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
											disabled={currentPage === 1}
											className='rounded-lg'
										>
											Previous
										</Button>
										<Button
											variant='outline'
											size='sm'
											onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
											disabled={currentPage === totalPages}
											className='rounded-lg'
										>
											Next
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
