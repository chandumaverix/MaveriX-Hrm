"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { CardContent } from "@/components/ui/card";
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
import {
	UserMinus,
	Plus,
	Loader2,
	Calendar,
	FileText,
	CheckCircle2,
	AlertCircle,
	Info,
	BookOpen,
	Briefcase,
	GraduationCap,
	MapPin,
	HeartPulse,
	CreditCard,
	HelpCircle,
	Laptop,
	ClipboardCheck,
} from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { toast } from "react-hot-toast";
import type { Resignation, Employee } from "@/lib/types";

interface ResignationWithDetails extends Resignation {
	reviewer?: Employee;
}

const DEPARTURE_CATEGORIES = [
	{ id: "Career Advancement", label: "Career Growth", icon: Briefcase, color: "text-blue-500 bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-900/30" },
	{ id: "Higher Studies", label: "Education", icon: GraduationCap, color: "text-purple-500 bg-purple-50/50 dark:bg-purple-950/20 border-purple-100/50 dark:border-purple-900/30" },
	{ id: "Relocation", label: "Relocation", icon: MapPin, color: "text-amber-500 bg-amber-50/50 dark:bg-amber-950/20 border-amber-100/50 dark:border-amber-900/30" },
	{ id: "Health or Family", label: "Health / Family", icon: HeartPulse, color: "text-rose-500 bg-rose-50/50 dark:bg-rose-950/20 border-rose-100/50 dark:border-rose-900/30" },
	{ id: "Compensation", label: "Compensation", icon: CreditCard, color: "text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/50 dark:border-emerald-900/30" },
	{ id: "Other Reasons", label: "Other Reasons", icon: HelpCircle, color: "text-slate-500 bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-800/40" },
];

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
		<div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/10">
			<div className="flex items-center gap-3">
				<div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800/40 shadow-[0_2px_8px_rgba(0,0,0,0.01)] ${iconBg} ${iconColor}`}>
					{icon}
				</div>
				<div>
					<p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">{title}</p>
					<p className="text-[10px] text-slate-400 dark:text-slate-555 font-bold mt-0.5">{sub}</p>
				</div>
			</div>
			{action}
		</div>
	);
}

function getStatusBadge(status: string) {
	switch (status) {
		case "pending":
			return <div className="inline-flex items-center px-2 py-0.5 rounded bg-slate-105 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border border-slate-200/50 dark:border-slate-700/50 shadow-[0_2px_8px_rgba(100,116,139,0.02)]">Pending</div>;
		case "processing":
			return <div className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-500 dark:bg-amber-950/20 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-100/50 dark:border-amber-900/30 shadow-[0_2px_8px_rgba(245,158,11,0.02)]">Processing</div>;
		case "accepted":
			return <div className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450 text-[10px] font-black uppercase tracking-wider border border-emerald-100/50 dark:border-emerald-900/30 shadow-[0_2px_8px_rgba(16,185,129,0.02)]">Accepted</div>;
		case "rejected":
			return <div className="inline-flex items-center px-2 py-0.5 rounded bg-rose-50 text-rose-500 dark:bg-rose-950/20 dark:text-rose-455 text-[10px] font-black uppercase tracking-wider border border-rose-100/50 dark:border-rose-900/30 shadow-[0_2px_8px_rgba(244,63,94,0.02)]">Rejected</div>;
		default:
			return <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider">{status}</Badge>;
	}
}

function formatDate(s: string) {
	return new Date(s).toLocaleDateString("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

const parseReason = (reasonText: string) => {
	if (!reasonText) return { category: "Other Reasons", details: "" };
	const index = reasonText.indexOf(" - ");
	if (index !== -1) {
		return {
			category: reasonText.substring(0, index),
			details: reasonText.substring(index + 3),
		};
	}
	return {
		category: "Other Reasons",
		details: reasonText,
	};
};

export default function EmployeeResignationPage() {
	const { employee } = useUser();
	const [resignations, setResignations] = useState<ResignationWithDetails[]>(
		[]
	);
	const [isLoading, setIsLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [selectedResignation, setSelectedResignation] =
		useState<ResignationWithDetails | null>(null);

	const [reasonCategory, setReasonCategory] = useState("Career Advancement");
	const [reasonDetails, setReasonDetails] = useState("");
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
		if (!employee || !reasonDetails.trim() || !lastWorkingDay) {
			toast.error("Please provide a reason and select your last working day.");
			return;
		}
		setSubmitting(true);
		try {
			const supabase = createClient();
			const combinedReason = `${reasonCategory} - ${reasonDetails.trim()}`;
			const { error } = await supabase.from("resignations").insert({
				employee_id: employee.id,
				reason: combinedReason,
				last_working_day: lastWorkingDay,
				status: "pending",
			});
			if (error) throw error;
			toast.success("Resignation submitted successfully.");
			setReasonDetails("");
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

	const calculateNoticeDays = (dateStr: string) => {
		if (!dateStr) return 0;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const lastDay = new Date(dateStr);
		lastDay.setHours(0, 0, 0, 0);
		const diffTime = lastDay.getTime() - today.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	};

	const noticeDays = lastWorkingDay ? calculateNoticeDays(lastWorkingDay) : 0;
	const isShortNotice = lastWorkingDay ? noticeDays < 30 : false;

	return (
		<div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
			<DashboardHeader
				title="Resignation"
				description="Submit and view your resignation requests"
			/>

			<div className="flex-1 space-y-6 p-4 md:p-6 pb-20 md:pb-6">
				{canSubmit && (
					<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
						<SectionHeader
							icon={<Plus className="h-4.5 w-4.5" />}
							iconBg="bg-blue-50 dark:bg-blue-950/20"
							iconColor="text-blue-600 dark:text-blue-400"
							title="Resignation Application"
							sub="Initiate transition process. HR and managers will review and reach out."
						/>
						<CardContent className="p-5">
							<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
								{/* Left Column - Submission Form */}
								<form onSubmit={handleSubmit} className="space-y-5 lg:col-span-7">
									
									{/* Category Selector */}
									<div className="space-y-2.5">
										<Label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">
											Primary Reason for Leaving
										</Label>
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
											{DEPARTURE_CATEGORIES.map((cat) => {
												const IconComponent = cat.icon;
												const isSelected = reasonCategory === cat.id;
												return (
													<button
														key={cat.id}
														type="button"
														onClick={() => setReasonCategory(cat.id)}
														className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
															isSelected
																? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.05)] scale-[1.02]"
																: "bg-slate-50/30 border-slate-100 text-slate-650 hover:bg-slate-50/80 dark:bg-slate-950/20 dark:border-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-950/40"
														}`}
													>
														<div className={`h-7 w-7 rounded-lg flex items-center justify-center mb-1.5 border transition-all ${
															isSelected ? "bg-white/10 border-white/10 text-white" : cat.color
														}`}>
															<IconComponent className="h-4 w-4" />
														</div>
														<span className="text-[10px] font-bold tracking-tight">{cat.label}</span>
													</button>
												);
											})}
										</div>
									</div>

									{/* Detailed Reason */}
									<div className="space-y-2">
										<Label htmlFor="reason" className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">
											Detailed Statement
										</Label>
										<Textarea
											id="reason"
											placeholder="Please share details or specific context regarding your departure..."
											value={reasonDetails}
											onChange={(e) => setReasonDetails(e.target.value)}
											rows={4}
											className="bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 resize-none transition-all p-3.5 text-xs font-semibold leading-relaxed"
											required
										/>
									</div>

									{/* Last Working Day Picker & Notice Indicator */}
									<div className="space-y-3 p-4 bg-slate-50/30 dark:bg-slate-950/15 border border-slate-100 dark:border-slate-850 rounded-xl">
										<div className="space-y-2">
											<Label htmlFor="last_working_day" className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-550">
												Proposed Last Working Day
											</Label>
											<div className="flex items-center gap-2">
												<Calendar className="h-4.5 w-4.5 text-slate-400 shrink-0" />
												<Input
													id="last_working_day"
													type="date"
													value={lastWorkingDay}
													onChange={(e) => setLastWorkingDay(e.target.value)}
													required
													className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg focus:border-slate-200 focus:ring-0 transition-all w-full sm:max-w-[200px]"
												/>
											</div>
										</div>

										{lastWorkingDay && (
											<div className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs leading-normal transition-all ${
												isShortNotice
													? "bg-rose-50/50 border-rose-100 text-rose-700 dark:bg-rose-950/10 dark:border-rose-900/30 dark:text-rose-400"
													: "bg-emerald-50/50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/10 dark:border-emerald-900/30 dark:text-emerald-400"
											}`}>
												{isShortNotice ? (
													<AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
												) : (
													<CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
												)}
												<div>
													<p className="font-bold">
														{noticeDays} Day{noticeDays !== 1 ? "s" : ""} Notice Period
													</p>
													<p className="text-[10px] opacity-80 mt-0.5">
														{isShortNotice
															? "Warning: Standard notice period is 30 days. Short notice is subject to manager approval."
															: "Notice period requirement met successfully."}
													</p>
												</div>
											</div>
										)}
									</div>

									{/* Action Button */}
									<Button type="submit" disabled={submitting} className="rounded-xl h-10 px-4 text-xs font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all active:scale-[0.98]">
										{submitting ? (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										) : (
											<UserMinus className="mr-2 h-4 w-4" />
										)}
										Submit Resignation
									</Button>
								</form>

								{/* Right Column - Exit & Handover Knowledge Checklist */}
								<div className="lg:col-span-5 space-y-4 lg:border-l lg:border-slate-100 dark:lg:border-slate-800/40 lg:pl-6">
									<div className="space-y-1">
										<p className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 flex items-center gap-1.5">
											<BookOpen className="h-3.5 w-3.5 text-blue-500" />
											Exit & Handover Knowledge
										</p>
										<p className="text-[10px] text-slate-400 dark:text-slate-550 font-semibold leading-relaxed">
											Important instructions regarding the standard resignation and offboarding transition process.
										</p>
									</div>

									<div className="space-y-3">
										{/* Notice Period Info */}
										<div className="flex gap-3 p-3 rounded-xl border border-slate-100/50 bg-slate-50/20 dark:border-slate-850 dark:bg-slate-950/20">
											<div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/20 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100/30">
												<Calendar className="h-3.5 w-3.5" />
											</div>
											<div className="space-y-0.5">
												<p className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Notice Verification</p>
												<p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold leading-normal">
													Standard notice period is 30 days. Shorter notice periods might result in salary deductions or require specific manager concessions.
												</p>
											</div>
										</div>

										{/* Knowledge Transfer */}
										<div className="flex gap-3 p-3 rounded-xl border border-slate-100/50 bg-slate-50/20 dark:border-slate-850 dark:bg-slate-950/20">
											<div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-500 dark:bg-purple-950/20 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100/30">
												<ClipboardCheck className="h-3.5 w-3.5" />
											</div>
											<div className="space-y-0.5">
												<p className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Knowledge Transfer (KT)</p>
												<p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold leading-normal">
													Prepare exit handover documents and schedule training/walkthrough sessions with allocated team members to ensure uninterrupted deliveries.
												</p>
											</div>
										</div>

										{/* Asset Return */}
										<div className="flex gap-3 p-3 rounded-xl border border-slate-100/50 bg-slate-50/20 dark:border-slate-850 dark:bg-slate-950/20">
											<div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/20 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100/30">
												<Laptop className="h-3.5 w-3.5" />
											</div>
											<div className="space-y-0.5">
												<p className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">IT & Asset Clearance</p>
												<p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold leading-normal">
													All corporate assets (company laptop, ID badges, charger, accessory cables, access tokens) must be returned in good condition on or before your last day.
												</p>
											</div>
										</div>

										{/* F&F Settlement */}
										<div className="flex gap-3 p-3 rounded-xl border border-slate-100/50 bg-slate-50/20 dark:border-slate-850 dark:bg-slate-950/20">
											<div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-450 flex items-center justify-center shrink-0 border border-emerald-100/30">
												<CreditCard className="h-3.5 w-3.5" />
											</div>
											<div className="space-y-0.5">
												<p className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Full & Final (F&F)</p>
												<p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold leading-normal">
													The final settlement cycle, including salary calculations, leave encashments, and tax computations, is completed within 30 to 45 days after the exit date.
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</CardContent>
					</div>
				)}

				{hasPendingOrProcessing && (
					<div className="bg-amber-50/50 dark:bg-amber-950/25 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 shadow-[0_2px_8px_rgba(245,158,11,0.01)]">
						<p className="text-xs font-semibold text-amber-800 dark:text-amber-450 leading-relaxed flex items-center gap-2">
							<Info className="h-4 w-4 shrink-0 text-amber-500" />
							You have a resignation request that is currently pending or under processing. You can submit a new request only after the existing one is resolved.
						</p>
					</div>
				)}

				<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
					<SectionHeader
						icon={<FileText className="h-4.5 w-4.5" />}
						iconBg="bg-slate-50 dark:bg-slate-955/20"
						iconColor="text-slate-655 dark:text-slate-400"
						title="My Resignation History"
						sub="View status and details of your resignation requests."
					/>
					<CardContent className="p-0">
						{isLoading ? (
							<div className="py-12 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
								Loading...
							</div>
						) : resignations.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/20 dark:bg-slate-950/20">
								<div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-955/20 border border-slate-100/50 dark:border-slate-850 flex items-center justify-center mb-3">
									<FileText className="h-5 w-5 text-slate-400 dark:text-slate-600" />
								</div>
								<p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">No resignation requests yet.</p>
								<p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5 max-w-[200px]">Submit your resignation request above when needed</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<Table className='w-full'>
									<TableHeader>
										<TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-955/10">
											<TableHead className="font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Submitted</TableHead>
											<TableHead className="font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Last Working Day</TableHead>
											<TableHead className="font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Status</TableHead>
											<TableHead className="font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Reason Category</TableHead>
											<TableHead className="font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Statement Preview</TableHead>
											<TableHead className="font-black text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap w-[80px]">Action</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{resignations.map((r) => {
											const parsed = parseReason(r.reason);
											return (
												<TableRow key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/40 transition-colors">
													<TableCell className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-semibold">
														{formatDate(r.created_at)}
													</TableCell>
													<TableCell className="whitespace-nowrap text-xs text-slate-700 dark:text-slate-300 font-bold">
														{formatDate(r.last_working_day)}
													</TableCell>
													<TableCell className="whitespace-nowrap">
														{getStatusBadge(r.status)}
													</TableCell>
													<TableCell className="whitespace-nowrap text-xs text-slate-800 dark:text-slate-200 font-bold">
														{parsed.category}
													</TableCell>
													<TableCell className="max-w-[200px] truncate text-xs text-slate-500 dark:text-slate-450 font-semibold">
														{parsed.details || "—"}
													</TableCell>
													<TableCell>
														<Button
															variant="outline"
															size="sm"
															onClick={() => setSelectedResignation(r)}
															className="rounded-xl h-8 px-2.5 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all">
															View
														</Button>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</div>
			</div>

			<Dialog
				open={!!selectedResignation}
				onOpenChange={(open) => !open && setSelectedResignation(null)}>
				<DialogContent className="max-w-lg rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-950 p-6 shadow-2xl">
					<DialogHeader>
						<DialogTitle className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white">Resignation details</DialogTitle>
					</DialogHeader>
					{selectedResignation && (() => {
						const parsed = parseReason(selectedResignation.reason);
						return (
							<div className="space-y-4 py-2">
								<div className="rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/40 p-4 space-y-2.5">
									<div className="flex justify-between text-xs font-semibold text-slate-650 dark:text-slate-350">
										<span>Submitted</span>
										<span className="text-slate-800 dark:text-white font-bold">{formatDate(selectedResignation.created_at)}</span>
									</div>
									<div className="flex justify-between text-xs font-semibold text-slate-650 dark:text-slate-350">
										<span>Last working day</span>
										<span className="text-slate-800 dark:text-white font-bold">{formatDate(selectedResignation.last_working_day)}</span>
									</div>
									<div className="flex justify-between text-xs items-center font-semibold text-slate-650 dark:text-slate-350">
										<span>Status</span>
										{getStatusBadge(selectedResignation.status)}
									</div>
								</div>

								<div className="space-y-2">
									<Label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Departure Category</Label>
									<div className="rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/10 p-3 text-xs text-slate-800 dark:text-white font-bold">
										{parsed.category}
									</div>
								</div>

								<div className="space-y-2">
									<Label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">Detailed Statement</Label>
									<div className="rounded-xl border border-slate-100 dark:border-slate-800/60 p-3.5 text-xs text-slate-600 dark:text-slate-400 font-semibold whitespace-pre-wrap leading-relaxed">
										{parsed.details || "—"}
									</div>
								</div>

								{(selectedResignation.status === "accepted" ||
									selectedResignation.status === "rejected") && (
										<div className="rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/40 p-4">
											<p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
												This resignation was <span className="font-bold text-slate-800 dark:text-white">{selectedResignation.status}</span>
												{selectedResignation.reviewer && (
													<>
														{" "}by <span className="font-bold text-slate-800 dark:text-white">{selectedResignation.reviewer.first_name} {selectedResignation.reviewer.last_name}</span>
													</>
												)}
												{selectedResignation.reviewed_at && (
													<>
														{" "}on <span className="font-bold text-slate-850 dark:text-white">{formatDate(selectedResignation.reviewed_at)}</span>
													</>
												)}
												.
											</p>
											{selectedResignation.notes && (
												<p className="mt-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">Notes: <span className="italic">{selectedResignation.notes}</span></p>
											)}
										</div>
									)}
							</div>
						);
					})()}
				</DialogContent>
			</Dialog>
		</div>
	);
}
