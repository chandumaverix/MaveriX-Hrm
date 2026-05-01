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
// import {
// 	Dialog,
// 	DialogContent,
// 	DialogDescription,
// 	DialogHeader,
// 	DialogTitle,
// } from "@/components/ui/dialog";
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
		<div
			className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.bg} border border-border/50 p-5 shadow-sm hover:shadow-md transition-all duration-200 group`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{config.label}</p>
					<p className={`text-4xl font-bold mt-2 tabular-nums leading-none ${config.num}`}>{value}</p>
					<p className="text-[11px] text-muted-foreground mt-1.5">{config.sub}</p>
				</div>
				<div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconBg} ${config.iconColor} group-hover:scale-110 transition-transform duration-200`}>
					<Icon className="h-5 w-5" />
				</div>
			</div>
			<div className="mt-4 h-1 w-full bg-black/5 rounded-full overflow-hidden">
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
		<div className="flex flex-col min-h-full bg-background">
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

				<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
					<SectionHeader
						icon={<Search className="h-5 w-5" />}
						iconBg="bg-primary/10"
						iconColor="text-primary"
						title="Filters"
						sub="Search and filter resignation requests"
					/>
					<CardContent className="p-4">
						<div className="flex flex-wrap items-center gap-4">
							<div className="relative flex-1 min-w-[200px]">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder="Search employees..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-9 rounded-xl"
								/>
							</div>
							<Select
								value={statusFilter}
								onValueChange={setStatusFilter}>
								<SelectTrigger className="w-[150px] rounded-xl">
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
				</div>

				<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
					<SectionHeader
						icon={<UserMinus className="h-5 w-5" />}
						iconBg="bg-rose-500/15"
						iconColor="text-rose-600"
						title="Resignation Requests"
						sub={`${filteredResignations.length} request${filteredResignations.length !== 1 ? "s" : ""} found`}
					/>
					<CardContent className="p-4">
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
							<div className="w-[300px] md:w-full overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employee</TableHead>
											<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted</TableHead>
											<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Working Day</TableHead>
											<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notice Period</TableHead>
											<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
											<TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredResignations.map((resignation) => (
											<TableRow key={resignation.id} className="hover:bg-muted/30 transition-colors">
												<TableCell>
													<div className="flex items-center gap-3">
														<Avatar className="h-9 w-9 border border-border shadow-sm">
															{resignation.employee?.avatar_url && (
																<AvatarImage
																	height={32}
																	width={32}
																	className="object-cover"
																	src={resignation.employee.avatar_url}
																	alt="Profile Pic"
																/>
															)}
															<AvatarFallback className="text-xs bg-muted">
																{resignation.employee?.first_name?.[0]}
																{resignation.employee?.last_name?.[0]}
															</AvatarFallback>
														</Avatar>
														<div>
															<p className="font-medium text-sm">{resignation.employee?.first_name} {resignation.employee?.last_name}</p>
															<p className="text-xs text-muted-foreground">{resignation.employee?.designation}</p>
														</div>
													</div>
												</TableCell>
												<TableCell className="text-sm">
													{new Date(resignation.created_at).toLocaleDateString("en-IN", {
														day: "numeric",
														month: "short",
														year: "numeric",
													})}
												</TableCell>
												<TableCell className="text-sm">
													{new Date(resignation.last_working_day).toLocaleDateString("en-IN", {
														day: "numeric",
														month: "short",
														year: "numeric",
													})}
												</TableCell>
												<TableCell>
													<Badge variant="outline" className="rounded-lg">
														{calculateNoticeDays(resignation.created_at, resignation.last_working_day)} days
													</Badge>
												</TableCell>
												<TableCell>{getStatusBadge(resignation.status)}</TableCell>
												<TableCell>
													<Button
														size="sm"
														variant="outline"
														onClick={() => setSelectedResignation(resignation)}
														className="rounded-xl">
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
				</div>

				{selectedResignation && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<div
							className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
							onClick={() => setSelectedResignation(null)}
						/>
						<div className="relative w-[85%] max-w-5xl h-[80vh] bg-background rounded-[1.5rem] shadow-xl border border-border/50 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
							{/* Header - Compact */}
							<div className="px-6 py-4 border-b border-border/50 bg-muted/5 flex items-center justify-between shrink-0">
								<div>
									<h2 className="text-lg font-bold tracking-tight">Review Resignation</h2>
									<p className="text-xs text-muted-foreground">Process resignation request for {selectedResignation.employee?.first_name}</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setSelectedResignation(null)}
									className="rounded-full h-8 w-8 hover:bg-rose-500/10 hover:text-rose-500"
								>
									<XCircle className="h-5 w-5" />
								</Button>
							</div>

							{/* Content - Compact */}
							<div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
								<div className="flex flex-col lg:flex-row gap-6 h-full">
									{/* Left Section: Compact Profile */}
									<div className="lg:w-[260px] space-y-5 shrink-0">
										<div className="relative flex flex-col items-center text-center p-5 rounded-2xl bg-card border border-border/50 shadow-sm">
											<Avatar className="h-20 w-20 border-4 border-background shadow-lg mb-3">
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
												<p className="font-bold text-base leading-tight">{selectedResignation.employee?.first_name} {selectedResignation.employee?.last_name}</p>
												<p className="text-[11px] font-semibold text-primary bg-primary/10 py-0.5 px-2.5 rounded-full inline-block">
													{selectedResignation.employee?.designation}
												</p>
											</div>
										</div>

										<div className="space-y-3">
											<h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Stage</h3>
											<div className="rounded-xl border border-border/40 p-4 bg-muted/5 space-y-4">
												<div className="flex justify-between items-center">
													<span className="text-xs font-medium text-muted-foreground">Status</span>
													{getStatusBadge(selectedResignation.status)}
												</div>
												<div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
													<div
														className="h-full bg-primary"
														style={{ width: selectedResignation.status === 'pending' ? '25%' : selectedResignation.status === 'processing' ? '60%' : '100%' }}
													/>
												</div>
											</div>
										</div>
									</div>

									{/* Right Section: Compact Details */}
									<div className="flex-1 space-y-5">
										<div className="grid grid-cols-3 gap-3">
											{[
												{ label: "Submitted", value: new Date(selectedResignation.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) },
												{ label: "Exit Date", value: new Date(selectedResignation.last_working_day).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) },
												{ label: "Notice", value: `${calculateNoticeDays(selectedResignation.created_at, selectedResignation.last_working_day)}d` }
											].map((stat, i) => (
												<div key={i} className="rounded-xl bg-card border border-border/50 p-3 shadow-sm">
													<span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">{stat.label}</span>
													<p className="text-sm font-bold text-foreground">{stat.value}</p>
												</div>
											))}
										</div>

										<div className="space-y-2">
											<h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Reason</h3>
											<div className="rounded-xl border border-border/50 p-4 text-sm bg-muted/5 min-h-[auto] leading-relaxed relative">
												<div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
												<p className="whitespace-pre-wrap text-foreground/90 italic">"{selectedResignation.reason}"</p>
											</div>
										</div>

										<div className="pt-2">
											{selectedResignation.status === "pending" ||
												selectedResignation.status === "processing" ? (
												<div className="space-y-4">
													<div className="space-y-2">
														<h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Reviewer Notes</h3>
														<Textarea
															placeholder="Enter decision rationale..."
															value={reviewNotes}
															onChange={(e) => setReviewNotes(e.target.value)}
															className="rounded-xl bg-card border-border/60 shadow-sm resize-none p-3 text-xs min-h-[80px]"
														/>
													</div>

													<div className="flex gap-3 pt-2">
														{selectedResignation.status === "pending" && (
															<Button
																variant="secondary"
																size="sm"
																className="h-10 rounded-lg font-bold px-4"
																onClick={() => handleUpdateStatus("processing")}>
																Process
															</Button>
														)}
														<Button
															variant="outline"
															size="sm"
															className="flex-1 rounded-lg h-10 font-bold text-rose-600 border-rose-200"
															onClick={() => handleUpdateStatus("rejected")}>
															Reject
														</Button>
														<Button
															size="sm"
															className="flex-1 rounded-lg h-10 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
															onClick={() => handleUpdateStatus("accepted")}>
															Accept
														</Button>
													</div>
												</div>
											) : (
												<div className="rounded-xl bg-muted/30 border border-border/50 p-4">
													<div className="flex items-center gap-3">
														<div className={`p-2 rounded-lg ${selectedResignation.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
															{selectedResignation.status === 'accepted' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
														</div>
														<div className="flex-1">
															<p className="text-xs font-bold leading-tight capitalize">{selectedResignation.status}</p>
															<p className="text-[10px] text-muted-foreground">
																{selectedResignation.reviewer?.first_name} on {new Date(selectedResignation.reviewed_at!).toLocaleDateString()}
															</p>
														</div>
													</div>
													{selectedResignation.notes && (
														<p className="mt-2 text-xs text-foreground/70 border-t border-border/40 pt-2 italic">"{selectedResignation.notes}"</p>
													)}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
