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
					<span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200'>
						<CheckCircle2 className='h-3 w-3' />
						Approved
					</span>
				);
			case "rejected":
				return (
					<span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200'>
						<XCircle className='h-3 w-3' />
						Rejected
					</span>
				);
			case "pending":
				return (
					<span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200'>
						<Clock className='h-3 w-3' />
						Pending
					</span>
				);
			default:
				return <Badge variant='outline'>{status}</Badge>;
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
		<div className='flex flex-col'>
			<DashboardHeader
				title='Leave Requests'
				description='Manage your leave applications'
			/>

			<div className='flex-1 space-y-5 p-6'>
				{/* ── Leave Balance Cards ── */}
				<div className='grid gap-3 grid-cols-1 md:grid-cols-3 lg:grid-cols-5'>
					{leaveBalances.filter((b) => b.total_days > 0).length ===
					0 ? (
						<div className='col-span-full'>
							<div className='flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-border/60 bg-muted/20'>
								<CalendarDays className='h-10 w-10 text-muted-foreground/30 mb-3' />
								<p className='text-sm font-medium text-muted-foreground'>No leave balance allotted for {currentYear}</p>
							</div>
						</div>
					) : (
						leaveBalances
							.filter((b) => b.total_days > 0)
							.map((balance) => {
								const remaining =
									balance.total_days - balance.used_days;
								const usedPct = balance.total_days > 0 ? (balance.used_days / balance.total_days) * 100 : 0;
								return (
									<div key={balance.id} className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 to-primary/[0.02] border border-border/50 p-4 shadow-sm hover:shadow-md transition-all group'>
										<p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>{balance.leave_type?.name}</p>
										<p className='text-3xl font-bold mt-1 tabular-nums text-primary leading-none'>
											{remaining % 1 === 0 ? remaining : remaining.toFixed(1)}
										</p>
										<p className='text-[11px] text-muted-foreground mt-1'>
											of {balance.total_days % 1 === 0 ? balance.total_days : balance.total_days.toFixed(1)} days
										</p>
										<div className='mt-3 h-1.5 w-full bg-black/5 rounded-full overflow-hidden'>
											<div className='h-full bg-primary/60 rounded-full transition-all duration-700' style={{ width: `${Math.min(usedPct, 100)}%` }} />
										</div>
									</div>
								);
							})
					)}
				</div>

				{/* ── Stat Cards ── */}
				<div className='grid gap-4 grid-cols-2 md:grid-cols-5'>
					<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-border/50 p-4 shadow-sm hover:shadow-md transition-all group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>Pending</p>
								<p className='text-2xl font-bold mt-1 tabular-nums text-amber-700 leading-none'>{employeeStats.pending}</p>
							</div>
							<div className='h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform'><Clock className='h-4 w-4' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-border/50 p-4 shadow-sm hover:shadow-md transition-all group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>Approved</p>
								<p className='text-2xl font-bold mt-1 tabular-nums text-emerald-700 leading-none'>{employeeStats.approved}</p>
							</div>
							<div className='h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform'><CheckCircle2 className='h-4 w-4' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-border/50 p-4 shadow-sm hover:shadow-md transition-all group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>Rejected</p>
								<p className='text-2xl font-bold mt-1 tabular-nums text-red-700 leading-none'>{employeeStats.rejected}</p>
							</div>
							<div className='h-9 w-9 rounded-lg bg-red-500/15 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform'><XCircle className='h-4 w-4' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-border/50 p-4 shadow-sm hover:shadow-md transition-all group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>Deducted</p>
								<p className='text-2xl font-bold mt-1 tabular-nums text-orange-700 leading-none'>{employeeStats.deducted}</p>
							</div>
							<div className='h-9 w-9 rounded-lg bg-orange-500/15 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform'><Minus className='h-4 w-4' /></div>
						</div>
					</div>
					<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-border/50 p-4 shadow-sm hover:shadow-md transition-all group'>
						<div className='flex items-start justify-between gap-2'>
							<div>
								<p className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>Total</p>
								<p className='text-2xl font-bold mt-1 tabular-nums text-primary leading-none'>{employeeStats.total}</p>
							</div>
							<div className='h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary group-hover:scale-110 transition-transform'><CalendarDays className='h-4 w-4' /></div>
						</div>
					</div>
				</div>

				{/* ── Tabbed Section: Requests & Deductions ── */}
				<div className="w-[340px] md:w-full overflow-x-auto">
				<Tabs defaultValue='requests' className=' w-full'>
					<div className='flex items-center justify-between'>
						<TabsList className='h-auto bg-muted/40 p-1 rounded-xl gap-1 border border-border/50'>
							<TabsTrigger value='requests' className='gap-1.5 rounded-lg px-4 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm'>
								<Calendar className='h-3.5 w-3.5' />
								My Requests ({filteredRequests.length})
							</TabsTrigger>
							<TabsTrigger value='deductions' className='gap-1.5 rounded-lg px-4 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm'>
								<Minus className='h-3.5 w-3.5' />
								Deductions ({leaveDeductions.length})
							</TabsTrigger>
						</TabsList>
						<Dialog
							open={isDialogOpen}
							onOpenChange={setIsDialogOpen}>
							<DialogTrigger asChild>
								<Button size='sm' className='rounded-xl gap-1.5' onClick={openNewDialog}>
									<Plus className='h-4 w-4' />
									New Request
								</Button>
							</DialogTrigger>
							<DialogContent className='max-h-[90vh] overflow-y-auto'>
								<DialogHeader>
									<DialogTitle>
										{editingRequest
											? "Edit Leave Request"
											: "Request Leave"}
									</DialogTitle>
									<DialogDescription>
										{editingRequest
											? "Update your pending leave request."
											: "Submit a new leave application for approval."}
									</DialogDescription>
								</DialogHeader>
								<div className='space-y-4 py-4'>
									<div className='space-y-2'>
										<Label>Leave Type</Label>
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
											<SelectTrigger>
												<SelectValue placeholder='Select leave type' />
											</SelectTrigger>
											<SelectContent>
												{requestableLeaveBalances.length ===
												0 ? (
													<div className='py-2 px-2 text-sm text-muted-foreground'>
														No leave balance
														available. Contact
														HR for allotted
														leaves.
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
																}>
																{balance
																	.leave_type
																	?.name ??
																	"—"}{" "}
																(
																{Number(
																	balance.total_days ??
																		0
																) -
																	Number(
																		balance.used_days ??
																			0
																	)}{" "}
																remaining)
															</SelectItem>
														)
													)
												)}
											</SelectContent>
										</Select>
									</div>

									{/* Half day: show when leave type selected */}
									{formData.leave_type_id && (
										<div className='space-y-2'>
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
													className='rounded'
												/>
												<Label htmlFor='half_day'>
													Half day leave
												</Label>
											</div>
											{formData.half_day && (
												<div className='flex gap-4 pl-6'>
													<label className='flex items-center gap-2 text-sm'>
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
														/>
														First half (9am –
														1pm)
													</label>
													<label className='flex items-center gap-2 text-sm'>
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
														/>
														Second half (1pm –
														7pm)
													</label>
												</div>
											)}
										</div>
									)}

									<div className='grid grid-cols-2 gap-4'>
										<div className='space-y-2'>
											<Label>Start Date</Label>
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
											/>
										</div>
										<div className='space-y-2'>
											<Label>End Date</Label>
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
											/>
										</div>
									</div>

									{/* Total & remaining when dates selected */}
									{formData.start_date &&
										formData.end_date &&
										formData.leave_type_id && (
											<div className='rounded-xl border bg-muted/40 p-3 text-sm'>
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
														: remaining.toFixed(
																1
														  )}{" "}
													day
													{remaining !== 1
														? "s"
														: ""}
												</p>
												{requestDays >
													remaining && (
													<p className='text-destructive font-medium'>
														Insufficient
														balance. Reduce days
														or choose another
														leave type.
													</p>
												)}
											</div>
										)}

									{/* Medical: required document upload */}
									{isMedicalLeave(selectedType) && (
										<div className='space-y-2'>
											<Label>
												Document (receipt / medical
												certificate){" "}
												<span className='text-destructive'>
													*
												</span>
											</Label>
											<input
												ref={docInputRef}
												type='file'
												accept='.pdf,.jpg,.jpeg,.png'
												className='hidden'
												onChange={handleDocUpload}
											/>
											<div className='flex items-center gap-2'>
												<Button
													type='button'
													variant='outline'
													size='sm'
													onClick={() =>
														docInputRef.current?.click()
													}
													disabled={docUploading}>
													{docUploading ? (
														<Loader2 className='h-4 w-4 animate-spin' />
													) : (
														<Upload className='mr-2 h-4 w-4' />
													)}
													Upload
												</Button>
												{formData.document_url && (
													<>
														<a
															href={
																formData.document_url
															}
															target='_blank'
															rel='noopener noreferrer'
															className='text-sm text-primary hover:underline flex items-center gap-1'>
															<ExternalLink className='h-3 w-3' />{" "}
															Document
															attached
														</a>
														<Button
															type='button'
															variant='ghost'
															size='sm'
															className='h-7 text-destructive'
															onClick={() =>
																setFormData(
																	(
																		f
																	) => ({
																		...f,
																		document_url:
																			null,
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
										<Label>Reason</Label>
										<Textarea
											placeholder='Reason for leave...'
											value={formData.reason}
											onChange={(e) =>
												setFormData({
													...formData,
													reason: e.target.value,
												})
											}
										/>
									</div>

									<div className='flex justify-end gap-3 pt-4'>
										<Button
											variant='outline'
											onClick={() =>
												setIsDialogOpen(false)
											}>
											Cancel
										</Button>
										<Button
											onClick={handleSubmit}
											disabled={
												!canSubmit || submitting
											}>
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
						<div className='bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden'>
							<div className='flex items-center gap-3 px-5 py-4 border-b border-border/50'>
								<div className='h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary'><Calendar className='h-4 w-4' /></div>
								<div>
									<p className='font-semibold text-sm'>My Leave Requests ({currentYear})</p>
									<p className='text-xs text-muted-foreground'>{filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}</p>
								</div>
							</div>
							{isLoading ? (
								<div className='flex items-center justify-center py-12'><div className='h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin' /></div>
							) : filteredRequests.length === 0 ? (
								<div className='flex flex-col items-center justify-center py-12 text-center'>
									<Calendar className='h-10 w-10 text-muted-foreground/30 mb-3' />
									<p className='text-sm font-medium text-muted-foreground'>
										{leaveRequests.length === 0 ? "No leave requests yet" : "No requests for this year"}
									</p>
									<p className='text-xs text-muted-foreground mt-1'>Click "New Request" to submit a leave application</p>
								</div>
							) : (
								<div className='overflow-x-auto'>
									<Table>
										<TableHeader>
											<TableRow className='bg-muted/30'>
												<TableHead className='font-semibold'>Leave Type</TableHead>
												<TableHead className='font-semibold'>Duration</TableHead>
												<TableHead className='font-semibold'>Days</TableHead>
												<TableHead className='font-semibold'>Document</TableHead>
												<TableHead className='font-semibold'>Status</TableHead>
												<TableHead className='font-semibold'>Submitted</TableHead>
												<TableHead className='font-semibold w-[80px]'>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredRequests.map((request) => (
												<TableRow key={request.id} className='hover:bg-muted/30 transition-colors'>
													<TableCell>
														<span className='inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs font-medium border border-border/60'>
															{request.leave_type?.name}
														</span>
														{request.half_day && request.half_day_period && (
															<span className='ml-2 text-xs text-muted-foreground'>
																({request.half_day_period === "first_half" ? "9am-1pm" : "1pm-7pm"})
															</span>
														)}
													</TableCell>
													<TableCell className='text-sm'>
														<div className='flex flex-col'>
															<span>{new Date(request.start_date).toLocaleDateString()}</span>
															<span className='text-xs text-muted-foreground'>to {new Date(request.end_date).toLocaleDateString()}</span>
														</div>
													</TableCell>
													<TableCell>
														<span className='inline-flex px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold'>
															{formatLeaveDays(request.start_date, request.end_date, request.half_day)}
														</span>
													</TableCell>
													<TableCell className='max-w-[200px] truncate text-sm'>
														{request.reason || "—"}
													</TableCell>
													<TableCell>
														{request.document_url ? (
															<Button variant='outline' size='sm' asChild className='h-7 text-xs rounded-lg'>
																<a href={request.document_url} target='_blank' rel='noopener noreferrer'>
																	<ExternalLink className='mr-1 h-3 w-3' />
																	View
																</a>
															</Button>
														) : (
															<span className='text-muted-foreground text-sm'>—</span>
														)}
													</TableCell>
													<TableCell>
														{getStatusBadge(request.status)}
													</TableCell>
													<TableCell className='text-sm text-muted-foreground'>
														{new Date(request.created_at).toLocaleDateString()}
													</TableCell>
													<TableCell>
														{request.status === "pending" && (
															<Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => openEditDialog(request)} title='Edit'>
																<Pencil className='h-4 w-4' />
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
						<div className='bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden'>
							<div className='flex items-center gap-3 px-5 py-4 border-b border-border/50'>
								<div className='h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center text-orange-600'><Minus className='h-4 w-4' /></div>
								<div>
									<p className='font-semibold text-sm'>Leave Deductions</p>
									<p className='text-xs text-muted-foreground'>{leaveDeductions.length} deduction{leaveDeductions.length !== 1 ? 's' : ''} recorded</p>
								</div>
							</div>
							{leaveDeductions.length === 0 ? (
								<div className='flex flex-col items-center justify-center py-12 text-center'>
									<Minus className='h-10 w-10 text-muted-foreground/30 mb-3' />
									<p className='text-sm font-medium text-muted-foreground'>No leave deductions recorded.</p>
								</div>
							) : (
								<div className='overflow-x-auto'>
									<Table>
										<TableHeader>
											<TableRow className='bg-muted/30'>
												<TableHead className='font-semibold'>Leave Type</TableHead>
												<TableHead className='font-semibold'>Days Deducted</TableHead>
												<TableHead className='font-semibold'>Date</TableHead>
												<TableHead className='font-semibold'>Reason</TableHead>
												<TableHead className='font-semibold'>Deducted By</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{leaveDeductions.map((deduction) => (
												<TableRow key={deduction.id} className='hover:bg-muted/30 transition-colors'>
													<TableCell>
														<span className='inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs font-medium border border-border/60'>
															{deduction.leave_type?.name ?? "—"}
														</span>
													</TableCell>
													<TableCell>
														<span className='inline-flex px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-xs font-semibold border border-red-200'>
															-{deduction.days_deducted}
														</span>
													</TableCell>
													<TableCell className='text-sm'>
														{new Date(deduction.deduction_date).toLocaleDateString()}
													</TableCell>
													<TableCell className='max-w-[200px] truncate text-sm'>
														{deduction.reason || "—"}
													</TableCell>
													<TableCell className='text-xs text-muted-foreground'>
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
