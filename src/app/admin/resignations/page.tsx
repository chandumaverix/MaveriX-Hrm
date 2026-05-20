"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
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
	UserMinus,
	Search,
	Clock,
	CheckCircle2,
	XCircle,
	AlertCircle,
	X,
	Check,
	ClipboardCheck,
	Laptop,
	CreditCard,
	Calendar,
} from "lucide-react";
import type { Resignation, Employee } from "@/lib/types";
import { useUser } from "../../../contexts/user-context";

interface ResignationWithDetails extends Resignation {
	employee?: Employee;
	reviewer?: Employee;
}

const STAT_CONFIGS = [
	{
		key: "pending" as const,
		label: "Pending",
		sub: "Awaiting review",
		icon: Clock,
		bg: "from-slate-500/10 to-slate-500/5",
		iconBg: "bg-slate-500/15",
		iconColor: "text-slate-600",
		num: "text-slate-700",
		bar: "bg-slate-500",
	},
	{
		key: "processing" as const,
		label: "Processing",
		sub: "Under review",
		icon: AlertCircle,
		bg: "from-amber-500/10 to-amber-500/5",
		iconBg: "bg-amber-500/15",
		iconColor: "text-amber-600",
		num: "text-amber-700",
		bar: "bg-amber-500",
	},
	{
		key: "accepted" as const,
		label: "Accepted",
		sub: "Approved",
		icon: CheckCircle2,
		bg: "from-emerald-500/10 to-emerald-500/5",
		iconBg: "bg-emerald-500/15",
		iconColor: "text-emerald-600",
		num: "text-emerald-700",
		bar: "bg-emerald-500",
	},
	{
		key: "rejected" as const,
		label: "Rejected",
		sub: "Declined",
		icon: XCircle,
		bg: "from-rose-500/10 to-rose-500/5",
		iconBg: "bg-rose-500/15",
		iconColor: "text-rose-600",
		num: "text-rose-700",
		bar: "bg-rose-500",
	},
] as const;

type StatKey = (typeof STAT_CONFIGS)[number]["key"];

function StatCard({
	config,
	value,
	total,
}: {
	config: (typeof STAT_CONFIGS)[number];
	value: number;
	total: number;
}) {
	const Icon = config.icon;
	const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
	return (
		<div className='relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] group transition-all duration-350 hover:border-slate-200 dark:hover:border-slate-700/60'>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{config.label}</p>
					<p className='text-3xl font-black text-slate-800 dark:text-white leading-none mt-4 tabular-nums'>{value}</p>
					<p className="inline-block text-[9px] font-black uppercase tracking-wide border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded-md mt-2.5 text-slate-500 bg-slate-50 dark:bg-slate-950/40 w-fit">{config.sub}</p>
				</div>
				<div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.iconBg} ${config.iconColor} group-hover:scale-105 transition-transform duration-300`}>
					<Icon className="h-4 w-4" />
				</div>
			</div>
			<div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
				<div className={`h-full ${config.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
			</div>
		</div>
	);
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
		<div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-50 dark:border-slate-800/40">
			<div className="flex items-center gap-3">
				<div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
					{icon}
				</div>
				<div>
					<h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">{title}</h3>
					<p className="text-[10px] text-slate-400 font-bold mt-1 leading-normal">{sub}</p>
				</div>
			</div>
			{action}
		</div>
	);
}

export default function ResignationsPage() {
	const { employee: currentUser } = useUser();
	const [resignations, setResignations] = useState<ResignationWithDetails[]>(
		[]
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [isLoading, setIsLoading] = useState(true);
	const [selectedResignation, setSelectedResignation] =
		useState<ResignationWithDetails | null>(null);
	const [reviewNotes, setReviewNotes] = useState("");
	const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
	const [verifiedSteps, setVerifiedSteps] = useState({
		notice: false,
		kt: false,
		assets: false,
		fnf: false,
	});

	const [stats, setStats] = useState<Record<StatKey, number>>({
		pending: 0,
		processing: 0,
		accepted: 0,
		rejected: 0,
	});

	useEffect(() => {
		fetchResignations();
	}, []);

	const fetchResignations = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("resignations")
			.select(
				"*, employee:employees!resignations_employee_id_fkey(*), reviewer:employees!resignations_reviewed_by_fkey(*)"
			)
			.order("created_at", { ascending: false });

		const resignationData =
			(data as unknown as ResignationWithDetails[]) || [];
		setResignations(resignationData);

		setStats({
			pending: resignationData.filter((r) => r.status === "pending").length,
			processing: resignationData.filter((r) => r.status === "processing").length,
			accepted: resignationData.filter((r) => r.status === "accepted").length,
			rejected: resignationData.filter((r) => r.status === "rejected").length,
		});

		setIsLoading(false);
	};

	const handleUpdateStatus = async (
		status: "processing" | "accepted" | "rejected"
	) => {
		if (!selectedResignation) return;

		const supabase = createClient();

		await supabase
			.from("resignations")
			.update({
				status,
				notes: reviewNotes || null,
				reviewed_by: currentUser?.id,
				reviewed_at: new Date().toISOString(),
			})
			.eq("id", selectedResignation.id);

		if (status === "accepted") {
			await supabase
				.from("employees")
				.update({ is_active: false })
				.eq("id", selectedResignation.employee_id);
		}

		await fetchResignations();
		setSelectedResignation(null);
		setReviewNotes("");
	};

	const filteredResignations = resignations.filter((resignation) => {
		const matchesSearch =
			resignation.employee?.first_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			resignation.employee?.last_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase());
		const matchesStatus =
			statusFilter === "all" || resignation.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	const getStatusBadge = (status: string) => {
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
	};

	const calculateNoticeDays = (createdAt: string, lastWorkingDay: string) => {
		const created = new Date(createdAt);
		const lastDay = new Date(lastWorkingDay);
		const diffTime = lastDay.getTime() - created.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	};

	const totalResignations = resignations.length || 1;

	return (
		<div className="flex flex-col min-h-screen bg-transparent text-slate-800 dark:text-slate-200">
			<DashboardHeader
				title="Resignations"
				description="Manage employee resignations"
			/>

			<div className="flex-1 space-y-6 p-4 md:p-6 pb-20 md:pb-8">
				<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
					{STAT_CONFIGS.map((cfg) => (
						<StatCard
							key={cfg.key}
							config={cfg}
							value={stats[cfg.key]}
							total={totalResignations}
						/>
					))}
				</div>

				<Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
					<SectionHeader
						icon={<Search className="h-5 w-5" />}
						iconBg="bg-primary/10"
						iconColor="text-primary"
						title="Filters"
						sub="Search and filter resignation requests"
					/>
					<CardContent className="p-5">
						<div className="flex flex-wrap items-center gap-4">
							<div className="relative flex-1 min-w-[200px]">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input
									placeholder="Search employees..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-9 bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 focus:border-primary/50 focus:ring-primary/20 text-slate-800 dark:text-slate-200"
								/>
							</div>
							<Select
								value={statusFilter}
								onValueChange={setStatusFilter}>
								<SelectTrigger className="w-[150px] bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 rounded-xl h-10">
									<SelectValue placeholder="Filter status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="processing">Processing</SelectItem>
									<SelectItem value="accepted">Accepted</SelectItem>
									<SelectItem value="rejected">Rejected</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
					<SectionHeader
						icon={<UserMinus className="h-5 w-5" />}
						iconBg="bg-rose-500/15"
						iconColor="text-rose-600"
						title="Resignation Requests"
						sub={`${filteredResignations.length} request${filteredResignations.length !== 1 ? "s" : ""} found`}
					/>
					<CardContent className="p-0">
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<p className="text-muted-foreground">Loading...</p>
							</div>
						) : filteredResignations.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-muted/30">
								<div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-3">
									<UserMinus className="h-5 w-5 text-rose-500/70" />
								</div>
								<p className="text-sm font-medium">No resignation requests found</p>
								<p className="text-xs text-muted-foreground mt-1 max-w-[200px]">No requests match your current filters</p>
							</div>
						) : (
							<div className="w-full overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
											<TableHead className="font-bold px-6 py-3.5">Employee</TableHead>
											<TableHead className="font-bold px-4 py-3.5">Submitted</TableHead>
											<TableHead className="font-bold px-4 py-3.5">Last Working Day</TableHead>
											<TableHead className="font-bold px-4 py-3.5">Notice Period</TableHead>
											<TableHead className="font-bold px-4 py-3.5">Status</TableHead>
											<TableHead className="font-bold px-6 py-3.5 text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredResignations.map((resignation) => (
											<TableRow key={resignation.id} className='border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-colors'>
												<TableCell className='px-6 py-3.5'>
													<div className="flex items-center gap-3">
														<Avatar className="h-9 w-9 border border-slate-100 dark:border-slate-800 shadow-sm">
															{resignation.employee?.avatar_url && (
																<AvatarImage
																	height={32}
																	width={32}
																	className="object-cover"
																	src={resignation.employee.avatar_url}
																	alt="Profile Pic"
																/>
															)}
															<AvatarFallback className="text-xs bg-slate-100 text-slate-700">
																{resignation.employee?.first_name?.[0]}
																{resignation.employee?.last_name?.[0]}
															</AvatarFallback>
														</Avatar>
														<div>
															<p className="font-semibold text-sm">{resignation.employee?.first_name} {resignation.employee?.last_name}</p>
															<p className="text-xs text-muted-foreground">{resignation.employee?.designation}</p>
														</div>
													</div>
												</TableCell>
												<TableCell className="px-4 py-3.5 text-sm">
													{new Date(resignation.created_at).toLocaleDateString("en-IN", {
														day: "numeric",
														month: "short",
														year: "numeric",
													})}
												</TableCell>
												<TableCell className="px-4 py-3.5 text-sm">
													{new Date(resignation.last_working_day).toLocaleDateString("en-IN", {
														day: "numeric",
														month: "short",
														year: "numeric",
													})}
												</TableCell>
												<TableCell className="px-4 py-3.5">
													<Badge variant="outline" className="rounded-lg bg-slate-50 dark:bg-slate-950/40 border-slate-150 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">
														{calculateNoticeDays(resignation.created_at, resignation.last_working_day)} days
													</Badge>
												</TableCell>
												<TableCell className="px-4 py-3.5">{getStatusBadge(resignation.status)}</TableCell>
												<TableCell className="px-6 py-3.5 text-right">
													<Button
														size="sm"
														variant="outline"
														onClick={() => setSelectedResignation(resignation)}
														className="rounded-xl h-8 px-3 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98]">
														Review
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>

				{selectedResignation && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<div
							className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
							onClick={() => setSelectedResignation(null)}
						/>
						<div className="relative w-full max-w-4xl h-auto max-h-[90vh] bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border border-slate-100 dark:border-slate-800/40 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-250">
							{/* Header - Modern & Split Alignment */}
							<div className="px-6 py-4 border-b border-slate-50 dark:border-slate-850/40 flex items-center justify-between shrink-0">
								<div>
									<h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Review Resignation</h2>
									<p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage and update exit parameters for the team member</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setSelectedResignation(null)}
									className="rounded-full h-8 w-8 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 dark:text-slate-500 transition-colors"
								>
									<X className="h-4 w-4" />
								</Button>
							</div>

							{/* Content - Split Side Panel Layout */}
							<div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
								{/* Left Side Panel: Employee Profile & Status Stage */}
								<div className="w-full md:w-[260px] bg-slate-50/40 dark:bg-slate-950/20 md:border-r border-slate-100 dark:border-slate-800/40 p-6 flex flex-col justify-between shrink-0 gap-6">
									<div className="space-y-6">
										<div className="relative flex flex-col items-center text-center">
											<Avatar className="h-20 w-20 border-4 border-white dark:border-slate-800 shadow-md mb-3">
												{selectedResignation.employee?.avatar_url && (
													<AvatarImage
														className="object-cover"
														src={selectedResignation.employee.avatar_url}
														alt="Profile Pic"
													/>
												)}
												<AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
													{selectedResignation.employee?.first_name?.[0]}
													{selectedResignation.employee?.last_name?.[0]}
												</AvatarFallback>
											</Avatar>
											<div className="space-y-1">
												<p className="font-bold text-base leading-tight text-slate-800 dark:text-white">
													{selectedResignation.employee?.first_name} {selectedResignation.employee?.last_name}
												</p>
												<Badge className='capitalize bg-slate-100 dark:bg-slate-850/60 text-slate-600 dark:text-slate-350 border border-slate-200/40 dark:border-slate-800/40 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850/60 text-[10px] font-bold px-2 py-0.5 shadow-none'>
													{selectedResignation.employee?.designation}
												</Badge>
											</div>
										</div>

										<div className="space-y-2.5">
											<h3 className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-1">Stage</h3>
											<div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.008)]">
												<div className="flex justify-between items-center">
													<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</span>
													{getStatusBadge(selectedResignation.status)}
												</div>
												<div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
													<div
														className="h-full bg-primary"
														style={{ width: selectedResignation.status === 'pending' ? '25%' : selectedResignation.status === 'processing' ? '60%' : '100%' }}
													/>
												</div>
											</div>
										</div>
									</div>

									{selectedResignation.employee?.employee_id && (
										<div className="pt-4 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between text-[11px] font-bold">
											<span className="text-slate-450 uppercase text-[9px] tracking-wider">Employee ID</span>
											<span className="text-slate-600 dark:text-slate-450 tabular-nums bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
												{selectedResignation.employee.employee_id}
											</span>
										</div>
									)}
								</div>

								{/* Right Section: Details & Decisions */}
								<div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
									{/* Top stats row */}
									<div className="grid grid-cols-3 gap-3">
										{[
											{ label: "Submitted Date", value: new Date(selectedResignation.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
											{ label: "Requested Exit Date", value: new Date(selectedResignation.last_working_day).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
											{ label: "Notice Period Duration", value: `${calculateNoticeDays(selectedResignation.created_at, selectedResignation.last_working_day)} days` }
										].map((stat, i) => (
											<div key={i} className="rounded-xl bg-slate-50/40 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-850/30 p-3.5 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.005)]">
												<span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">{stat.label}</span>
												<p className="text-xs font-bold text-slate-800 dark:text-slate-200">{stat.value}</p>
											</div>
										))}
									</div>

									{/* Resignation Reason */}
									<div className="space-y-2">
										<h3 className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-1">Reason for Resignation</h3>
										<div className="rounded-xl border border-slate-100 dark:border-slate-850/40 p-4 text-xs bg-slate-50/20 dark:bg-slate-950/10 leading-relaxed relative overflow-hidden">
											<div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
											<p className="whitespace-pre-wrap text-slate-700 dark:text-slate-350 italic pl-1">"{selectedResignation.reason}"</p>
										</div>
									</div>

									{/* Status Decision Block */}
									<div className="pt-2">
										{selectedResignation.status === "pending" ||
											selectedResignation.status === "processing" ? (
											<div className="space-y-4">
												<div className="space-y-2">
													<h3 className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-1">Reviewer Decision Notes</h3>
													<Textarea
														placeholder="Enter official statement, exit instructions, or rejection rationale..."
														value={reviewNotes}
														onChange={(e) => setReviewNotes(e.target.value)}
														className="rounded-xl bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 focus:border-primary/50 focus:ring-primary/20 text-slate-850 dark:text-slate-200 resize-none p-3 text-xs min-h-[120px]"
													/>
												</div>

												<div className="flex gap-3 pt-2">
													{selectedResignation.status === "pending" && (
														<Button
															variant="secondary"
															size="sm"
															className="h-10 rounded-xl font-bold px-4 text-xs transition-all active:scale-[0.98] border border-slate-100 dark:border-slate-800/60"
															onClick={() => handleUpdateStatus("processing")}>
															Mark Processing
														</Button>
													)}
													<Button
														variant="outline"
														size="sm"
														className="flex-1 rounded-xl h-10 font-bold text-xs text-rose-600 border-rose-100 dark:border-rose-950/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all active:scale-[0.98]"
														onClick={() => handleUpdateStatus("rejected")}>
														Reject Exit
													</Button>
													<Button
														size="sm"
														className="flex-1 rounded-xl h-10 font-bold text-xs bg-emerald-600 hover:bg-emerald-650 text-white transition-all active:scale-[0.98]"
														onClick={() => {
															setVerifiedSteps({
																notice: false,
																kt: false,
																assets: false,
																fnf: false,
															});
															setIsVerifyDialogOpen(true);
														}}>
														Approve Exit
													</Button>
												</div>
											</div>
										) : (
											<div className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] space-y-4">
												<div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800/40 pb-3">
													<div className={`p-2 rounded-lg ${selectedResignation.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-650'}`}>
														{selectedResignation.status === 'accepted' ? <CheckCircle2 className="h-4.5 w-4.5" /> : <XCircle className="h-4.5 w-4.5" />}
													</div>
													<div className="flex-1">
														<p className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
															Resignation {selectedResignation.status === 'accepted' ? 'Approved' : 'Rejected'}
														</p>
														<p className="text-[10px] text-slate-400 font-bold mt-0.5">
															Reviewed by {selectedResignation.reviewer?.first_name} on {new Date(selectedResignation.reviewed_at!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
														</p>
													</div>
												</div>
												{selectedResignation.notes ? (
													<div className="space-y-1">
														<span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Official Statement</span>
														<p className="text-xs leading-relaxed text-slate-650 dark:text-slate-350 whitespace-pre-wrap font-semibold italic">
															"{selectedResignation.notes}"
														</p>
													</div>
												) : (
													<p className="text-xs leading-relaxed text-slate-400 font-semibold italic">
														No additional notes were recorded with this decision.
													</p>
												)}
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				<Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
					<DialogContent className="max-w-md rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-950 p-6 shadow-2xl z-[150]">
						<DialogHeader>
							<DialogTitle className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-2">
								<ClipboardCheck className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
								Exit Clearance Verification
							</DialogTitle>
							<DialogDescription className="text-[10px] text-slate-400 font-bold mt-1.5 leading-normal">
								Verify that the exit checklist steps for <span className="text-slate-700 dark:text-slate-350 font-extrabold">{selectedResignation?.employee?.first_name} {selectedResignation?.employee?.last_name}</span> are fully cleared before approving this resignation.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-3 py-4">
							{[
								{
									id: "notice",
									label: "Notice Period Verification",
									desc: "Confirm exit date meets requirements or waiver has been approved.",
									icon: Calendar,
									color: "text-blue-500",
									bg: "bg-blue-50/50 dark:bg-blue-950/20",
								},
								{
									id: "kt",
									label: "Knowledge Transfer (KT)",
									desc: "Verify exit handover documents and transition training sessions are completed.",
									icon: ClipboardCheck,
									color: "text-purple-500",
									bg: "bg-purple-50/50 dark:bg-purple-950/20",
								},
								{
									id: "assets",
									label: "IT & Asset Clearance",
									desc: "Confirm company laptop, access cards, and devices are returned.",
									icon: Laptop,
									color: "text-amber-500",
									bg: "bg-amber-50/50 dark:bg-amber-950/20",
								},
								{
									id: "fnf",
									label: "Full & Final Settlement (F&F)",
									desc: "Ensure payroll computations, tax balances, and final payout sheets are ready.",
									icon: CreditCard,
									color: "text-emerald-500",
									bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
								},
							].map((step) => {
								const IconComponent = step.icon;
								const isChecked = verifiedSteps[step.id as keyof typeof verifiedSteps];
								return (
									<button
										key={step.id}
										type="button"
										onClick={() => {
											setVerifiedSteps((prev) => ({
												...prev,
												[step.id]: !prev[step.id as keyof typeof verifiedSteps],
											}));
										}}
										className={`flex items-start text-left gap-3.5 p-3 rounded-xl border transition-all w-full ${
											isChecked
												? "bg-emerald-50/20 border-emerald-500/40 text-slate-800 dark:bg-emerald-950/10 dark:border-emerald-800/40 dark:text-white"
												: "bg-slate-50/20 border-slate-100 text-slate-655 hover:bg-slate-50/50 dark:bg-slate-900/10 dark:border-slate-800/60 dark:text-slate-400"
										}`}
									>
										<div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
											isChecked ? "bg-emerald-500 text-white border-emerald-500" : `${step.bg} ${step.color} border-slate-100/10`
										}`}>
											{isChecked ? <Check className="h-4 w-4" /> : <IconComponent className="h-4 w-4" />}
										</div>
										<div className="flex-1 space-y-0.5">
											<p className={`text-[10px] font-black uppercase tracking-wider ${isChecked ? 'text-emerald-650 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
												{step.label}
											</p>
											<p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-normal">
												{step.desc}
											</p>
										</div>
									</button>
								);
							})}
						</div>

						<div className="flex gap-3 pt-2">
							<Button
								variant="outline"
								className="flex-1 rounded-xl h-10 font-bold text-xs border border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-slate-700 dark:text-slate-200"
								onClick={() => setIsVerifyDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button
								className="flex-1 rounded-xl h-10 font-bold text-xs text-white transition-all bg-emerald-600 hover:bg-emerald-650 disabled:bg-slate-100 dark:disabled:bg-slate-950/20 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:opacity-50"
								disabled={
									!(
										verifiedSteps.notice &&
										verifiedSteps.kt &&
										verifiedSteps.assets &&
										verifiedSteps.fnf
									)
								}
								onClick={async () => {
									setIsVerifyDialogOpen(false);
									await handleUpdateStatus("accepted");
								}}
							>
								Confirm Approval
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
