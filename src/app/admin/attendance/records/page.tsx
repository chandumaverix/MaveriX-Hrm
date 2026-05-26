"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/user-context";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CalendarDays, Download, Loader2, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import type { Attendance, Employee } from "@/lib/types";

interface AttendanceWithEmployee extends Attendance {
	employee?: Employee;
}

function toLocalDateStr(d: Date) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
		d.getDate(),
	).padStart(2, "0")}`;
}

function currentMonthStr() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(month: string) {
	const [year, monthNum] = month.split("-").map(Number);
	const start = `${year}-${String(monthNum).padStart(2, "0")}-01`;
	const endDate = new Date(year, monthNum, 0).getDate();
	const end = `${year}-${String(monthNum).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;
	return { start, end };
}

function getMonthDates(month: string) {
	const [year, monthNum] = month.split("-").map(Number);
	const totalDays = new Date(year, monthNum, 0).getDate();
	const out: string[] = [];
	for (let d = 1; d <= totalDays; d++) {
		out.push(
			`${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
		);
	}
	return out;
}

async function fetchAllAttendanceForMonth(
	supabase: ReturnType<typeof createClient>,
	start: string,
	end: string,
) {
	const pageSize = 1000;
	let from = 0;
	const all: AttendanceWithEmployee[] = [];

	while (true) {
		const to = from + pageSize - 1;
		const { data, error } = await supabase
			.from("attendance")
			.select("*, employee:employees(*)")
			.gte("date", start)
			.lte("date", end)
			.order("date", { ascending: false })
			.order("clock_in", { ascending: true })
			.range(from, to);

		if (error) throw error;
		const batch = (data as AttendanceWithEmployee[]) || [];
		all.push(...batch);

		if (batch.length < pageSize) break;
		from += pageSize;
	}

	return all;
}

export default function AttendanceRecordsPage() {
	const { employee } = useUser();
	const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr());
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [attendanceRecords, setAttendanceRecords] = useState<AttendanceWithEmployee[]>(
		[],
	);
	const [isLoading, setIsLoading] = useState(true);
	const [filterEmployeeId, setFilterEmployeeId] = useState("all");
	const [filterStatus, setFilterStatus] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");

	const isAdminOrHR = employee?.role === "admin" || employee?.role === "hr";

	useEffect(() => {
		if (!isAdminOrHR) return;
		void fetchMonthRecords();
	}, [isAdminOrHR, selectedMonth]);

	const fetchMonthRecords = async () => {
		setIsLoading(true);
		try {
			const supabase = createClient();
			const { start, end } = getMonthRange(selectedMonth);

			const [{ data: employeesData, error: employeesError }, attendanceData] =
				await Promise.all([
					supabase
						.from("employees")
						.select("*")
						.eq("is_active", true)
						.neq("role", "admin")
						.order("first_name", { ascending: true }),
					fetchAllAttendanceForMonth(supabase, start, end),
				]);

			if (employeesError) throw employeesError;

			setEmployees((employeesData as Employee[]) || []);
			setAttendanceRecords(attendanceData || []);
		} catch (e) {
			console.error(e);
			toast.error("Failed to load monthly attendance records");
		} finally {
			setIsLoading(false);
		}
	};

	const allMonthRecords = useMemo(() => {
		if (employees.length === 0) return attendanceRecords;

		const dates = getMonthDates(selectedMonth);
		const actualByKey = new Map<string, AttendanceWithEmployee>();
		for (const rec of attendanceRecords) {
			actualByKey.set(`${rec.employee_id}_${rec.date}`, rec);
		}

		const generated: AttendanceWithEmployee[] = [];
		for (const emp of employees) {
			for (const date of dates) {
				const key = `${emp.id}_${date}`;
				const existing = actualByKey.get(key);
				if (existing) {
					generated.push(existing);
					continue;
				}

				const day = new Date(`${date}T12:00:00`).getDay();
				const isWeekOff = emp.week_off_day != null && emp.week_off_day === day;
				generated.push({
					id: `synthetic-${emp.id}-${date}`,
					employee_id: emp.id,
					date,
					clock_in: null,
					clock_out: null,
					total_hours: null,
					status: isWeekOff ? "week_off" : "absent",
					notes: null,
					created_at: "",
					updated_at: "",
					employee: emp,
				});
			}
		}

		generated.sort((a, b) => {
			const byDate = a.date.localeCompare(b.date);
			if (byDate !== 0) return byDate;
			const nameA = `${a.employee?.first_name || ""} ${a.employee?.last_name || ""}`;
			const nameB = `${b.employee?.first_name || ""} ${b.employee?.last_name || ""}`;
			return nameA.localeCompare(nameB);
		});
		return generated;
	}, [attendanceRecords, employees, selectedMonth]);

	const filteredRecords = useMemo(() => {
		let data = allMonthRecords;
		if (filterEmployeeId !== "all") {
			data = data.filter((r) => r.employee_id === filterEmployeeId);
		}
		if (filterStatus !== "all") {
			if (filterStatus === "wfh") {
				data = data.filter((r) => !!r.is_wfh);
			} else {
				data = data.filter((r) => r.status === filterStatus);
			}
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			data = data.filter((r) => {
				const fullName =
					`${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`.toLowerCase();
				const mail = (r.employee?.email || "").toLowerCase();
				return fullName.includes(q) || mail.includes(q);
			});
		}
		return data;
	}, [allMonthRecords, filterEmployeeId, filterStatus, searchQuery]);

	const monthLabel = useMemo(() => {
		const [year, month] = selectedMonth.split("-").map(Number);
		return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
	}, [selectedMonth]);

	const downloadMonthlyCSV = () => {
		if (filteredRecords.length === 0) {
			toast.error("No records to download for selected month");
			return;
		}

		const escape = (v: string | number | null | undefined) => {
			const s = String(v ?? "").replace(/"/g, '""');
			return `"${s}"`;
		};

		const headers = [
			"Date",
			"Employee Name",
			"Email",
			"Clock In",
			"Clock Out",
			"Total Hours",
			"Status",
			"Notes",
		];

		const rows: string[] = [];
		for (const record of filteredRecords) {
			const longDate = new Date(`${record.date}T12:00:00`).toLocaleDateString("en-US", {
				weekday: "long",
				month: "long",
				day: "numeric",
				year: "numeric",
			});

			rows.push([
				escape(longDate),
				escape(`${record.employee?.first_name || ""} ${record.employee?.last_name || ""}`),
				escape(record.employee?.email || ""),
				escape(record.clock_in ? new Date(record.clock_in).toLocaleTimeString() : "-"),
				escape(record.clock_out ? new Date(record.clock_out).toLocaleTimeString() : "-"),
				escape(record.total_hours ?? ""),
				escape(record.status),
				escape(record.notes || ""),
			].join(","));
		}

		const csv = [headers.join(","), ...rows].join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `attendance-report-${selectedMonth}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success(`Downloaded ${monthLabel} report`);
	};

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
		<div className='flex flex-col min-h-screen bg-transparent text-slate-800 dark:text-slate-200'>
			<DashboardHeader
				title='Monthly Attendance Report'
				description='Download attendance data month by month'
			/>

			<div className='flex-1 p-4 md:p-6 pb-20 md:pb-8 space-y-5'>
				<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-5 space-y-4'>
					<div className='flex items-center gap-2'>
						<div className='w-8 h-8 rounded-lg flex items-center justify-center border border-primary/10 bg-primary/5 text-primary'>
							<CalendarDays className='h-4 w-4' />
						</div>
						<h3 className='text-sm font-bold text-slate-800 dark:text-white'>Select Month</h3>
					</div>

					<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
						<div className='space-y-1.5'>
							<label className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
								Month
							</label>
							<Input
								type='month'
								value={selectedMonth}
								max={currentMonthStr()}
								onChange={(e) => setSelectedMonth(e.target.value)}
								className='h-10 rounded-xl bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 focus:border-primary/50 focus:ring-primary/20 text-slate-800 dark:text-slate-200'
							/>
						</div>

						<div className='space-y-1.5'>
							<label className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
								Employee
							</label>
							<Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
								<SelectTrigger className='h-10 rounded-xl bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 text-slate-800 dark:text-slate-200'>
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

						<div className='space-y-1.5'>
							<label className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
								Status
							</label>
							<Select value={filterStatus} onValueChange={setFilterStatus}>
								<SelectTrigger className='h-10 rounded-xl bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 text-slate-800 dark:text-slate-200'>
									<SelectValue placeholder='All Status' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All Status</SelectItem>
									<SelectItem value='present'>Present</SelectItem>
									<SelectItem value='wfh'>WFH (Work From Home)</SelectItem>
									<SelectItem value='absent'>Absent</SelectItem>
									<SelectItem value='late'>Late</SelectItem>
									<SelectItem value='leave'>On Leave</SelectItem>
									<SelectItem value='week_off'>Week Off</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className='space-y-1.5'>
							<label className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
								Download
							</label>
							<Button
								onClick={downloadMonthlyCSV}
								disabled={filteredRecords.length === 0 || isLoading}
								className='w-full gap-2 rounded-xl h-10 text-xs font-bold bg-primary text-white hover:bg-primary/95 transition-all active:scale-[0.98]'>
								<Download className='h-4 w-4' />
								Download {monthLabel}
							</Button>
						</div>
					</div>

					<div className='relative w-full max-w-md'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
						<Input
							placeholder='Search by employee name or email'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='pl-9 h-10 rounded-xl bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 focus:border-primary/50 focus:ring-primary/20 text-slate-800 dark:text-slate-200'
						/>
					</div>
				</div>

				<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden'>
					<div className='px-6 py-5 border-b border-slate-50 dark:border-slate-800/40'>
						<h3 className='text-sm font-bold text-slate-800 dark:text-white'>Attendance Records</h3>
						<p className='text-xs text-muted-foreground mt-0.5'>
							{monthLabel}: {filteredRecords.length} records
						</p>
					</div>

					{isLoading ? (
						<div className='py-20 flex flex-col items-center gap-3 text-muted-foreground'>
							<Loader2 className='h-8 w-8 animate-spin text-primary' />
							<p className='text-sm'>Loading monthly attendance...</p>
						</div>
					) : filteredRecords.length === 0 ? (
						<div className='py-16 text-center text-muted-foreground text-sm'>
							No records found for selected month and filters.
						</div>
					) : (
						<div className='overflow-x-auto'>
							<Table>
								<TableHeader className='bg-slate-50/30 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/40'>
									<TableRow>
										<TableHead className='text-[10px] font-black uppercase tracking-wider text-slate-400 px-6 py-3.5'>Date</TableHead>
										<TableHead className='text-[10px] font-black uppercase tracking-wider text-slate-400 px-4 py-3.5'>Employee</TableHead>
										<TableHead className='text-[10px] font-black uppercase tracking-wider text-slate-400 px-4 py-3.5'>Status</TableHead>
										<TableHead className='text-[10px] font-black uppercase tracking-wider text-slate-400 px-4 py-3.5'>Clock In</TableHead>
										<TableHead className='text-[10px] font-black uppercase tracking-wider text-slate-400 px-4 py-3.5'>Clock Out</TableHead>
										<TableHead className='text-[10px] font-black uppercase tracking-wider text-slate-400 px-4 py-3.5'>Hours</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(() => {
										let lastDate = "";
										return filteredRecords.map((record) => {
											const showDateSeparator = record.date !== lastDate;
											lastDate = record.date;
										return (
											<Fragment key={`${record.employee_id}-${record.date}-${record.id}`}>
													{showDateSeparator && (
														<TableRow className='bg-slate-50/50 dark:bg-slate-900/30 border-y border-slate-100 dark:border-slate-800/40'>
															<TableCell colSpan={6} className='px-6 py-2.5 font-bold text-xs uppercase tracking-wider text-primary'>
																{new Date(`${record.date}T12:00:00`).toLocaleDateString("en-IN", {
																	weekday: "long",
																	month: "long",
																	day: "numeric",
																	year: "numeric",
																})}
															</TableCell>
														</TableRow>
													)}
													<TableRow key={`${record.id}-${record.employee_id}`} className='border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-colors'>
														<TableCell className='px-6 py-3.5'>{record.date}</TableCell>
														<TableCell className='px-4 py-3.5'>
															{record.employee?.first_name} {record.employee?.last_name}
														</TableCell>
														<TableCell className='px-4 py-3.5 capitalize'>
															<div className="flex items-center gap-1.5">
																<span>{record.status}</span>
																{record.is_wfh && (
																	<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
																		WFH
																	</span>
																)}
															</div>
														</TableCell>
														<TableCell className='px-4 py-3.5'>
															{record.clock_in
																? new Date(record.clock_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
																: "—"}
														</TableCell>
														<TableCell className='px-4 py-3.5'>
															{record.clock_out
																? new Date(record.clock_out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
																: "—"}
														</TableCell>
														<TableCell className='px-4 py-3.5 font-medium tabular-nums'>{record.total_hours ?? "—"}</TableCell>
													</TableRow>
												</Fragment>
											);
										});
									})()}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
