"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { UserMinus, Plus, Loader2, Calendar, FileText } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { toast } from "react-hot-toast";
import type { Resignation, Employee } from "@/lib/types";

interface ResignationWithDetails extends Resignation {
	reviewer?: Employee;
}

function SectionHeader({
	icon,
	iconBg,
	iconColor,
	title,
	sub,
	action,
}: {
	icon: React.ReactNode;
	iconBg: string;
	iconColor: string;
	title: string;
	sub: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-border/50">
			<div className="flex items-center gap-3">
				<div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
					{icon}
				</div>
				<div>
					<p className="font-semibold text-sm text-foreground">{title}</p>
					<p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
				</div>
			</div>
			{action}
		</div>
	);
}

function getStatusBadge(status: string) {
	switch (status) {
		case "pending":
			return <Badge className="bg-slate-500/15 text-slate-700 border border-slate-200">Pending</Badge>;
		case "processing":
			return <Badge className="bg-amber-500/15 text-amber-700 border border-amber-200">Processing</Badge>;
		case "accepted":
			return <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-200">Accepted</Badge>;
		case "rejected":
			return <Badge className="bg-rose-500/15 text-rose-700 border border-rose-200">Rejected</Badge>;
		default:
			return <Badge variant="outline">{status}</Badge>;
	}
}

function formatDate(s: string) {
	return new Date(s).toLocaleDateString("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export default function EmployeeResignationPage() {
	const { employee } = useUser();
	const [resignations, setResignations] = useState<ResignationWithDetails[]>(
		[]
	);
	const [isLoading, setIsLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [selectedResignation, setSelectedResignation] =
		useState<ResignationWithDetails | null>(null);

	const [reason, setReason] = useState("");
	const [lastWorkingDay, setLastWorkingDay] = useState("");

	const hasPendingOrProcessing = resignations.some(
		(r) => r.status === "pending" || r.status === "processing"
	);
	const canSubmit = !hasPendingOrProcessing && employee?.is_active !== false;

	useEffect(() => {
		if (employee) fetchResignations();
	}, [employee?.id]);

	const fetchResignations = async () => {
		if (!employee) return;
		const supabase = createClient();
		const { data } = await supabase
			.from("resignations")
			.select(
				"*, reviewer:employees!resignations_reviewed_by_fkey(id, first_name, last_name)"
			)
			.eq("employee_id", employee.id)
			.order("created_at", { ascending: false });

		setResignations((data as ResignationWithDetails[]) || []);
		setIsLoading(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!employee || !reason.trim() || !lastWorkingDay) {
			toast.error("Please fill reason and last working day.");
			return;
		}
		setSubmitting(true);
		try {
			const supabase = createClient();
			const { error } = await supabase.from("resignations").insert({
				employee_id: employee.id,
				reason: reason.trim(),
				last_working_day: lastWorkingDay,
				status: "pending",
			});
			if (error) throw error;
			toast.success("Resignation submitted successfully.");
			setReason("");
			setLastWorkingDay("");
			await fetchResignations();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to submit.";
			toast.error(msg);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="flex flex-col min-h-full bg-background">
			<DashboardHeader
				title="Resignation"
				description="Submit and view your resignation requests"
			/>

			<div className="flex-1 space-y-6 p-4 md:p-6 pb-20 md:pb-8">
				{canSubmit && (
					<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
						<SectionHeader
							icon={<Plus className="h-5 w-5" />}
							iconBg="bg-primary/10"
							iconColor="text-primary"
							title="Submit Resignation"
							sub="Submit a formal resignation request. HR will review and respond."
						/>
						<CardContent className="p-4">
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="reason">Reason for resignation</Label>
									<Textarea
										id="reason"
										placeholder="Please state your reason for resigning..."
										value={reason}
										onChange={(e) => setReason(e.target.value)}
										rows={4}
										className="resize-none rounded-xl"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="last_working_day">Last working day</Label>
									<div className="flex items-center gap-2">
										<Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
										<Input
											id="last_working_day"
											type="date"
											value={lastWorkingDay}
											onChange={(e) => setLastWorkingDay(e.target.value)}
											required
											className="w-full sm:max-w-[220px] rounded-xl"
										/>
									</div>
								</div>
								<Button type="submit" disabled={submitting} className="rounded-xl">
									{submitting ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<UserMinus className="mr-2 h-4 w-4" />
									)}
									Submit Resignation
								</Button>
							</form>
						</CardContent>
					</div>
				)}

				{hasPendingOrProcessing && (
					<div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
						<p className="text-sm text-amber-800">
							You have a resignation request that is pending or under processing. You can submit a new request only after it is accepted or rejected.
						</p>
					</div>
				)}

				<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
					<SectionHeader
						icon={<FileText className="h-5 w-5" />}
						iconBg="bg-slate-500/15"
						iconColor="text-slate-600"
						title="My Resignation Requests"
						sub="View status and details of your resignation requests."
					/>
					<CardContent className="p-4">
						{isLoading ? (
							<div className="py-12 text-center text-sm text-muted-foreground">
								Loading...
							</div>
						) : resignations.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-muted/30">
								<div className="h-12 w-12 rounded-2xl bg-slate-500/10 flex items-center justify-center mb-3">
									<FileText className="h-5 w-5 text-slate-500/70" />
								</div>
								<p className="text-sm font-medium">No resignation requests yet.</p>
								<p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Submit your first resignation request above</p>
							</div>
						) : (
							<div className="rounded-xl border border-border overflow-hidden">
								<div className="overflow-x-auto scrollbar-hide">
									<div className="min-w-[520px] md:min-w-0">
										<Table>
											<TableHeader>
												<TableRow className="hover:bg-transparent">
													<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Submitted</TableHead>
													<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Last Working Day</TableHead>
													<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Status</TableHead>
													<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Reason</TableHead>
													<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap w-[80px]">Action</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{resignations.map((r) => (
													<TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
														<TableCell className="whitespace-nowrap text-sm text-muted-foreground">
															{formatDate(r.created_at)}
														</TableCell>
														<TableCell className="whitespace-nowrap text-sm">
															{formatDate(r.last_working_day)}
														</TableCell>
														<TableCell className="whitespace-nowrap">
															{getStatusBadge(r.status)}
														</TableCell>
														<TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
															{r.reason || "–"}
														</TableCell>
														<TableCell>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => setSelectedResignation(r)}
																className="rounded-lg">
																View
															</Button>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</div>
							</div>
						)}
					</CardContent>
				</div>
			</div>

			<Dialog
				open={!!selectedResignation}
				onOpenChange={(open) => !open && setSelectedResignation(null)}>
				<DialogContent className="max-w-lg rounded-2xl">
					<DialogHeader>
						<DialogTitle>Resignation Details</DialogTitle>
					</DialogHeader>
					{selectedResignation && (
						<div className="space-y-4 py-2">
							<div className="rounded-xl bg-muted p-4 space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Submitted</span>
									<span>{formatDate(selectedResignation.created_at)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Last working day</span>
									<span>{formatDate(selectedResignation.last_working_day)}</span>
								</div>
								<div className="flex justify-between text-sm items-center">
									<span className="text-muted-foreground">Status</span>
									{getStatusBadge(selectedResignation.status)}
								</div>
							</div>

							<div className="space-y-2">
								<Label className="text-muted-foreground">Reason</Label>
								<div className="rounded-xl border border-border p-3 text-sm whitespace-pre-wrap">
									{selectedResignation.reason}
								</div>
							</div>

							{(selectedResignation.status === "accepted" ||
								selectedResignation.status === "rejected") && (
								<div className="rounded-xl bg-muted p-4">
									<p className="text-sm text-muted-foreground">
										This resignation was {selectedResignation.status}
										{selectedResignation.reviewer && (
											<>
												{" "}
												by {selectedResignation.reviewer.first_name} {selectedResignation.reviewer.last_name}
											</>
										)}
										{selectedResignation.reviewed_at && (
											<>
												{" "}
												on {formatDate(selectedResignation.reviewed_at)}
											</>
										)}
										.
									</p>
									{selectedResignation.notes && (
										<p className="mt-2 text-sm">Notes: {selectedResignation.notes}</p>
									)}
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
