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
			data = data.filter((r) => r.status === filterStatus);
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
		let lastDate = "";
		for (const record of filteredRecords) {
			if (record.date !== lastDate) {
				lastDate = record.date;
				rows.push([
					escape(`Date: ${new Date(`${record.date}T12:00:00`).toLocaleDateString("en-US", {
						weekday: "long",
						month: "long",
						day: "numeric",
						year: "numeric",
					})}`),
					"",
					"",
					"",
					"",
					"",
					"",
					"",
				].join(","));
			}
			rows.push([
				escape(record.date),
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
		<div className='flex flex-col min-h-screen bg-background'>
			<DashboardHeader
				title='Monthly Attendance Report'
				description='Download attendance data month by month'
			/>

			<div className='flex-1 p-4 md:p-6 pb-20 md:pb-8 space-y-5'>
				<div className='bg-card rounded-2xl border border-border/60 shadow-sm p-5 space-y-4'>
					<div className='flex items-center gap-2'>
						<CalendarDays className='h-4 w-4 text-primary' />
						<h3 className='font-semibold text-foreground'>Select Month</h3>
					</div>

					<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
						<div className='space-y-1.5'>
							<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
								Month
							</label>
							<Input
								type='month'
								value={selectedMonth}
								max={currentMonthStr()}
								onChange={(e) => setSelectedMonth(e.target.value)}
								className='h-10 rounded-xl'
							/>
						</div>

						<div className='space-y-1.5'>
							<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
								Employee
							</label>
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

						<div className='space-y-1.5'>
							<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
								Status
							</label>
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

						<div className='space-y-1.5'>
							<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
								Download
							</label>
							<Button
								onClick={downloadMonthlyCSV}
								disabled={filteredRecords.length === 0 || isLoading}
								className='w-full gap-2 rounded-xl h-10'>
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
							className='pl-9 h-10 rounded-xl'
						/>
					</div>
				</div>

				<div className='bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden'>
					<div className='px-5 py-4 border-b border-border/60'>
						<h3 className='text-base font-semibold text-foreground'>Attendance Records</h3>
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
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Employee</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Clock In</TableHead>
										<TableHead>Clock Out</TableHead>
										<TableHead>Hours</TableHead>
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
														<TableRow className='bg-primary/5 border-y border-primary/20'>
															<TableCell colSpan={6} className='font-semibold text-primary'>
																{new Date(`${record.date}T12:00:00`).toLocaleDateString("en-US", {
																	weekday: "long",
																	month: "long",
																	day: "numeric",
																	year: "numeric",
																})}
															</TableCell>
														</TableRow>
													)}
													<TableRow key={`${record.id}-${record.employee_id}`} className='border-b border-border/50'>
														<TableCell>{record.date}</TableCell>
														<TableCell>
															{record.employee?.first_name} {record.employee?.last_name}
														</TableCell>
														<TableCell className='capitalize'>{record.status}</TableCell>
														<TableCell>
															{record.clock_in
																? new Date(record.clock_in).toLocaleTimeString()
																: "—"}
														</TableCell>
														<TableCell>
															{record.clock_out
																? new Date(record.clock_out).toLocaleTimeString()
																: "—"}
														</TableCell>
														<TableCell>{record.total_hours ?? "—"}</TableCell>
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
