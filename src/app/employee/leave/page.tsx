"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
	Plus,
	Calendar,
	Pencil,
	Upload,
	ExternalLink,
	Loader2,
	Minus,
	Clock,
	CheckCircle2,
	XCircle,
	CalendarDays,
	AlertCircle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUser } from "../../../contexts/user-context";
import { toast } from "react-hot-toast";
import type { LeaveRequest, LeaveType, LeaveBalance, LeaveDeduction } from "@/lib/types";

const BUCKET = "employee-documents";

interface LeaveRequestWithType extends LeaveRequest {
	leave_type?: LeaveType;
}

interface LeaveBalanceWithType extends LeaveBalance {
	leave_type?: LeaveType;
}

function calcDays(
	start: string,
	end: string,
	halfDay?: boolean | null
): number {
	if (halfDay) return 1; // Half-day leave consumes 1 full day from leave balance
	const s = new Date(start);
	const e = new Date(end);
	return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function formatLeaveDays(
	start: string,
	end: string,
	halfDay?: boolean | null
): string {
	if (halfDay) return "half day";
	const days = calcDays(start, end, halfDay);
	return `${Math.round(days)} day${days !== 1 ? "s" : ""}`;
}

function isMedicalLeave(type?: LeaveType | null): boolean {
	const n = (type?.name ?? "").toLowerCase();
	return n.includes("sick") || n.includes("medical");
}

const emptyForm = () => ({
	leave_type_id: "",
	start_date: "",
	end_date: "",
	reason: "",
	half_day: false,
	half_day_period: "" as "" | "first_half" | "second_half",
	document_url: null as string | null,
});

const getLeaveTheme = (name: string) => {
	const n = name.toLowerCase();
	if (n.includes("sick") || n.includes("medical")) {
		return {
			bg: "bg-rose-50/60 dark:bg-rose-950/20",
			border: "border-rose-100/50 dark:border-rose-900/30",
			text: "text-rose-600 dark:text-rose-400",
			progress: "bg-rose-500/60",
			iconBg: "bg-rose-100/50 dark:bg-rose-900/30",
		};
	}
	if (n.includes("casual")) {
		return {
			bg: "bg-amber-50/60 dark:bg-amber-950/20",
			border: "border-amber-100/50 dark:border-amber-900/30",
			text: "text-amber-600 dark:text-amber-400",
			progress: "bg-amber-500/60",
			iconBg: "bg-amber-100/50 dark:bg-amber-900/30",
		};
	}
	if (n.includes("earned") || n.includes("privilege") || n.includes("annual")) {
		return {
			bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
			border: "border-emerald-100/50 dark:border-emerald-900/30",
			text: "text-emerald-600 dark:text-emerald-450",
			progress: "bg-emerald-500/60",
			iconBg: "bg-emerald-100/50 dark:bg-emerald-900/30",
		};
	}
	return {
		bg: "bg-blue-50/60 dark:bg-blue-950/20",
		border: "border-blue-100/50 dark:border-blue-900/30",
		text: "text-blue-600 dark:text-blue-400",
		progress: "bg-blue-500/60",
		iconBg: "bg-blue-100/50 dark:bg-blue-900/30",
	};
};

export default function EmployeeLeavePage() {
	const { employee } = useUser();
	const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithType[]>(
		[]
	);
	const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
	const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceWithType[]>(
		[]
	);
	const [leaveDeductions, setLeaveDeductions] = useState<(LeaveDeduction & {
		leave_type?: LeaveType;
		deductor?: { first_name: string; last_name: string };
	})[]>([]);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingRequest, setEditingRequest] =
		useState<LeaveRequestWithType | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [docUploading, setDocUploading] = useState(false);
	const docInputRef = useRef<HTMLInputElement>(null);
	const currentYear = new Date().getFullYear();

	const [formData, setFormData] = useState(emptyForm());

	useEffect(() => {
		if (employee) fetchData();
	}, [employee]);

	const fetchData = async () => {
		if (!employee) return;
		const supabase = createClient();

		const { data: requestsData } = await supabase
			.from("leave_requests")
			.select("*, leave_type:leave_types(*)")
			.eq("employee_id", employee.id)
			.order("created_at", { ascending: false });

		const { data: typesData } = await supabase
			.from("leave_types")
			.select("*")
			.eq("is_active", true);

		const { data: balancesData } = await supabase
			.from("leave_balances")
			.select("*, leave_type:leave_types(*)")
			.eq("employee_id", employee.id)
			.eq("year", currentYear);

		const { data: deductionsData } = await supabase
			.from("leave_deductions")
			.select("*, leave_type:leave_types(*), deducted_by:deducted_by!inner(first_name, last_name)")
			.eq("employee_id", employee.id)
			.order("deduction_date", { ascending: false });

		setLeaveRequests(
			(requestsData as unknown as LeaveRequestWithType[]) || []
		);
		setLeaveTypes(typesData || []);
		setLeaveBalances(
			(balancesData as unknown as LeaveBalanceWithType[]) || []
		);

		const rawDeductions = (deductionsData || []) as Record<string, unknown>[];
		const deductions = rawDeductions.map((row) => ({
			...row,
			leave_type: row.leave_type,
			deductor: row.deducted_by,
		})) as (LeaveDeduction & {
			leave_type?: LeaveType;
			deductor?: { first_name: string; last_name: string };
		})[];
		setLeaveDeductions(deductions);

		setIsLoading(false);
	};

	// In the request dialog, only show leave types that are allotted to this employee
	// and have remaining balance (available to request). When editing a pending request,
	// include that request's leave type so the dropdown still shows the current selection.
	const requestableLeaveBalances = useMemo(() => {
		const withBalance = leaveBalances.filter((b) => {
			const rem = Number(b.total_days ?? 0) - Number(b.used_days ?? 0);
			return rem > 0 && b.leave_type != null;
		});
		if (editingRequest?.leave_type_id && editingRequest?.leave_type) {
			const alreadyIncluded = withBalance.some(
				(b) => b.leave_type_id === editingRequest.leave_type_id
			);
			if (!alreadyIncluded) {
				const balanceForEdit = leaveBalances.find(
					(b) => b.leave_type_id === editingRequest.leave_type_id
				);
				if (balanceForEdit) {
					return [balanceForEdit, ...withBalance];
				}
			}
		}
		return withBalance;
	}, [
		leaveBalances,
		editingRequest?.leave_type_id,
		editingRequest?.leave_type,
	]);

	const selectedType = leaveTypes.find(
		(t) => t.id === formData.leave_type_id
	);
	const selectedBalance = leaveBalances.find(
		(b) => b.leave_type_id === formData.leave_type_id
	);
	const remaining = selectedBalance
		? Number(selectedBalance.total_days ?? 0) -
		  Number(selectedBalance.used_days ?? 0)
		: 0;
	const requestDays =
		formData.start_date && formData.end_date
			? calcDays(
					formData.start_date,
					formData.end_date,
					formData.half_day
			  )
			: 0;
	const canSubmit =
		formData.leave_type_id &&
		formData.start_date &&
		formData.end_date &&
		requestDays > 0 &&
		requestDays <= remaining &&
		(!isMedicalLeave(selectedType) || !!formData.document_url);

	const openNewDialog = () => {
		setEditingRequest(null);
		setFormData(emptyForm());
		setIsDialogOpen(true);
	};

	const openEditDialog = (req: LeaveRequestWithType) => {
		if (req.status !== "pending") return;
		setEditingRequest(req);
		setFormData({
			leave_type_id: req.leave_type_id,
			start_date: req.start_date,
			end_date: req.end_date,
			reason: req.reason ?? "",
			half_day: !!req.half_day,
			half_day_period:
				(req.half_day_period as "first_half" | "second_half") || "",
			document_url: req.document_url ?? null,
		});
		setIsDialogOpen(true);
	};

	const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !employee) return;
		setDocUploading(true);
		const supabase = createClient();
		const ext = file.name.split(".").pop() || "pdf";
		const path = `${employee.id}/leave-${Date.now()}.${ext}`;
		const { error: upErr } = await supabase.storage
			.from(BUCKET)
			.upload(path, file, { upsert: true });
		if (upErr) {
			toast.error(upErr.message);
			setDocUploading(false);
			return;
		}
		const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
		setFormData((f) => ({ ...f, document_url: data.publicUrl }));
		setDocUploading(false);
		e.target.value = "";
	};

	const handleSubmit = async () => {
		if (!employee || !canSubmit) return;
		setSubmitting(true);
		const supabase = createClient();

		const payload = {
			employee_id: employee.id,
			leave_type_id: formData.leave_type_id,
			start_date: formData.start_date,
			end_date: formData.end_date,
			reason: formData.reason || null,
			half_day: formData.half_day || null,
			half_day_period:
				formData.half_day && formData.half_day_period
					? formData.half_day_period
					: null,
			document_url: formData.document_url || null,
		};

		if (editingRequest) {
			const { error } = await supabase
				.from("leave_requests")
				.update(payload)
				.eq("id", editingRequest.id)
				.eq("employee_id", employee.id)
				.eq("status", "pending");
			if (error) {
				toast.error(error.message);
			} else {
				toast.success("Leave request updated.");
				setIsDialogOpen(false);
				fetchData();
			}
		} else {
			const { error } = await supabase
				.from("leave_requests")
				.insert(payload);
			if (error) {
				toast.error(error.message);
			} else {
				toast.success("Leave request submitted.");
				setIsDialogOpen(false);
				setFormData(emptyForm());
				fetchData();
				// Notify admin & HR (fire-and-forget; does not block UI)
				const leaveTypeName =
					leaveTypes.find((t) => t.id === formData.leave_type_id)
						?.name ?? "Leave";
				fetch("/api/leave/notify", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						type: "new_request",
						employeeName:
							`${employee.first_name} ${employee.last_name}`.trim(),
						employeeEmail: employee.email,
						leaveTypeName,
						startDate: formData.start_date,
						endDate: formData.end_date,
						reason: formData.reason ?? "",
						halfDay: formData.half_day || null,
					}),
				}).catch(() => {});
			}
		}
		setSubmitting(false);
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "approved":
				return (
					<span className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 text-[10px] font-black uppercase tracking-wider border border-emerald-100/50 dark:border-emerald-900/30 shadow-[0_2px_8px_rgba(16,185,129,0.02)]'>
						<CheckCircle2 className='h-3 w-3' />
						Approved
					</span>
				);
			case "rejected":
				return (
					<span className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-455 text-[10px] font-black uppercase tracking-wider border border-rose-100/50 dark:border-rose-900/30 shadow-[0_2px_8px_rgba(244,63,94,0.02)]'>
						<XCircle className='h-3 w-3' />
						Rejected
					</span>
				);
			case "pending":
				return (
					<span className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-100/50 dark:border-amber-900/30 shadow-[0_2px_8px_rgba(245,158,11,0.02)]'>
						<Clock className='h-3 w-3' />
						Pending
					</span>
				);
			default:
				return <Badge variant='outline' className="text-[10px] font-black uppercase tracking-wider">{status}</Badge>;
		}
	};

	const filteredRequests = useMemo(
		() =>
			leaveRequests.filter(
				(r) => new Date(r.start_date).getFullYear() === currentYear
			),
		[leaveRequests, currentYear]
	);

	const employeeStats = useMemo(() => {
		const pending = filteredRequests.filter((r) => r.status === "pending").length;
		const approved = filteredRequests.filter((r) => r.status === "approved").length;
		const rejected = filteredRequests.filter((r) => r.status === "rejected").length;
		const deducted = leaveDeductions.length;
		return { pending, approved, rejected, deducted, total: filteredRequests.length + deducted };
	}, [filteredRequests, leaveDeductions]);

	return (
		<div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
			<DashboardHeader
				title='Leave Requests'
				description='Manage your leave applications'
			/>

			<div className='flex-1 space-y-6 p-6'>
				{/* ── Leave Balance Cards ── */}
				<div className='grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-5'>
					{leaveBalances.filter((b) => b.total_days > 0).length ===
					0 ? (
						<div className='col-span-full'>
							<div className='flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/10'>
								<CalendarDays className='h-10 w-10 text-slate-300 dark:text-slate-700 mb-3' />
								<p className='text-xs font-bold text-slate-450 uppercase tracking-wider'>No leave balance allotted for {currentYear}</p>
							</div>
						</div>
					) : (
						leaveBalances
							.filter((b) => b.total_days > 0)
							.map((balance) => {
								const remaining =
									balance.total_days - balance.used_days;
								const usedPct = balance.total_days > 0 ? (balance.used_days / balance.total_days) * 100 : 0;
								const theme = getLeaveTheme(balance.leave_type?.name ?? "");
								return (
									<div key={balance.id} className={`relative overflow-hidden rounded-2xl ${theme.bg} border ${theme.border} p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.02)] transition-all duration-305 group`}>
										<p className={`text-[10px] font-black uppercase tracking-wider ${theme.text}`}>{balance.leave_type?.name}</p>
										<p className='text-3xl font-black mt-2 tabular-nums text-slate-800 dark:text-white leading-none'>
											{remaining % 1 === 0 ? remaining : remaining.toFixed(1)}
										</p>
										<p className='text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5'>
											Allotted: {balance.total_days % 1 === 0 ? balance.total_days : balance.total_days.toFixed(1)} days
										</p>
										<div className='mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden'>
											<div className={`h-full ${theme.progress} rounded-full transition-all duration-700`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
										</div>
									</div>
								);
							})
					)}
				</div>

				{/* ── Stat Cards ── */}
				<div className='grid gap-4 grid-cols-2 md:grid-cols-5'>
					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition-all duration-300 group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500'>Pending</p>
								<p className='text-2xl font-black mt-2 tabular-nums text-slate-800 dark:text-white leading-none'>{employeeStats.pending}</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shadow-[0_2px_8px_rgba(245,158,11,0.05)] group-hover:scale-105 transition-transform'><Clock className='h-4.5 w-4.5' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition-all duration-300 group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500'>Approved</p>
								<p className='text-2xl font-black mt-2 tabular-nums text-slate-800 dark:text-white leading-none'>{employeeStats.approved}</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-[0_2px_8px_rgba(16,185,129,0.05)] group-hover:scale-105 transition-transform'><CheckCircle2 className='h-4.5 w-4.5' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition-all duration-300 group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500'>Rejected</p>
								<p className='text-2xl font-black mt-2 tabular-nums text-slate-800 dark:text-white leading-none'>{employeeStats.rejected}</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 text-rose-550 dark:text-rose-400 flex items-center justify-center shadow-[0_2px_8px_rgba(244,63,94,0.05)] group-hover:scale-105 transition-transform'><XCircle className='h-4.5 w-4.5' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition-all duration-300 group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500'>Deducted</p>
								<p className='text-2xl font-black mt-2 tabular-nums text-slate-800 dark:text-white leading-none'>{employeeStats.deducted}</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100/50 dark:border-orange-900/30 text-orange-550 dark:text-orange-400 flex items-center justify-center shadow-[0_2px_8px_rgba(249,115,22,0.05)] group-hover:scale-105 transition-transform'><Minus className='h-4.5 w-4.5' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition-all duration-300 group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500'>Total</p>
								<p className='text-2xl font-black mt-2 tabular-nums text-slate-800 dark:text-white leading-none'>{employeeStats.total}</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.05)] group-hover:scale-105 transition-transform'><CalendarDays className='h-4.5 w-4.5' /></div>
						</div>
					</div>
				</div>

				{/* ── Tabbed Section: Requests & Deductions ── */}
				<div className="w-full overflow-x-auto">
				<Tabs defaultValue='requests' className='w-full space-y-4'>
					<div className='flex flex-wrap items-center justify-between gap-2'>
						<TabsList className='h-auto bg-slate-100/60 dark:bg-slate-950/40 p-1 rounded-xl gap-1 border border-slate-200/40 dark:border-slate-850/40 flex-shrink-0'>
							<TabsTrigger value='requests' className='gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-800 dark:data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-slate-500 dark:text-slate-400 transition-all'>
								<Calendar className='h-3.5 w-3.5' />
								My Requests ({filteredRequests.length})
							</TabsTrigger>
							<TabsTrigger value='deductions' className='gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-800 dark:data-[state=active]:text-white data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-slate-500 dark:text-slate-400 transition-all'>
								<Minus className='h-3.5 w-3.5' />
								Deductions ({leaveDeductions.length})
							</TabsTrigger>
						</TabsList>
						<Dialog
							open={isDialogOpen}
							onOpenChange={setIsDialogOpen}>
							<DialogTrigger asChild>
								<Button size='sm' className='rounded-xl gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 shadow-[0_4px_12px_rgba(37,99,235,0.15)] active:scale-95 transition-all flex-shrink-0' onClick={openNewDialog}>
									<Plus className='h-4 w-4' />
									<span className='hidden sm:inline'>New Request</span>
								</Button>
							</DialogTrigger>
							<DialogContent className='max-h-[90vh] overflow-y-auto rounded-2xl border-slate-100 dark:border-slate-800/40'>
								<DialogHeader>
									<DialogTitle className="text-base font-black uppercase tracking-wider text-slate-850 dark:text-white">
										{editingRequest
											? "Edit Leave Request"
											: "Request Leave"}
									</DialogTitle>
									<DialogDescription className="text-xs text-slate-400 font-medium">
										{editingRequest
											? "Update your pending leave request details."
											: "Submit a new leave application for HR/Leader approval."}
									</DialogDescription>
								</DialogHeader>
								<div className='space-y-4 py-4'>
									<div className='space-y-2'>
										<Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Leave Type</Label>
										<Select
											value={formData.leave_type_id}
											onValueChange={(v) =>
												setFormData({
													...formData,
													leave_type_id: v,
													document_url: null,
												})
											}
											disabled={!!editingRequest}>
											<SelectTrigger className="rounded-xl border-slate-200/80 dark:border-slate-800 text-xs">
												<SelectValue placeholder='Select leave type' />
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												{requestableLeaveBalances.length ===
												0 ? (
													<div className='py-2 px-2 text-xs text-slate-400 font-bold'>
														No leave balance available.
													</div>
												) : (
													requestableLeaveBalances.map(
														(balance) => (
															<SelectItem
																key={
																	balance.leave_type_id
																}
																value={
																	balance.leave_type_id
																}
																className="text-xs rounded-lg">
																{balance.leave_type?.name ?? "—"} (
																{Number(balance.total_days ?? 0) - Number(balance.used_days ?? 0)} remaining)
															</SelectItem>
														)
													)
												)}
											</SelectContent>
										</Select>
									</div>

									{/* Half day: show when leave type selected */}
									{formData.leave_type_id && (
										<div className='space-y-2 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-850/50'>
											<div className='flex items-center gap-2'>
												<input
													type='checkbox'
													id='half_day'
													checked={
														formData.half_day
													}
													onChange={(e) => {
														const checked =
															e.target
																.checked;
														setFormData({
															...formData,
															half_day:
																checked,
															half_day_period:
																checked
																	? "first_half"
																	: "",
															end_date:
																checked &&
																formData.start_date
																	? formData.start_date
																	: formData.end_date,
														});
													}}
													className='rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500'
												/>
												<Label htmlFor='half_day' className="text-xs font-bold text-slate-650 dark:text-slate-350">
													Half day leave
												</Label>
											</div>
											{formData.half_day && (
												<div className='flex gap-4 pl-6 mt-1.5'>
													<label className='flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium'>
														<input
															type='radio'
															name='half_period'
															checked={
																formData.half_day_period ===
																"first_half"
															}
															onChange={() =>
																setFormData(
																	{
																		...formData,
																		half_day_period:
																			"first_half",
																	}
																)
															}
															className="text-blue-600 focus:ring-blue-500"
														/>
														First half (9am – 1pm)
													</label>
													<label className='flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium'>
														<input
															type='radio'
															name='half_period'
															checked={
																formData.half_day_period ===
																"second_half"
															}
															onChange={() =>
																setFormData(
																	{
																		...formData,
																		half_day_period:
																			"second_half",
																	}
																)
															}
															className="text-blue-600 focus:ring-blue-500"
														/>
														Second half (1pm – 7pm)
													</label>
												</div>
											)}
										</div>
									)}

									<div className='grid grid-cols-2 gap-4'>
										<div className='space-y-2'>
											<Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Start Date</Label>
											<Input
												type='date'
												value={formData.start_date}
												onChange={(e) =>
													setFormData({
														...formData,
														start_date:
															e.target.value,
													})
												}
												className="rounded-xl border-slate-205 dark:border-slate-800 text-xs"
											/>
										</div>
										<div className='space-y-2'>
											<Label className="text-xs font-bold text-slate-600 dark:text-slate-400">End Date</Label>
											<Input
												type='date'
												value={formData.end_date}
												onChange={(e) =>
													setFormData({
														...formData,
														end_date:
															e.target.value,
													})
												}
												className="rounded-xl border-slate-205 dark:border-slate-800 text-xs"
											/>
										</div>
									</div>

									{/* Total & remaining when dates selected */}
									{formData.start_date &&
										formData.end_date &&
										formData.leave_type_id && (
											<div className='rounded-xl border border-slate-100 dark:border-slate-850/50 bg-slate-50/50 dark:bg-slate-950/20 p-3.5 text-xs text-slate-600 dark:text-slate-405 space-y-1'>
												<p>
													<strong>
														Total leave:
													</strong>{" "}
													{formatLeaveDays(
														formData.start_date,
														formData.end_date,
														formData.half_day
													)}
												</p>
												<p>
													<strong>
														Remaining:
													</strong>{" "}
													{remaining % 1 === 0
														? remaining
														: remaining.toFixed(1)}{" "}
													day{remaining !== 1 ? "s" : ""}
												</p>
												{requestDays >
													remaining && (
													<p className='text-red-500 font-bold mt-2'>
														Insufficient balance. Choose another leave type.
													</p>
												)}
											</div>
										)}

									{/* Medical: required document upload */}
									{isMedicalLeave(selectedType) && (
										<div className='space-y-2 bg-rose-50/20 dark:bg-rose-950/10 p-3 rounded-xl border border-rose-100/50 dark:border-rose-900/20'>
											<Label className="text-xs font-bold text-rose-700 dark:text-rose-400">
												Document (receipt / medical certificate){" "}
												<span className='text-rose-500'>*</span>
											</Label>
											<input
												ref={docInputRef}
												type='file'
												accept='.pdf,.jpg,.jpeg,.png'
												className='hidden'
												onChange={handleDocUpload}
											/>
											<div className='flex items-center gap-2 mt-1'>
												<Button
													type='button'
													variant='outline'
													size='sm'
													onClick={() =>
														docInputRef.current?.click()
													}
													disabled={docUploading}
													className="rounded-lg text-xs h-8 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30">
													{docUploading ? (
														<Loader2 className='h-4 w-4 animate-spin' />
													) : (
														<Upload className='mr-1.5 h-3.5 w-3.5' />
													)}
													Upload File
												</Button>
												{formData.document_url && (
													<>
														<a
															href={
																formData.document_url
															}
															target='_blank'
															rel='noopener noreferrer'
															className='text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1'>
															<ExternalLink className='h-3 w-3' /> Document Attached
														</a>
														<Button
															type='button'
															variant='ghost'
															size='sm'
															className='h-7 text-rose-500 hover:text-rose-600 font-bold hover:bg-transparent text-xs'
															onClick={() =>
																setFormData(
																	(f) => ({
																		...f,
																		document_url: null,
																	})
																)
															}>
															Remove
														</Button>
													</>
												)}
											</div>
										</div>
									)}

									<div className='space-y-2'>
										<Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Reason</Label>
										<Textarea
											placeholder='Brief reason for leave request...'
											value={formData.reason}
											onChange={(e) =>
												setFormData({
													...formData,
													reason: e.target.value,
												})
											}
											className="rounded-xl border-slate-205 dark:border-slate-800 text-xs min-h-[80px]"
										/>
									</div>

									<div className='flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/40'>
										<Button
											variant='outline'
											onClick={() =>
												setIsDialogOpen(false)
											}
											className="rounded-xl text-xs h-9 border-slate-200 dark:border-slate-800">
											Cancel
										</Button>
										<Button
											onClick={handleSubmit}
											disabled={
												!canSubmit || submitting
											}
											className="rounded-xl text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-[0_4px_12px_rgba(37,99,235,0.15)]">
											{submitting ? (
												<Loader2 className='h-4 w-4 animate-spin' />
											) : editingRequest ? (
												"Update"
											) : (
												"Submit Request"
											)}
										</Button>
									</div>
								</div>
							</DialogContent>
						</Dialog>
					</div>

					<TabsContent value='requests'>
						<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden'>
							<div className='flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/10'>
								<div className='h-8 w-8 rounded-xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-450 flex items-center justify-center'><Calendar className='h-4 w-4' /></div>
								<div>
									<p className='font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-350'>My Leave Requests ({currentYear})</p>
									<p className='text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5'>{filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}</p>
								</div>
							</div>
							{isLoading ? (
								<div className='flex items-center justify-center py-16'><Loader2 className='h-6 w-6 text-slate-300 dark:text-slate-700 animate-spin' /></div>
							) : filteredRequests.length === 0 ? (
								<div className='flex flex-col items-center justify-center py-16 text-center'>
									<Calendar className='h-12 w-12 text-slate-200 dark:text-slate-800 mb-3' />
									<p className='text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider'>
										{leaveRequests.length === 0 ? "No leave requests yet" : "No requests for this year"}
									</p>
									<p className='text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1'>Click "New Request" to submit a leave application</p>
								</div>
							) : (
								<div className='overflow-x-auto'>
									<Table>
										<TableHeader>
											<TableRow className='hover:bg-transparent border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/20'>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Leave Type</TableHead>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Duration</TableHead>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Days</TableHead>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Reason</TableHead>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Document</TableHead>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Status</TableHead>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Submitted</TableHead>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 w-[80px]'>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredRequests.map((request) => (
												<TableRow key={request.id} className='hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors border-b border-slate-100 dark:border-slate-800/40'>
													<TableCell>
														<span className='inline-flex items-center px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-950/40 text-slate-650 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider border border-slate-100 dark:border-slate-850/40'>
															{request.leave_type?.name}
														</span>
														{request.half_day && request.half_day_period && (
															<span className='ml-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold'>
																({request.half_day_period === "first_half" ? "9am-1pm" : "1pm-7pm"})
															</span>
														)}
													</TableCell>
													<TableCell className='text-xs text-slate-600 dark:text-slate-350'>
														<div className='flex flex-col'>
															<span className="font-bold">{new Date(request.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
															<span className='text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5'>to {new Date(request.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
														</div>
													</TableCell>
													<TableCell>
														<span className='inline-flex px-2 py-0.5 rounded bg-blue-50/60 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450 text-[10px] font-black uppercase tracking-wider border border-blue-100/50 dark:border-blue-900/30'>
															{formatLeaveDays(request.start_date, request.end_date, request.half_day)}
														</span>
													</TableCell>
													<TableCell className='max-w-[200px] truncate text-xs text-slate-500 dark:text-slate-400 font-medium'>
														{request.reason || "—"}
													</TableCell>
													<TableCell>
														{request.document_url ? (
															<Button variant='outline' size='sm' asChild className='h-7 text-[10px] font-bold rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'>
																<a href={request.document_url} target='_blank' rel='noopener noreferrer' className="flex items-center gap-1">
																	<ExternalLink className='h-3 w-3' />
																	View
																</a>
															</Button>
														) : (
															<span className='text-slate-400 dark:text-slate-600 text-xs'>—</span>
														)}
													</TableCell>
													<TableCell>
														{getStatusBadge(request.status)}
													</TableCell>
													<TableCell className='text-xs text-slate-400 dark:text-slate-550 font-medium'>
														{new Date(request.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
													</TableCell>
													<TableCell>
														{request.status === "pending" && (
															<Button variant='ghost' size='sm' className='h-8 w-8 p-0 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850' onClick={() => openEditDialog(request)} title='Edit'>
																<Pencil className='h-3.5 w-3.5 text-slate-450 dark:text-slate-400' />
															</Button>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</div>
					</TabsContent>

					<TabsContent value='deductions'>
						<div className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden'>
							<div className='flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/10'>
								<div className='h-8 w-8 rounded-xl bg-orange-50/80 dark:bg-orange-950/20 border border-orange-100/50 dark:border-orange-900/30 text-orange-600 dark:text-orange-450 flex items-center justify-center'><Minus className='h-4 w-4' /></div>
								<div>
									<p className='font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-350'>Leave Deductions</p>
									<p className='text-[10px] font-bold text-slate-405 mt-0.5'>{leaveDeductions.length} deduction{leaveDeductions.length !== 1 ? 's' : ''} recorded</p>
								</div>
							</div>
							{leaveDeductions.length === 0 ? (
								<div className='flex flex-col items-center justify-center py-16 text-center'>
									<Minus className='h-12 w-12 text-slate-200 dark:text-slate-800 mb-3' />
									<p className='text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider'>No leave deductions recorded</p>
								</div>
							) : (
								<div className='overflow-x-auto'>
									<Table>
										<TableHeader>
											<TableRow className='hover:bg-transparent border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/20'>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Leave Type</TableHead>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Days Deducted</TableHead>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Date</TableHead>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Reason</TableHead>
												<TableHead className='font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500'>Deducted By</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{leaveDeductions.map((deduction) => (
												<TableRow key={deduction.id} className='hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors border-b border-slate-100 dark:border-slate-800/40'>
													<TableCell>
														<span className='inline-flex items-center px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-950/40 text-slate-650 dark:text-slate-350 text-[10px] font-black uppercase tracking-wider border border-slate-100 dark:border-slate-850/40'>
															{deduction.leave_type?.name ?? "—"}
														</span>
													</TableCell>
													<TableCell>
														<span className='inline-flex px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-455 text-[10px] font-black uppercase tracking-wider border border-rose-100/50 dark:border-rose-900/30 shadow-[0_2px_8px_rgba(244,63,94,0.02)]'>
															-{deduction.days_deducted}
														</span>
													</TableCell>
													<TableCell className='text-xs text-slate-600 dark:text-slate-350 font-bold'>
														{new Date(deduction.deduction_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
													</TableCell>
													<TableCell className='max-w-[200px] truncate text-xs text-slate-500 dark:text-slate-400 font-medium'>
														{deduction.reason || "—"}
													</TableCell>
													<TableCell className='text-xs text-slate-400 dark:text-slate-550 font-medium'>
														{deduction.deductor ? `${deduction.deductor.first_name} ${deduction.deductor.last_name}` : "—"}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</div>
					</TabsContent>
				</Tabs>
				</div>
			</div>
		</div>
	);
}
