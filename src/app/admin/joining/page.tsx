"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
	CalendarDays,
	Search,
	UserPlus,
	Cake,
	Briefcase,
	Award,
} from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { cn } from "@/lib/utils";

interface EmployeeJoining {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	designation: string | null;
	avatar_url: string | null;
	joining_date: string | null;
	role: string;
}

function getDuration(joiningDate: string): { years: number; months: number; days: number } {
	const start = new Date(joiningDate);
	const now = new Date();

	let years = now.getFullYear() - start.getFullYear();
	let months = now.getMonth() - start.getMonth();
	let days = now.getDate() - start.getDate();

	if (days < 0) {
		months--;
		const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
		days += prevMonth.getDate();
	}
	if (months < 0) {
		years--;
		months += 12;
	}

	return { years, months, days };
}

function formatDuration(joiningDate: string): string {
	const { years, months, days } = getDuration(joiningDate);
	const parts: string[] = [];
	if (years > 0) parts.push(`${years} yr${years !== 1 ? "s" : ""}`);
	if (months > 0) parts.push(`${months} mo${months !== 1 ? "s" : ""}`);
	if (days > 0 || parts.length === 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
	return parts.join(" ");
}

function getGroupLabel(joiningDate: string): string {
	const { years } = getDuration(joiningDate);
	if (years < 1) return "Less than 1 year";
	if (years < 2) return "1 year";
	if (years < 3) return "2 years";
	if (years < 5) return "3–5 years";
	return "5+ years";
}

function getGroupOrder(joiningDate: string): number {
	const { years } = getDuration(joiningDate);
	if (years < 1) return 0;
	if (years < 2) return 1;
	if (years < 3) return 2;
	if (years < 5) return 3;
	return 4;
}

export default function EmployeeJoiningPage() {
	const { employee: currentUser } = useUser();
	const [employees, setEmployees] = useState<EmployeeJoining[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // 0-11 or null for All

	const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	useEffect(() => {
		fetchEmployees();
	}, []);

	const fetchEmployees = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select("id, first_name, last_name, email, designation, avatar_url, joining_date, role")
			.eq("is_active", true)
			.neq("role", "admin")
			.not("joining_date", "is", null)
			.order("first_name", { ascending: true });

		setEmployees((data as EmployeeJoining[]) || []);
		setIsLoading(false);
	};

	const filteredEmployees = useMemo(() => {
		let result = employees;

		// Month filter
		if (selectedMonth !== null) {
			result = result.filter((emp) => {
				if (!emp.joining_date) return false;
				return new Date(emp.joining_date).getMonth() === selectedMonth;
			});
		}

		// Search filter
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(emp) =>
				emp.first_name.toLowerCase().includes(q) ||
				emp.last_name.toLowerCase().includes(q) ||
				emp.designation?.toLowerCase().includes(q) ||
				emp.email.toLowerCase().includes(q)
			);
		}

		return result;
	}, [employees, searchQuery, selectedMonth]);

	const groupedEmployees = useMemo(() => {
		const groups = new Map<string, EmployeeJoining[]>();
		for (const emp of filteredEmployees) {
			if (!emp.joining_date) continue;
			const label = getGroupLabel(emp.joining_date);
			if (!groups.has(label)) groups.set(label, []);
			groups.get(label)!.push(emp);
		}
		const sorted = Array.from(groups.entries()).sort(
			(a, b) => getGroupOrder(a[1][0].joining_date!) - getGroupOrder(b[1][0].joining_date!)
		);
		return sorted;
	}, [filteredEmployees]);

	const totalEmployees = filteredEmployees.length;
	const newestEmployee = filteredEmployees.reduce<EmployeeJoining | null>((newest, emp) => {
		if (!emp.joining_date) return newest;
		if (!newest || new Date(emp.joining_date) > new Date(newest.joining_date!)) return emp;
		return newest;
	}, null);
	const longestEmployee = filteredEmployees.reduce<EmployeeJoining | null>((oldest, emp) => {
		if (!emp.joining_date) return oldest;
		if (!oldest || new Date(emp.joining_date) < new Date(oldest.joining_date!)) return emp;
		return oldest;
	}, null);

	return (
		<div className="flex flex-col">
			<DashboardHeader
				title="Employee Joining"
				description="Track employee tenure and joining dates"
			/>

			<div className="flex-1 space-y-5 p-6">
				{/* Stats Row */}
				<div className="grid gap-4 grid-cols-1 md:grid-cols-3">
					<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-border/50 p-5 shadow-sm">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Employees</p>
								<p className="text-3xl font-bold mt-1 tabular-nums text-primary leading-none">{totalEmployees}</p>
								<p className="text-[11px] text-muted-foreground mt-1.5">With joining dates</p>
							</div>
							<div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary"><UserPlus className="h-5 w-5" /></div>
						</div>
					</div>
					<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-border/50 p-5 shadow-sm">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Newest Member</p>
								<p className="text-lg font-bold mt-1 text-emerald-700 leading-tight truncate">
									{newestEmployee ? `${newestEmployee.first_name} ${newestEmployee.last_name}` : "—"}
								</p>
								<p className="text-[11px] text-muted-foreground mt-1">
									{newestEmployee?.joining_date
										? new Date(newestEmployee.joining_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
										: ""}
								</p>
							</div>
							<div className="h-11 w-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600"><Cake className="h-5 w-5" /></div>
						</div>
					</div>
					<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-border/50 p-5 shadow-sm">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Longest Serving</p>
								<p className="text-lg font-bold mt-1 text-amber-700 leading-tight truncate">
									{longestEmployee ? `${longestEmployee.first_name} ${longestEmployee.last_name}` : "—"}
								</p>
								<p className="text-[11px] text-muted-foreground mt-1">
									{longestEmployee?.joining_date ? formatDuration(longestEmployee.joining_date) : ""}
								</p>
							</div>
							<div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600"><Briefcase className="h-5 w-5" /></div>
						</div>
					</div>
				</div>

				{/* Search + Month Filter */}
				<div className="space-y-3">
					<div className="relative max-w-md">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search by name, designation, or email..."
							className="pl-9 bg-muted/50"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<div className="flex flex-wrap gap-1.5">
						<button
							onClick={() => setSelectedMonth(null)}
							className={cn(
								"px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
								selectedMonth === null
									? "bg-primary text-primary-foreground shadow-sm"
									: "bg-muted/60 text-muted-foreground hover:bg-muted"
							)}
						>
							All
						</button>
						{MONTHS.map((month, idx) => (
							<button
								key={idx}
								onClick={() => setSelectedMonth(selectedMonth === idx ? null : idx)}
								className={cn(
									"px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
									selectedMonth === idx
										? "bg-primary text-primary-foreground shadow-sm"
										: "bg-muted/60 text-muted-foreground hover:bg-muted"
								)}
							>
								{month}
							</button>
						))}
					</div>
				</div>

				{/* Employee Cards grouped by tenure */}
				{isLoading ? (
					<div className="flex items-center justify-center py-16">
						<div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
					</div>
				) : filteredEmployees.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-4" />
						<p className="text-sm font-medium text-muted-foreground">
							{searchQuery ? "No employees match your search" : "No employees with joining dates found"}
						</p>
					</div>
				) : (
					<div className="space-y-6">
						{groupedEmployees.map(([groupLabel, emps]) => (
							<div key={groupLabel}>
								<div className="flex items-center gap-3 mb-3">
									<div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
										<CalendarDays className="h-3.5 w-3.5" />
									</div>
									<h3 className="text-sm font-semibold text-foreground">{groupLabel}</h3>
									<span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{emps.length}</span>
								</div>
								<div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
									{emps.map((emp) => {
										const initials = `${emp.first_name?.[0] || ""}${emp.last_name?.[0] || ""}`.toUpperCase();
										const yearsCompleted = emp.joining_date ? getDuration(emp.joining_date).years : 0;
										
										const isAnniversary = emp.joining_date 
											? new Date(emp.joining_date).getMonth() === new Date().getMonth() && 
											  new Date(emp.joining_date).getDate() === new Date().getDate() &&
											  yearsCompleted >= 0
											: false;

										return (
											<div
												key={emp.id}
												className={cn(
													"group relative overflow-hidden rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all",
													isAnniversary 
														? "border-amber-400/60 bg-gradient-to-br from-amber-50/80 to-yellow-50/30 dark:from-amber-950/40 dark:to-amber-900/10 ring-1 ring-amber-400/30" 
														: "border-border/50 bg-card"
												)}
											>
												<div className="flex items-start gap-3">
													<div className="relative shrink-0">
														<Avatar className="h-11 w-11">
															{emp.avatar_url ? (
																<AvatarImage src={emp.avatar_url} alt={`${emp.first_name} ${emp.last_name}`} className="object-cover" />
															) : null}
															<AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
																{initials || "?"}
															</AvatarFallback>
														</Avatar>
														{yearsCompleted >= 1 && (
															<span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 border-2 border-card shadow-sm">
																<Award className="h-2.5 w-2.5 text-white" />
															</span>
														)}
													</div>
													<div className="min-w-0 flex-1">
														<div className="flex items-center gap-2">
															<p className="font-semibold text-sm truncate">
																{emp.first_name} {emp.last_name}
															</p>
															{yearsCompleted >= 1 && (
																<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-bold shrink-0">
																	<Award className="h-2.5 w-2.5" />
																	{yearsCompleted} yr{yearsCompleted !== 1 ? "s" : ""}
																</span>
															)}
														</div>
														<p className="text-xs text-muted-foreground truncate">
															{emp.designation || emp.email}
														</p>
													</div>
												</div>
												<div className="mt-3 flex items-center justify-between gap-2">
													<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
														<CalendarDays className="h-3 w-3" />
														<span>
															{new Date(emp.joining_date!).toLocaleDateString("en-US", {
																day: "numeric",
																month: "short",
																year: "numeric",
															})}
														</span>
													</div>
													<span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
														{formatDuration(emp.joining_date!)}
													</span>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
