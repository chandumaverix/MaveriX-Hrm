"use client";

import { useEffect, useState } from "react";
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
import { UserMinus, Plus, Loader2, Calendar } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { toast } from "react-hot-toast";
import type { Resignation, Employee } from "@/lib/types";

interface ResignationWithDetails extends Resignation {
	reviewer?: Employee;
}

function getStatusBadge(status: string) {
	switch (status) {
		case "pending":
			return <Badge variant='secondary'>Pending</Badge>;
		case "processing":
			return (
				<Badge className='bg-warning text-warning-foreground'>
					Processing
				</Badge>
			);
		case "accepted":
			return (
				<Badge className='bg-success text-success-foreground'>
					Accepted
				</Badge>
			);
		case "rejected":
			return <Badge variant='destructive'>Rejected</Badge>;
		default:
			return <Badge variant='outline'>{status}</Badge>;
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
		<div className='flex flex-col min-h-screen'>
			<DashboardHeader
				title='Resignation'
				description='Submit and view your resignation requests'
			/>

			<div className='flex-1 space-y-4 p-4 pb-24 md:space-y-6 md:p-6 md:pb-6'>
				{/* Submit new resignation */}
				{canSubmit && (
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
								<Plus className='h-5 w-5' />
								Submit Resignation
							</CardTitle>
							<p className='text-sm text-muted-foreground'>
								Submit a formal resignation request. HR will
								review and respond.
							</p>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit} className='space-y-4'>
								<div className='space-y-2'>
									<Label htmlFor='reason'>
										Reason for resignation
									</Label>
									<Textarea
										id='reason'
										placeholder='Please state your reason for resigning...'
										value={reason}
										onChange={(e) =>
											setReason(e.target.value)
										}
										rows={4}
										className='resize-none'
										required
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='last_working_day'>
										Last working day
									</Label>
									<div className='flex items-center gap-2'>
										<Calendar className='h-5 w-5 text-muted-foreground shrink-0' />
										<Input
											id='last_working_day'
											type='date'
											value={lastWorkingDay}
											onChange={(e) =>
												setLastWorkingDay(
													e.target.value
												)
											}
											required
											className='w-full sm:max-w-[220px]'
										/>
									</div>
								</div>
								<Button type='submit' disabled={submitting}>
									{submitting ? (
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									) : (
										<UserMinus className='mr-2 h-4 w-4' />
									)}
									Submit Resignation
								</Button>
							</form>
						</CardContent>
					</Card>
				)}

				{hasPendingOrProcessing && (
					<Card className='border-warning/50 bg-warning/5'>
						<CardContent className='p-4'>
							<p className='text-sm text-muted-foreground'>
								You have a resignation request that is pending
								or under processing. You can submit a new
								request only after it is accepted or rejected.
							</p>
						</CardContent>
					</Card>
				)}

				{/* My resignations */}
				<Card>
					<CardHeader>
						<CardTitle className='text-base sm:text-lg'>
							My Resignation Requests
						</CardTitle>
						<p className='text-sm text-muted-foreground'>
							View status and details of your resignation
							requests.
						</p>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className='py-12 text-center text-sm text-muted-foreground'>
								Loading...
							</div>
						) : resignations.length === 0 ? (
							<div className='py-12 text-center text-sm text-muted-foreground'>
								No resignation requests yet.
							</div>
						) : (
							<div className='rounded-lg border border-border overflow-hidden'>
								<div className='overflow-x-auto scrollbar-hide'>
									<div className='min-w-[520px] md:min-w-0'>
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className='whitespace-nowrap'>
														Submitted
													</TableHead>
													<TableHead className='whitespace-nowrap'>
														Last Working Day
													</TableHead>
													<TableHead className='whitespace-nowrap'>
														Status
													</TableHead>
													<TableHead className='whitespace-nowrap'>
														Reason
													</TableHead>
													<TableHead className='w-[80px] whitespace-nowrap'>
														Action
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{resignations.map((r) => (
													<TableRow key={r.id}>
														<TableCell className='whitespace-nowrap text-muted-foreground'>
															{formatDate(
																r.created_at
															)}
														</TableCell>
														<TableCell className='whitespace-nowrap'>
															{formatDate(
																r.last_working_day
															)}
														</TableCell>
														<TableCell className='whitespace-nowrap'>
															{getStatusBadge(
																r.status
															)}
														</TableCell>
														<TableCell className='max-w-[180px] truncate text-sm text-muted-foreground'>
															{r.reason || "–"}
														</TableCell>
														<TableCell>
															<Button
																variant='ghost'
																size='sm'
																onClick={() =>
																	setSelectedResignation(
																		r
																	)
																}>
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
				</Card>
			</div>

			{/* View details dialog */}
			<Dialog
				open={!!selectedResignation}
				onOpenChange={(open) => !open && setSelectedResignation(null)}>
				<DialogContent className='max-w-lg'>
					<DialogHeader>
						<DialogTitle>Resignation Details</DialogTitle>
					</DialogHeader>
					{selectedResignation && (
						<div className='space-y-4 py-2'>
							<div className='rounded-lg bg-muted p-4 space-y-2'>
								<div className='flex justify-between text-sm'>
									<span className='text-muted-foreground'>
										Submitted
									</span>
									<span>
										{formatDate(
											selectedResignation.created_at
										)}
									</span>
								</div>
								<div className='flex justify-between text-sm'>
									<span className='text-muted-foreground'>
										Last working day
									</span>
									<span>
										{formatDate(
											selectedResignation.last_working_day
										)}
									</span>
								</div>
								<div className='flex justify-between text-sm items-center'>
									<span className='text-muted-foreground'>
										Status
									</span>
									{getStatusBadge(selectedResignation.status)}
								</div>
							</div>

							<div className='space-y-2'>
								<Label className='text-muted-foreground'>
									Reason
								</Label>
								<div className='rounded-lg border border-border p-3 text-sm whitespace-pre-wrap'>
									{selectedResignation.reason}
								</div>
							</div>

							{(selectedResignation.status === "accepted" ||
								selectedResignation.status === "rejected") && (
								<div className='rounded-lg bg-muted p-4'>
									<p className='text-sm text-muted-foreground'>
										This resignation was{" "}
										{selectedResignation.status}
										{selectedResignation.reviewer && (
											<>
												{" "}
												by{" "}
												{
													selectedResignation.reviewer
														.first_name
												}{" "}
												{
													selectedResignation.reviewer
														.last_name
												}
											</>
										)}
										{selectedResignation.reviewed_at && (
											<>
												{" "}
												on{" "}
												{formatDate(
													selectedResignation.reviewed_at
												)}
											</>
										)}
										.
									</p>
									{selectedResignation.notes && (
										<p className='mt-2 text-sm'>
											Notes: {selectedResignation.notes}
										</p>
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
