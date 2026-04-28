"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
	CheckCircle2,
	XCircle,
	CalendarDays,
	CalendarCheck,
	ExternalLink,
	Info,
	FileDown,
	Download,
	User,
} from "lucide-react";
import type {
	Employee,
	LeaveRequest,
	LeaveType,
	LeaveBalance,
} from "@/lib/types";
import { useUser } from "../../../contexts/user-context";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
  } from "@/components/ui/tooltip";

interface LeaveRequestWithDetails extends LeaveRequest {
	employee?: Employee;
	leave_type?: LeaveType;
}

type LeaveBalanceRow = LeaveBalance & {
	leave_type?: LeaveType;
	employee?: Employee;
};

type EmployeeYearGroup = {
	employee_id: string;
	year: number;
	employee?: Employee;
	balances: LeaveBalanceRow[];
};

const ExpandableReason = ({ reason }: { reason: string }) => {
	const [isExpanded, setIsExpanded] = useState(false);
	if (!reason) return <span className='text-muted-foreground'>—</span>;

	const isLong = reason.length > 80 || reason.split('\n').length > 2;

	if (!isLong) return <span className='whitespace-pre-wrap'>{reason}</span>;

	return (
		<div className="flex flex-col items-start gap-1.5 w-full">
			<div className={cn(
				"text-sm w-full transition-all duration-300",
				isExpanded ? "whitespace-pre-wrap break-words" : "line-clamp-2 break-all text-muted-foreground"
			)}>
				{reason}
			</div>
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="text-[11px] font-semibold text-primary hover:text-primary/70 active:scale-95 transition-all outline-none"
			>
				{isExpanded ? "Show less" : "Read more"}
			</button>
		</div>
	);
};

export default function LeavePage() {
	const { employee: currentUser } = useUser();
	const [leaveRequests, setLeaveRequests] = useState<
		LeaveRequestWithDetails[]
	>([]);
	const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
	const [leaveBalances, setLeaveBalances] = useState<
		(LeaveBalance & { leave_type?: LeaveType; employee?: Employee })[]
	>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [isLoading, setIsLoading] = useState(true);
	const [isAllotOpen, setIsAllotOpen] = useState(false);
	const [allotLoading, setAllotLoading] = useState(false);
	const [allotError, setAllotError] = useState<string | null>(null);
	const [allotForm, setAllotForm] = useState<{
		employee_ids: string[];
		year: number;
		daysByType: Record<string, string>;
	}>({
		employee_ids: [],
		year: new Date().getFullYear(),
		daysByType: {},
	});
	const [allotEmployeeSearch, setAllotEmployeeSearch] = useState("");
	const [employeeLeaveSearch, setEmployeeLeaveSearch] = useState("");
	const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
	const [typeForm, setTypeForm] = useState<{
		id: string | null;
		name: string;
		default_days: string;
		description: string;
	}>({
		id: null,
		name: "",
		default_days: "",
		description: "",
	});
	const [isSavingType, setIsSavingType] = useState(false);
	const [typeError, setTypeError] = useState<string | null>(null);

	// ── Download Report state ──────────────────────────────────────────
	const [reportEmployeeId, setReportEmployeeId] = useState<string>("all");
	const [reportStatus, setReportStatus] = useState<string>("all");
	const [reportDateFrom, setReportDateFrom] = useState<string>("");
	const [reportDateTo, setReportDateTo] = useState<string>("");
	const [reportSearch, setReportSearch] = useState<string>("");

	const canApproveLeave =
		currentUser?.role === "admin" || currentUser?.role === "hr";

	const [stats, setStats] = useState({
		pending: 0,
		approved: 0,
		rejected: 0,
		total: 0,
	});

	useEffect(() => {
		fetchLeaveRequests();
		fetchLeaveTypes();
		fetchLeaveBalances();
		fetchEmployees();
	}, []);

	const fetchLeaveRequests = async () => {
		const supabase = createClient();
		const { data, error } = await supabase
			.from("leave_requests")
			.select(
				"*, employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name, designation, email), leave_types(*)"
			)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Leave requests fetch error:", error);
			setIsLoading(false);
			return;
		}

		const raw = (data || []) as Record<string, unknown>[];
		const requests: LeaveRequestWithDetails[] = raw.map((row) => ({
			...row,
			employee:
				(row.employee as Employee) ??
				(row.employees as Employee) ??
				undefined,
			leave_type:
				(row.leave_type as LeaveType) ??
				(row.leave_types as LeaveType) ??
				undefined,
		})) as LeaveRequestWithDetails[];
		setLeaveRequests(requests);

		setStats({
			pending: requests.filter((r) => r.status === "pending").length,
			approved: requests.filter((r) => r.status === "approved").length,
			rejected: requests.filter((r) => r.status === "rejected").length,
			total: requests.length,
		});

		setIsLoading(false);
	};

	const fetchLeaveTypes = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("leave_types")
			.select("*")
			.eq("is_active", true)
			.order("created_at", { ascending: true });
		setLeaveTypes(data || []);
	};

	const fetchLeaveBalances = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("leave_balances")
			.select("*, leave_types(*), employees(id, first_name, last_name)")
			.order("year", { ascending: false });
		const raw = (data || []) as Record<string, unknown>[];
		const balances = raw.map((row) => ({
			...row,
			leave_type: row.leave_type ?? row.leave_types,
			employee: row.employee ?? row.employees,
		})) as (LeaveBalance & {
			leave_type?: LeaveType;
			employee?: Employee;
		})[];
		setLeaveBalances(balances);
	};

	const fetchEmployees = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select("id, first_name, last_name, email")
			.eq("is_active", true)
			.neq("role", "admin")
			.order("first_name");
		setEmployees((data as Employee[]) || []);
	};

	// Group leave balances by employee + year for one row per employee
	const leaveBalanceGroups = useMemo((): EmployeeYearGroup[] => {
		const map = new Map<string, EmployeeYearGroup>();
		for (const bal of leaveBalances) {
			const key = `${bal.employee_id}-${bal.year}`;
			if (!map.has(key)) {
				map.set(key, {
					employee_id: bal.employee_id,
					year: bal.year,
					employee: bal.employee as Employee | undefined,
					balances: [],
				});
			}
			map.get(key)!.balances.push(bal as LeaveBalanceRow);
		}
		return Array.from(map.values()).sort((a, b) => {
			const nameA =
				(a.employee?.first_name ?? "") + (a.employee?.last_name ?? "");
			const nameB =
				(b.employee?.first_name ?? "") + (b.employee?.last_name ?? "");
			if (nameA !== nameB) return nameA.localeCompare(nameB);
			return b.year - a.year;
		});
	}, [leaveBalances]);

	const handleAllotLeave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (allotForm.employee_ids.length === 0) {
			setAllotError("Select at least one employee to allot leaves.");
			return;
		}

		const updates = Object.entries(allotForm.daysByType)
			.map(([leave_type_id, value]) => ({
				leave_type_id,
				days: parseFloat(String(value).trim()) || 0,
			}))
			.filter(({ days }) => Number.isFinite(days) && days >= 0);

		if (updates.length === 0) {
			setAllotError(
				"Enter total days for at least one leave type (or leave blank to skip)."
			);
			return;
		}

		setAllotError(null);
		setAllotLoading(true);
		const supabase = createClient();

		const rows: {
			employee_id: string;
			leave_type_id: string;
			year: number;
			total_days: number;
		}[] = [];
		for (const employee_id of allotForm.employee_ids) {
			for (const { leave_type_id, days } of updates) {
				rows.push({
					employee_id,
					leave_type_id,
					year: allotForm.year,
					total_days: Math.round(days * 100) / 100,
				});
			}
		}

		const { error } = await supabase.from("leave_balances").upsert(rows, {
			onConflict: "employee_id,leave_type_id,year",
		});
		setAllotLoading(false);
		if (error) {
			setAllotError(error.message);
			return;
		}

		setIsAllotOpen(false);
		setAllotForm({
			employee_ids: [],
			year: new Date().getFullYear(),
			daysByType: {},
		});
		setAllotEmployeeSearch("");
		await fetchLeaveBalances();
	};

	const openCreateLeaveType = () => {
		setTypeError(null);
		setTypeForm({
			id: null,
			name: "",
			default_days: "",
			description: "",
		});
		setIsTypeDialogOpen(true);
	};

	const openEditLeaveType = (type: LeaveType) => {
		setTypeError(null);
		setTypeForm({
			id: type.id,
			name: type.name,
			default_days: String(type.default_days ?? ""),
			description: type.description ?? "",
		});
		setIsTypeDialogOpen(true);
	};

	const handleSaveLeaveType = async (e: React.FormEvent) => {
		e.preventDefault();
		const days = parseInt(typeForm.default_days, 10);
		if (!typeForm.name.trim() || !Number.isFinite(days) || days < 0) {
			setTypeError("Enter a name and valid default days (0 or more).");
			return;
		}
		setIsSavingType(true);
		const supabase = createClient();
		let error;
		if (typeForm.id) {
			const { error: updErr } = await supabase
				.from("leave_types")
				.update({
					name: typeForm.name.trim(),
					default_days: days,
					description: typeForm.description || null,
				})
				.eq("id", typeForm.id);
			error = updErr;
		} else {
			const { error: insErr } = await supabase
				.from("leave_types")
				.insert({
					name: typeForm.name.trim(),
					default_days: days,
					description: typeForm.description || null,
					is_active: true,
				});
			error = insErr;
		}
		setIsSavingType(false);
		if (error) {
			setTypeError(error.message);
			return;
		}
		setIsTypeDialogOpen(false);
		await fetchLeaveTypes();
	};

	const handleDeleteLeaveType = async (type: LeaveType) => {
		if (
			!window.confirm(
				`Are you sure you want to remove leave type "${type.name}"? All allotted balances for this type will be removed and it will no longer be available.`
			)
		) {
			return;
		}
		const supabase = createClient();
		// Remove this leave type from all employees' leave balances first
		await supabase
			.from("leave_balances")
			.delete()
			.eq("leave_type_id", type.id);
		const { error } = await supabase
			.from("leave_types")
			.update({ is_active: false })
			.eq("id", type.id);
		if (error) {
			window.alert(`Could not delete leave type: ${error.message}`);
			return;
		}
		await fetchLeaveTypes();
		await fetchLeaveBalances();
	};

	const openAllotDialog = (employeeId?: string, year?: number) => {
		const initialDays: Record<string, string> = {};
		leaveTypes.forEach((t) => {
			initialDays[t.id] = "";
		});

		if (employeeId) {
			leaveTypes.forEach((t) => {
				const existing = leaveBalances.find(
					(b) =>
						b.employee_id === employeeId &&
						b.leave_type_id === t.id &&
						b.year === (year ?? new Date().getFullYear())
				);
				if (existing) {
					initialDays[t.id] = String(existing.total_days);
				}
			});
		}

		setAllotForm({
			employee_ids: employeeId ? [employeeId] : [],
			year: year ?? new Date().getFullYear(),
			daysByType: initialDays,
		});
		setAllotEmployeeSearch("");
		setAllotError(null);
		setIsAllotOpen(true);
	};

	const handleDeleteBalance = async (
		bal: LeaveBalance & { employee?: Employee; leave_type?: LeaveType }
	) => {
		if (
			!window.confirm(
				`Delete allotted ${bal.leave_type?.name ?? "leave"
				} for this employee?`
			)
		) {
			return;
		}
		const supabase = createClient();
		const { error } = await supabase
			.from("leave_balances")
			.delete()
			.eq("id", bal.id);
		if (!error) {
			await fetchLeaveBalances();
		}
	};

	const handleDeleteBalanceGroup = async (
		employeeId: string,
		year: number,
		employeeName: string
	) => {
		if (
			!window.confirm(
				`Remove all allotted leaves for ${employeeName} (${year})?`
			)
		) {
			return;
		}
		const supabase = createClient();
		const { error } = await supabase
			.from("leave_balances")
			.delete()
			.eq("employee_id", employeeId)
			.eq("year", year);
		if (!error) {
			await fetchLeaveBalances();
		}
	};

	const handleLeaveAction = async (
		requestId: string,
		status: "approved" | "rejected"
	) => {
		const supabase = createClient();
		const request = leaveRequests.find((r) => r.id === requestId);
		if (!request) return;

		await supabase
			.from("leave_requests")
			.update({
				status,
				reviewed_by: currentUser?.id,
				reviewed_at: new Date().toISOString(),
			})
			.eq("id", requestId);

		// Notify employee of status change (fire-and-forget; does not block UI)
		const emp = request.employee;
		const empEmail = emp?.email;
		if (empEmail) {
			fetch("/api/leave/notify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: "status_update",
					employeeEmail: empEmail,
					employeeName:
						`${emp.first_name ?? ""} ${emp.last_name ?? ""
							}`.trim() || "Employee",
					leaveTypeName:
						(request.leave_type as { name?: string })?.name ??
						"Leave",
					startDate: request.start_date,
					endDate: request.end_date,
					status,
				}),
			}).catch(() => { });
		}

		// On approve: deduct from leave_balances (used_days supports decimals for half-day)
		if (status === "approved") {
			const days = calculateDays(
				request.start_date,
				request.end_date,
				request.half_day
			);
			const year = new Date(request.start_date).getFullYear();
			const { data: bal } = await supabase
				.from("leave_balances")
				.select("id, used_days")
				.eq("employee_id", request.employee_id)
				.eq("leave_type_id", request.leave_type_id)
				.eq("year", year)
				.single();
			if (bal) {
				const currentUsed = Number(bal.used_days) || 0;
				const newUsed = Math.round((currentUsed + days) * 100) / 100;
				await supabase
					.from("leave_balances")
					.update({ used_days: newUsed })
					.eq("id", bal.id);
			}
		}

		await fetchLeaveRequests();
		await fetchLeaveBalances();
	};

	const getFilteredRequests = (status?: string) => {
		return leaveRequests.filter((request) => {
			const matchesSearch =
				request.employee?.first_name
					?.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				request.employee?.last_name
					?.toLowerCase()
					.includes(searchQuery.toLowerCase());
			const matchesStatus =
				!status || status === "all" ? true : request.status === status;
			const matchesFilter =
				statusFilter === "all" ? true : request.status === statusFilter;
			return matchesSearch && matchesStatus && matchesFilter;
		});
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "approved":
				return (
					<span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200'>
						<span className='h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block' />
						Approved
					</span>
				);
			case "rejected":
				return (
					<span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200'>
						<span className='h-1.5 w-1.5 rounded-full bg-red-500 inline-block' />
						Rejected
					</span>
				);
			case "pending":
				return (
					<span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200'>
						<span className='h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse inline-block' />
						Pending
					</span>
				);
			default:
				return <Badge variant='outline'>{status}</Badge>;
		}
	};

	const calculateDays = (
		startDate: string,
		endDate: string,
		halfDay?: boolean | null
	) => {
		if (halfDay) return 1; // Half-day leave consumes 1 full day from leave balance
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
	};

	const formatLeaveDays = (
		startDate: string,
		endDate: string,
		halfDay?: boolean | null
	) => {
		if (halfDay) return "half day";
		const days = calculateDays(startDate, endDate, halfDay);
		return `${Math.round(days)} day${days !== 1 ? "s" : ""}`;
	};

	const formatRemainingDays = (days: number) => {
		const n = Number(days);
		if (Number.isNaN(n)) return "0";
		if (n % 1 === 0) return String(Math.round(n));
		return String(Number(n.toFixed(2)));
	};

	// ── Report filtered data (memoized) ──────────────────────────────
	const reportRows = useMemo(() => {
		return leaveRequests.filter((req) => {
			const fullName = `${req.employee?.first_name ?? ""} ${req.employee?.last_name ?? ""}`.toLowerCase();
			if (reportSearch.trim() && !fullName.includes(reportSearch.toLowerCase())) return false;
			if (reportEmployeeId !== "all" && req.employee_id !== reportEmployeeId) return false;
			if (reportStatus !== "all" && req.status !== reportStatus) return false;
			if (reportDateFrom && req.start_date < reportDateFrom) return false;
			if (reportDateTo && req.end_date > reportDateTo) return false;
			return true;
		});
	}, [leaveRequests, reportEmployeeId, reportStatus, reportDateFrom, reportDateTo, reportSearch]);

	// ── CSV download ──────────────────────────────────────────────────
	const downloadCSV = () => {
		if (reportRows.length === 0) return;
		const escape = (v: string | number | null | undefined) => {
			const s = String(v ?? "").replace(/"/g, '""');
			return `"${s}"`;
		};
		const headers = [
			"Employee Name",
			"Email",
			"Designation",
			"Leave Type",
			"Start Date",
			"End Date",
			"Days",
			"Half Day",
			"Half Day Period",
			"Status",
			"Reason",
			"Applied On",
		];
		const rows = reportRows.map((req) => [
			escape(`${req.employee?.first_name ?? ""} ${req.employee?.last_name ?? ""}`),
			escape(req.employee?.email ?? ""),
			escape(req.employee?.designation ?? ""),
			escape((req.leave_type as { name?: string })?.name ?? ""),
			escape(req.start_date),
			escape(req.end_date),
			escape(formatLeaveDays(req.start_date, req.end_date, req.half_day)),
			escape(req.half_day ? "Yes" : "No"),
			escape(req.half_day_period === "first_half" ? "9am–1pm" : req.half_day_period === "second_half" ? "1pm–7pm" : ""),
			escape(req.status),
			escape(req.reason ?? ""),
			escape(req.created_at ? new Date(req.created_at).toLocaleDateString() : ""),
		].join(","));
		const csv = [headers.join(","), ...rows].join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		const empName = reportEmployeeId !== "all"
			? (employees.find((e) => e.id === reportEmployeeId)?.first_name ?? "employee")
			: "all-employees";
		a.download = `leave-report-${empName}-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const renderLeaveTable = (
		requests: LeaveRequestWithDetails[],
		showActions = false
	) => (
		<div className='w-[300px] md:w-full overflow-x-auto'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Employee</TableHead>
						<TableHead>Leave Type</TableHead>
						<TableHead>Duration</TableHead>
						<TableHead>Days</TableHead>
						<TableHead>
							<div className="flex items-center gap-1">
								Reason
							</div>
						</TableHead>
						<TableHead>Document</TableHead>
						<TableHead>Status</TableHead>
						{showActions && <TableHead>Actions</TableHead>}
					</TableRow>
				</TableHeader>
				<TableBody>
					{requests.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={showActions ? 8 : 7}
								className='text-center py-8'>
								<p className='text-muted-foreground'>
									No leave requests found
								</p>
							</TableCell>
						</TableRow>
					) : (
						requests.map((request) => (
							<TableRow key={request.id}>
								<TableCell>
									<div className='flex items-center gap-3'>
										<Avatar className='h-8 w-8'>
											{request.employee?.avatar_url && (
												<AvatarImage
													height={32}
													width={32}
													className='object-cover'
													src={request.employee.avatar_url}
													alt='Profile Pic'
												/>
											)}
											<AvatarFallback className='text-xs'>
												{
													request.employee
														?.first_name?.[0]
												}
												{
													request.employee
														?.last_name?.[0]
												}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className='font-medium text-sm'>
												{request.employee?.first_name}{" "}
												{request.employee?.last_name}
											</p>
											<p className='text-xs text-muted-foreground'>
												{request.employee?.designation}
											</p>
										</div>
									</div>
								</TableCell>
								<TableCell>
									<Badge variant='outline'>
										{request.leave_type?.name}
									</Badge>
								</TableCell>
								<TableCell className='text-sm'>
									<div className='flex flex-col'>
										<span>
											{new Date(
												request.start_date
											).toLocaleDateString()}
										</span>
										<span className='text-xs text-muted-foreground'>
											to{" "}
											{new Date(
												request.end_date
											).toLocaleDateString()}
										</span>
									</div>
								</TableCell>
								<TableCell>
									<Badge variant='secondary'>
										{formatLeaveDays(
											request.start_date,
											request.end_date,
											request.half_day
										)}
										{request.half_day &&
											request.half_day_period &&
											` (${request.half_day_period ===
												"first_half"
												? "9am-1pm"
												: "1pm-7pm"
											})`}
									</Badge>
								</TableCell>
								<TableCell className='min-w-[200px] max-w-[400px] text-sm text-foreground'>
									<ExpandableReason reason={request.reason || ""} />
								</TableCell>
								<TableCell>
									{request.document_url ? (
										<Button
											variant='outline'
											size='sm'
											asChild
											className='h-8'>
											<a
												href={request.document_url}
												target='_blank'
												rel='noopener noreferrer'>
												<ExternalLink className='mr-1.5 h-3.5 w-3.5' />
												View
											</a>
										</Button>
									) : (
										<span className='text-muted-foreground text-sm'>
											—
										</span>
									)}
								</TableCell>
								<TableCell>
									{getStatusBadge(request.status)}
								</TableCell>
								{showActions && (
									<TableCell>
										{request.status === "pending" &&
											canApproveLeave && (
												<div className='flex gap-2'>
													<Button
														size='sm'
														variant='outline'
														className='h-8 bg-transparent'
														onClick={() =>
															handleLeaveAction(
																request.id,
																"rejected"
															)
														}>
														<XCircle className='h-4 w-4' />
													</Button>
													<Button
														size='sm'
														className='h-8'
														onClick={() =>
															handleLeaveAction(
																request.id,
																"approved"
															)
														}>
														<CheckCircle2 className='h-4 w-4' />
													</Button>
												</div>
											)}
									</TableCell>
								)}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);

	return (
		<div className='flex flex-col min-h-screen bg-background'>
			<DashboardHeader
				title='Leave Management'
				description='Manage employee leave requests'
			/>

			<div className='flex-1 p-4 md:p-6 pb-20 md:pb-8 space-y-5'>
				<Tabs defaultValue='requests' className='space-y-5'>
					{/* ── Top-level Tab Pills ── */}
					<TabsList className='h-auto bg-muted/40 p-1 rounded-xl gap-1 border border-border/50'>
						<TabsTrigger
							value='requests'
							className='gap-2 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all'>
							<CalendarCheck className='h-4 w-4 shrink-0' />
							<span className='truncate'>Leave Requests</span>
							{stats.pending > 0 && (
								<span className='ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-bold'>
									{stats.pending}
								</span>
							)}
						</TabsTrigger>
						<TabsTrigger
							value='allotment'
							className='gap-2 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all'>
							<CalendarDays className='h-4 w-4 shrink-0' />
							<span className='truncate'>Allotment & Leave Types</span>
						</TabsTrigger>
						<TabsTrigger
							value='report'
							className='gap-2 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all'>
							<FileDown className='h-4 w-4 shrink-0' />
							<span className='truncate'>Download Report</span>
						</TabsTrigger>
					</TabsList>
					<TabsContent value='requests' className='space-y-5'>
						{/* ── Stat Cards ── */}
						<div className='grid gap-4 grid-cols-2 md:grid-cols-4'>
							{/* Pending */}
							<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-border/50 p-5 shadow-sm hover:shadow-md transition-all group'>
								<div className='flex items-start justify-between gap-3'>
									<div>
										<p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Pending</p>
										<p className='text-4xl font-bold mt-2 tabular-nums text-amber-700 leading-none'>{stats.pending}</p>
										<p className='text-[11px] text-muted-foreground mt-1.5'>Awaiting review</p>
									</div>
									<div className='h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform'><Clock className='h-5 w-5' /></div>
								</div>
								<div className='mt-4 h-1 w-full bg-black/5 rounded-full overflow-hidden'><div className='h-full bg-amber-500 rounded-full transition-all duration-700' style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }} /></div>
							</div>
							{/* Approved */}
							<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-border/50 p-5 shadow-sm hover:shadow-md transition-all group'>
								<div className='flex items-start justify-between gap-3'>
									<div>
										<p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Approved</p>
										<p className='text-4xl font-bold mt-2 tabular-nums text-emerald-700 leading-none'>{stats.approved}</p>
										<p className='text-[11px] text-muted-foreground mt-1.5'>Granted leaves</p>
									</div>
									<div className='h-11 w-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform'><CheckCircle2 className='h-5 w-5' /></div>
								</div>
								<div className='mt-4 h-1 w-full bg-black/5 rounded-full overflow-hidden'><div className='h-full bg-emerald-500 rounded-full transition-all duration-700' style={{ width: `${stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}%` }} /></div>
							</div>
							{/* Rejected */}
							<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-border/50 p-5 shadow-sm hover:shadow-md transition-all group'>
								<div className='flex items-start justify-between gap-3'>
									<div>
										<p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Rejected</p>
										<p className='text-4xl font-bold mt-2 tabular-nums text-red-700 leading-none'>{stats.rejected}</p>
										<p className='text-[11px] text-muted-foreground mt-1.5'>Declined requests</p>
									</div>
									<div className='h-11 w-11 rounded-xl bg-red-500/15 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform'><XCircle className='h-5 w-5' /></div>
								</div>
								<div className='mt-4 h-1 w-full bg-black/5 rounded-full overflow-hidden'><div className='h-full bg-red-500 rounded-full transition-all duration-700' style={{ width: `${stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0}%` }} /></div>
							</div>
							{/* Total */}
							<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-border/50 p-5 shadow-sm hover:shadow-md transition-all group'>
								<div className='flex items-start justify-between gap-3'>
									<div>
										<p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Total</p>
										<p className='text-4xl font-bold mt-2 tabular-nums text-primary leading-none'>{stats.total}</p>
										<p className='text-[11px] text-muted-foreground mt-1.5'>All requests</p>
									</div>
									<div className='h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary group-hover:scale-110 transition-transform'><CalendarDays className='h-5 w-5' /></div>
								</div>
								<div className='mt-4 h-1 w-full bg-black/5 rounded-full overflow-hidden'><div className='h-full bg-primary rounded-full' style={{ width: '100%' }} /></div>
							</div>
						</div>

						{/* ── Filters ── */}
						<div className='bg-card rounded-2xl border border-border/50 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4'>
							<div className='relative flex-1 min-w-[200px]'>
								<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
								<Input
									placeholder='Search employees...'
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className='pl-9 rounded-xl h-10 bg-background border-border/70'
								/>
							</div>
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className='w-[150px] rounded-xl h-10'>
									<SelectValue placeholder='Filter status' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All Status</SelectItem>
									<SelectItem value='pending'>Pending</SelectItem>
									<SelectItem value='approved'>Approved</SelectItem>
									<SelectItem value='rejected'>Rejected</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* ── Inner Tabs: Pending / All ── */}
						<Tabs defaultValue='pending' className='space-y-4'>
							<TabsList className='h-auto bg-muted/40 p-1 rounded-xl gap-1 border border-border/50'>
								<TabsTrigger value='pending' className='gap-1.5 rounded-lg px-4 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm'>
									<Clock className='h-3.5 w-3.5' />
									Pending ({stats.pending})
								</TabsTrigger>
								<TabsTrigger value='all' className='gap-1.5 rounded-lg px-4 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm'>
									<CalendarCheck className='h-3.5 w-3.5' />
									All Requests
								</TabsTrigger>
							</TabsList>

							<TabsContent value='pending'>
								<div className='bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden'>
									<div className='flex items-center gap-3 px-5 py-4 border-b border-border/50'>
										<div className='h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600'><Calendar className='h-4 w-4' /></div>
										<div>
											<p className='font-semibold text-sm'>Pending Leave Requests</p>
											<p className='text-xs text-muted-foreground'>{getFilteredRequests("pending").length} request{getFilteredRequests("pending").length !== 1 ? 's' : ''} waiting</p>
										</div>
									</div>
									{isLoading ? (
										<div className='flex items-center justify-center py-12'><div className='h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin' /></div>
									) : renderLeaveTable(getFilteredRequests("pending"), true)}
								</div>
							</TabsContent>

							<TabsContent value='all'>
								<div className='bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden'>
									<div className='flex items-center gap-3 px-5 py-4 border-b border-border/50'>
										<div className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary'><Calendar className='h-4 w-4' /></div>
										<div>
											<p className='font-semibold text-sm'>All Leave Requests</p>
											<p className='text-xs text-muted-foreground'>{getFilteredRequests().length} total record{getFilteredRequests().length !== 1 ? 's' : ''}</p>
										</div>
									</div>
									{isLoading ? (
										<div className='flex items-center justify-center py-12'><div className='h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin' /></div>
									) : renderLeaveTable(getFilteredRequests())}
								</div>
							</TabsContent>
						</Tabs>
					</TabsContent>

					{/* ── Download Report Tab ── */}
					<TabsContent value='report' className='space-y-5'>

						{/* Hero banner */}
						<div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white px-6 py-5 shadow-md'>
							<div className='pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5' />
							<div className='pointer-events-none absolute right-10 bottom-0 h-24 w-24 rounded-full bg-white/5' />
							<div className='relative flex items-center justify-between gap-4'>
								<div>
									<div className='flex items-center gap-2 mb-1'>
										<FileDown className='h-4 w-4 opacity-80' />
										<span className='text-xs font-semibold uppercase tracking-wider opacity-75'>Leave Report Download</span>
									</div>
									<h2 className='text-xl font-bold'>Export Employee Leave Data</h2>
									<p className='text-sm opacity-70 mt-0.5'>Filter by employee, status & date range · Download as CSV</p>
								</div>
								<div className='hidden sm:flex items-center gap-3'>
									<div className='text-right'>
										<p className='text-xs opacity-70'>Matched Records</p>
										<p className='text-3xl font-bold tabular-nums'>{reportRows.length}</p>
									</div>
								</div>
							</div>
						</div>

						{/* Filters card */}
						<div className='bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden'>
							<div className='flex items-center gap-3 px-5 py-4 border-b border-border/50'>
								<div className='h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary'>
									<Search className='h-4 w-4' />
								</div>
								<div>
									<p className='font-semibold text-sm'>Filter Report</p>
									<p className='text-xs text-muted-foreground'>Narrow down by employee, status or date range</p>
								</div>
							</div>
							<div className='p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
								{/* Employee search */}
								<div className='space-y-1.5'>
									<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Employee</label>
									<Select value={reportEmployeeId} onValueChange={setReportEmployeeId}>
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
								{/* Status */}
								<div className='space-y-1.5'>
									<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Status</label>
									<Select value={reportStatus} onValueChange={setReportStatus}>
										<SelectTrigger className='h-10 rounded-xl'>
											<SelectValue placeholder='All Status' />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='all'>All Status</SelectItem>
											<SelectItem value='pending'>Pending</SelectItem>
											<SelectItem value='approved'>Approved</SelectItem>
											<SelectItem value='rejected'>Rejected</SelectItem>
										</SelectContent>
									</Select>
								</div>
								{/* Date From */}
								<div className='space-y-1.5'>
									<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>From Date</label>
									<Input
										type='date'
										value={reportDateFrom}
										onChange={(e) => setReportDateFrom(e.target.value)}
										className='h-10 rounded-xl'
									/>
								</div>
								{/* Date To */}
								<div className='space-y-1.5'>
									<label className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>To Date</label>
									<Input
										type='date'
										value={reportDateTo}
										onChange={(e) => setReportDateTo(e.target.value)}
										className='h-10 rounded-xl'
									/>
								</div>
							</div>
							{/* Reset + Name Search */}
							<div className='px-5 pb-5 flex flex-wrap items-center gap-3'>
								<div className='relative flex-1 min-w-[200px]'>
									<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
									<Input
										placeholder='Search employee name...'
										value={reportSearch}
										onChange={(e) => setReportSearch(e.target.value)}
										className='pl-9 h-10 rounded-xl'
									/>
								</div>
								<button
									type='button'
									onClick={() => { setReportEmployeeId("all"); setReportStatus("all"); setReportDateFrom(""); setReportDateTo(""); setReportSearch(""); }}
									className='h-10 px-4 rounded-xl text-xs font-semibold border border-border bg-background text-muted-foreground hover:bg-muted transition-colors cursor-pointer'>
									Reset Filters
								</button>
							</div>
						</div>

						{/* Summary mini-stats */}
						<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
							{[
								{ label: "Total", value: reportRows.length, color: "text-primary", bg: "from-primary/10 to-primary/5", bar: "bg-primary" },
								{ label: "Approved", value: reportRows.filter((r) => r.status === "approved").length, color: "text-emerald-700", bg: "from-emerald-500/10 to-emerald-500/5", bar: "bg-emerald-500" },
								{ label: "Pending", value: reportRows.filter((r) => r.status === "pending").length, color: "text-amber-700", bg: "from-amber-500/10 to-amber-500/5", bar: "bg-amber-500" },
								{ label: "Rejected", value: reportRows.filter((r) => r.status === "rejected").length, color: "text-red-700", bg: "from-red-500/10 to-red-500/5", bar: "bg-red-500" },
							].map((s) => (
								<div key={s.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.bg} border border-border/50 p-4 shadow-sm`}>
									<p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>{s.label}</p>
									<p className={`text-3xl font-bold mt-1.5 tabular-nums leading-none ${s.color}`}>{s.value}</p>
									<div className='mt-3 h-1 w-full bg-black/5 rounded-full overflow-hidden'>
										<div className={`h-full ${s.bar} rounded-full transition-all duration-700`} style={{ width: `${reportRows.length > 0 ? (s.value / reportRows.length) * 100 : 0}%` }} />
									</div>
								</div>
							))}
						</div>

						{/* Preview table + Download button */}
						<div className='bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden'>
							<div className='flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50'>
								<div className='flex items-center gap-3'>
									<div className='h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600'>
										<CalendarCheck className='h-4 w-4' />
									</div>
									<div>
										<p className='font-semibold text-sm'>Report Preview</p>
										<p className='text-xs text-muted-foreground'>{reportRows.length} record{reportRows.length !== 1 ? "s" : ""} matched · CSV will include all columns</p>
									</div>
								</div>
								<button
									type='button'
									onClick={downloadCSV}
									disabled={reportRows.length === 0}
									className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm'>
									<Download className='h-4 w-4' />
									Download CSV
								</button>
							</div>

							{reportRows.length === 0 ? (
								<div className='flex flex-col items-center justify-center py-16 text-center'>
									<div className='h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-3'>
										<FileDown className='h-7 w-7 text-muted-foreground/40' />
									</div>
									<p className='text-sm font-medium text-foreground'>No records match your filters</p>
									<p className='text-xs text-muted-foreground mt-1 max-w-xs'>Try adjusting the employee, status, or date range to see results.</p>
								</div>
							) : (
								<div className='overflow-x-auto'>
									<Table>
										<TableHeader>
											<TableRow className='bg-muted/30'>
												<TableHead className='font-semibold'>Employee</TableHead>
												<TableHead className='font-semibold'>Leave Type</TableHead>
												<TableHead className='font-semibold'>Duration</TableHead>
												<TableHead className='font-semibold'>Days</TableHead>
												<TableHead className='font-semibold'>Reason</TableHead>
												<TableHead className='font-semibold'>Status</TableHead>
												<TableHead className='font-semibold'>Applied On</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{reportRows.map((req) => (
												<TableRow
													key={req.id}
													className={`border-l-2 ${
														req.status === "approved" ? "border-l-emerald-400"
														: req.status === "rejected" ? "border-l-red-400"
														: "border-l-amber-400"
													}`}>
													<TableCell>
														<div className='flex items-center gap-2.5'>
															<Avatar className='h-8 w-8 shrink-0'>
																{req.employee?.avatar_url && (
																	<AvatarImage src={req.employee.avatar_url} className='object-cover' alt='' />
																)}
																<AvatarFallback className='text-xs bg-muted'>
																	{req.employee?.first_name?.[0]}{req.employee?.last_name?.[0]}
																</AvatarFallback>
															</Avatar>
															<div>
																<p className='font-medium text-sm'>{req.employee?.first_name} {req.employee?.last_name}</p>
																<p className='text-xs text-muted-foreground'>{req.employee?.designation ?? req.employee?.email}</p>
															</div>
														</div>
													</TableCell>
													<TableCell>
														<span className='inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs font-medium border border-border/60'>
															{(req.leave_type as { name?: string })?.name ?? "—"}
														</span>
													</TableCell>
													<TableCell className='text-sm'>
														<div className='flex flex-col'>
															<span>{new Date(req.start_date).toLocaleDateString()}</span>
															<span className='text-xs text-muted-foreground'>to {new Date(req.end_date).toLocaleDateString()}</span>
														</div>
													</TableCell>
													<TableCell>
														<span className='inline-flex px-2 py-0.5 rounded-md bg-muted/60 text-xs font-semibold border border-border/50'>
															{formatLeaveDays(req.start_date, req.end_date, req.half_day)}
														</span>
													</TableCell>
													<TableCell className='min-w-[200px] max-w-[300px] text-sm text-foreground'>
														<ExpandableReason reason={req.reason || ""} />
													</TableCell>
													<TableCell>{getStatusBadge(req.status)}</TableCell>
													<TableCell className='text-xs text-muted-foreground'>
														{req.created_at ? new Date(req.created_at).toLocaleDateString() : "—"}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</div>
					</TabsContent>

					<TabsContent value='allotment' className='space-y-5'>
						{/* ── Leave Types Card ── */}
						<div className='bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden'>
							<div className='flex items-center justify-between px-5 py-4 border-b border-border/50'>
								<div className='flex items-center gap-3'>
									<div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary'><CalendarDays className='h-5 w-5' /></div>
									<div>
										<p className='font-semibold text-sm text-foreground'>Leave Types</p>
										<p className='text-xs text-muted-foreground'>Configure leave types available to all employees.</p>
									</div>
								</div>
								{canApproveLeave && (
									<Button size='sm' className='rounded-xl gap-1.5 h-9 px-4' onClick={openCreateLeaveType}>
										<CalendarDays className='h-3.5 w-3.5' />
										Add Leave Type
									</Button>
								)}
							</div>
							<div className='p-5'>
								{leaveTypes.length === 0 ? (
									<div className='flex flex-col items-center justify-center py-10 text-center rounded-xl bg-muted/20'>
										<CalendarDays className='h-10 w-10 text-muted-foreground/40 mb-3' />
										<p className='text-sm font-medium'>No leave types defined yet.</p>
									</div>
								) : (
									<div className='grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5'>
										{leaveTypes.map((type) => (
											<div key={type.id} className='relative overflow-hidden rounded-2xl border border-border/60 bg-background hover:shadow-md hover:border-primary/30 transition-all group flex flex-col'>
												{/* Color accent bar */}
												<div className='h-1 w-full bg-gradient-to-r from-primary to-indigo-500 rounded-t-2xl' />
												<div className='p-4 flex-1 flex flex-col items-center text-center gap-1'>
													<h4 className='font-semibold text-sm truncate w-full'>{type.name}</h4>
													<p className='text-4xl font-bold text-primary mt-1 leading-none'>{type.default_days}</p>
													<p className='text-xs text-muted-foreground'>days / year</p>
													{type.description && (
														<p className='mt-1.5 text-[11px] text-muted-foreground line-clamp-2'>{type.description}</p>
													)}
												</div>
												{canApproveLeave && (
													<div className='flex justify-center gap-1.5 px-3 py-2.5 border-t border-border/50 bg-muted/20'>
														<button onClick={() => openEditLeaveType(type)} className='flex-1 text-xs font-semibold py-1.5 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer'>Edit</button>
														<button onClick={() => handleDeleteLeaveType(type)} className='flex-1 text-xs font-semibold py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer'>Delete</button>
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						</div>

						{/* Total Leaves (Allotted by Employee) - MOVED TO BOTTOM */}
						<Card>
							<CardHeader className='flex flex-row items-center justify-between'>
								<CardTitle className='text-base'>
									Total Leaves (Allotted by Employee)
								</CardTitle>
								{canApproveLeave && (
									<Button
										size='sm'
										onClick={() => openAllotDialog()}>
										<CalendarDays className='mr-2 h-4 w-4' />
										Allot Leaves
									</Button>
								)}
							</CardHeader>
							<CardContent className='space-y-4'>
								{/* Search Box */}
								{leaveBalanceGroups.length > 0 && (
									<div className='relative'>
										<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
										<Input
											placeholder='Search employees...'
											value={employeeLeaveSearch}
											onChange={(e) =>
												setEmployeeLeaveSearch(e.target.value)
											}
											className='pl-9'
										/>
									</div>
								)}

								{leaveBalanceGroups.length === 0 ? (
									<p className='text-sm text-muted-foreground'>
										No leave balances yet. Allot leaves to
										employees above.
									</p>
								) : (
									<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
										{leaveBalanceGroups
											.filter((group) => {
												const name =
													group.employee
														?.first_name &&
														group.employee
															?.last_name
														? `${group.employee.first_name} ${group.employee.last_name}`
														: group.employee_id;
												return name
													.toLowerCase()
													.includes(
														employeeLeaveSearch.toLowerCase()
													);
											})
											.map((group) => {
												const name =
													group.employee
														?.first_name &&
														group.employee
															?.last_name
														? `${group.employee.first_name} ${group.employee.last_name}`
														: group.employee_id;
												return (
													<Card key={`${group.employee_id}-${group.year}`} className='overflow-hidden border border-border/50 hover:shadow-md transition-shadow'>
														<CardContent className='p-3 space-y-3'>
															{/* Employee Header */}
															<div className='pb-2 border-b border-border/50'>
																<h4 className='font-semibold text-sm truncate'>
																	{name}
																</h4>
																<p className='text-xs text-muted-foreground'>
																	Year: {group.year}
																</p>
															</div>

															{/* Allocated Leaves */}
															<div className='space-y-1.5'>
																<p className='text-[10px] uppercase tracking-wide text-muted-foreground font-medium'>Allocated Leaves</p>
																<div className='space-y-1.5 flex flex-wrap gap-2'>
																	{group.balances.map(
																		(
																			bal
																		) => {
																			const remaining =
																				bal.total_days -
																				bal.used_days;
																			const typeName =
																				(
																					bal.leave_type as LeaveType
																				)
																					?.name ??
																				"Leave";
																			return (
																				<div
																					key={
																						bal.id
																					}
																					className='flex items-center justify-between py-1 px-3 rounded-full border gap-2'>
																					<div className='flex-1 min-w-0'>
																						<p className='text-xs font-medium truncate'>
																							{typeName}
																						</p>
																						{/* <p className='text-[10px] text-muted-foreground'>
																							{formatRemainingDays(
																								remaining
																							)}{" "}
																							remaining
																						</p> */}
																					</div>
																					<div className='text-right'>
																						<p className='text-base font-bold text-primary'>
																							{formatRemainingDays(
																								remaining
																							)}
																						</p>
																						{/* <p className='text-[9px] text-muted-foreground'>
																							of {bal.total_days}
																						</p> */}
																					</div>
																				</div>
																			);
																		}
																	)}
																</div>
															</div>

															{/* Actions */}
															{canApproveLeave && (
																<div className='flex gap-1.5 pt-2 border-t border-border/50'>
																	<Button
																		size='sm'
																		variant='outline'
																		className='flex-1 h-7 text-xs'
																		onClick={() =>
																			openAllotDialog(
																				group.employee_id,
																				group.year
																			)
																		}>
																		Edit
																	</Button>
																	<Button
																		size='sm'
																		variant='ghost'
																		className='flex-1 h-7 text-xs text-destructive hover:text-destructive'
																		onClick={() =>
																			handleDeleteBalanceGroup(
																				group.employee_id,
																				group.year,
																				name
																			)
																		}>
																		Delete
																	</Button>
																</div>
															)}
														</CardContent>
													</Card>
												);
											})}
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				{/* Allot Leaves Dialog */}
				{canApproveLeave && (
					<Dialog open={isAllotOpen} onOpenChange={setIsAllotOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Allot Leaves</DialogTitle>
								<DialogDescription>
									Set or update leave type balances for one or
									more employees for a year.
								</DialogDescription>
							</DialogHeader>
							<form
								onSubmit={handleAllotLeave}
								className='space-y-4'>
								<div className='space-y-2'>
									<Label>Employees</Label>
									<div className='rounded-md border border-border bg-muted/30'>
										<div className='flex items-center gap-2 border-b border-border px-3 py-2'>
											<Search className='h-4 w-4 shrink-0 text-muted-foreground' />
											<Input
												placeholder='Search and select employee(s)...'
												value={allotEmployeeSearch}
												onChange={(e) =>
													setAllotEmployeeSearch(
														e.target.value
													)
												}
												className='h-9 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0'
											/>
										</div>
										<div className='max-h-44 overflow-y-auto p-1'>
											{employees
												.filter(
													(emp) =>
														!allotEmployeeSearch.trim() ||
														`${emp.first_name ?? ""
															} ${emp.last_name ?? ""
															} ${emp.email ?? ""}`
															.toLowerCase()
															.includes(
																allotEmployeeSearch.toLowerCase()
															)
												)
												.map((emp) => {
													const selected =
														allotForm.employee_ids.includes(
															emp.id
														);
													return (
														<button
															key={emp.id}
															type='button'
															onClick={() =>
																setAllotForm(
																	(f) => ({
																		...f,
																		employee_ids:
																			selected
																				? f.employee_ids.filter(
																					(
																						id
																					) =>
																						id !==
																						emp.id
																				)
																				: [
																					...f.employee_ids,
																					emp.id,
																				],
																	})
																)
															}
															className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${selected
																? "bg-primary/15 text-primary"
																: "hover:bg-muted/80"
																}`}>
															<span
																className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected
																	? "border-primary bg-primary"
																	: "border-muted-foreground"
																	}`}>
																{selected && (
																	<CheckCircle2 className='h-3 w-3 text-primary-foreground' />
																)}
															</span>
															<span className='truncate'>
																{emp.first_name}{" "}
																{emp.last_name}
															</span>
															{emp.email && (
																<span className='truncate text-xs text-muted-foreground'>
																	{emp.email}
																</span>
															)}
														</button>
													);
												})}
										</div>
									</div>
									{allotForm.employee_ids.length > 0 && (
										<div className='flex flex-wrap gap-1.5'>
											{allotForm.employee_ids.map(
												(id) => {
													const emp = employees.find(
														(e) => e.id === id
													);
													if (!emp) return null;
													return (
														<Badge
															key={id}
															variant='secondary'
															className='gap-1 pr-1'>
															{emp.first_name}{" "}
															{emp.last_name}
															<button
																type='button'
																onClick={() =>
																	setAllotForm(
																		(
																			f
																		) => ({
																			...f,
																			employee_ids:
																				f.employee_ids.filter(
																					(
																						eid
																					) =>
																						eid !==
																						id
																				),
																		})
																	)
																}
																className='ml-0.5 rounded-full p-0.5 hover:bg-muted'>
																<XCircle className='h-3 w-3' />
															</button>
														</Badge>
													);
												}
											)}
										</div>
									)}
								</div>
								<div className='space-y-2'>
									<Label>Year</Label>
									<Input
										type='number'
										min={new Date().getFullYear() - 1}
										max={new Date().getFullYear() + 1}
										value={allotForm.year}
										onChange={(e) =>
											setAllotForm((f) => ({
												...f,
												year:
													parseInt(
														e.target.value,
														10
													) ||
													new Date().getFullYear(),
											}))
										}
									/>
								</div>
								<div className='space-y-2'>
									<Label>Leave Types &amp; Total Days</Label>
									<div className='max-h-64 space-y-3 overflow-y-auto pr-1'>
										{leaveTypes.map((t) => {
											const existingBalance =
												allotForm.employee_ids
													.length === 1
													? leaveBalances.find(
														(b) =>
															b.employee_id ===
															allotForm
																.employee_ids[0] &&
															b.year ===
															allotForm.year &&
															b.leave_type_id ===
															t.id
													)
													: null;
											const totalEntered = parseFloat(
												String(
													allotForm.daysByType[
													t.id
													] ?? ""
												).trim()
											);
											const totalDays = Number.isFinite(
												totalEntered
											)
												? totalEntered
												: Number(
													existingBalance?.total_days ??
													0
												);
											const usedDays = Number(
												existingBalance?.used_days ?? 0
											);
											const remaining =
												Math.round(
													(totalDays - usedDays) * 100
												) / 100;
											return (
												<div
													key={t.id}
													className='flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2'>
													<div className='flex-1 min-w-0'>
														<p className='text-sm font-medium truncate'>
															{t.name}
														</p>
														<p className='text-[11px] text-muted-foreground'>
															Default{" "}
															{t.default_days}{" "}
															days/year
															{allotForm
																.employee_ids
																.length === 1 &&
																(existingBalance !=
																	null ||
																	allotForm
																		.daysByType[
																	t.id
																	]) && (
																	<>
																		{" · "}
																		Remaining:{" "}
																		{formatRemainingDays(
																			remaining
																		)}
																	</>
																)}
														</p>
													</div>
													<Input
														type='number'
														min={0}
														step='0.5'
														className='w-24'
														value={
															allotForm
																.daysByType[
															t.id
															] ?? ""
														}
														onChange={(e) =>
															setAllotForm(
																(f) => ({
																	...f,
																	daysByType:
																	{
																		...f.daysByType,
																		[t.id]:
																			e
																				.target
																				.value,
																	},
																})
															)
														}
														placeholder='0'
													/>
												</div>
											);
										})}
									</div>
									<p className='text-[11px] text-muted-foreground'>
										Leave blank to skip a leave type.
									</p>
								</div>
								{allotError && (
									<p className='text-sm text-destructive'>
										{allotError}
									</p>
								)}
								<div className='flex justify-end gap-2'>
									<Button
										type='button'
										variant='outline'
										onClick={() => setIsAllotOpen(false)}>
										Cancel
									</Button>
									<Button
										type='submit'
										disabled={
											allotLoading ||
											allotForm.employee_ids.length === 0
										}>
										{allotLoading ? "Saving..." : "Allot"}
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				)}

				{/* Leave Type Add / Edit Dialog */}
				{canApproveLeave && (
					<Dialog
						open={isTypeDialogOpen}
						onOpenChange={setIsTypeDialogOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{typeForm.id
										? "Edit Leave Type"
										: "Add Leave Type"}
								</DialogTitle>
								<DialogDescription>
									Set up leave types that can be allotted to
									all employees.
								</DialogDescription>
							</DialogHeader>
							<form
								onSubmit={handleSaveLeaveType}
								className='space-y-4'>
								<div className='space-y-2'>
									<Label htmlFor='lt-name'>Name</Label>
									<Input
										id='lt-name'
										value={typeForm.name}
										onChange={(e) =>
											setTypeForm((f) => ({
												...f,
												name: e.target.value,
											}))
										}
										placeholder='e.g. Casual Leave'
										required
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='lt-days'>
										Default Days / Year
									</Label>
									<Input
										id='lt-days'
										type='number'
										min={0}
										value={typeForm.default_days}
										onChange={(e) =>
											setTypeForm((f) => ({
												...f,
												default_days: e.target.value,
											}))
										}
										placeholder='e.g. 12'
										required
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='lt-desc'>
										Description (optional)
									</Label>
									<Textarea
										id='lt-desc'
										value={typeForm.description}
										onChange={(e) =>
											setTypeForm((f) => ({
												...f,
												description: e.target.value,
											}))
										}
										placeholder='Short description visible to admins.'
									/>
								</div>
								{typeError && (
									<p className='text-sm text-destructive'>
										{typeError}
									</p>
								)}
								<div className='flex justify-end gap-2'>
									<Button
										type='button'
										variant='outline'
										onClick={() =>
											setIsTypeDialogOpen(false)
										}>
										Cancel
									</Button>
									<Button
										type='submit'
										disabled={isSavingType}>
										{isSavingType
											? "Saving..."
											: typeForm.id
												? "Update Type"
												: "Create Type"}
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				)}
			</div>
		</div >
	);
}
