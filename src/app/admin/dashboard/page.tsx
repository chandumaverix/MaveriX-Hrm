"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { UpcomingBirthdays } from "@/components/dashboard/upcoming-birthdays";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/user-context";
import {
	Users,
	Clock,
	Calendar,
	Megaphone,
	CheckCircle,
	Activity,
	UserPlus,
	LogIn,
	TrendingUp,
	ArrowRight,
	ShieldCheck,
} from "lucide-react";
import type {
	Employee,
	Announcement,
	LeaveRequest,
	Team,
	Attendance,
} from "@/lib/types";

interface TeamWithDetails extends Team {
	leader?: Employee;
	team_members?: { id: string; employee?: Employee }[];
}

// ── Stat Card ──────────────────────────────────────────────────────────────
const STAT_CONFIGS = [
	{
		key: "totalEmployees",
		label: "Total Employees",
		sub: "Active headcount",
		icon: Users,
		bg: "from-teal-500/10 to-teal-500/5",
		iconBg: "bg-teal-500/15",
		iconColor: "text-teal-600",
		num: "text-teal-700",
		bar: "bg-teal-500",
	},
	{
		key: "clockedIn",
		label: "Clocked In",
		sub: "Present today",
		icon: Clock,
		bg: "from-indigo-500/10 to-indigo-500/5",
		iconBg: "bg-indigo-500/15",
		iconColor: "text-indigo-600",
		num: "text-indigo-700",
		bar: "bg-indigo-500",
	},
	{
		key: "pendingLeaves",
		label: "Pending Leaves",
		sub: "Awaiting approval",
		icon: Calendar,
		bg: "from-amber-500/10 to-amber-500/5",
		iconBg: "bg-amber-500/15",
		iconColor: "text-amber-600",
		num: "text-amber-700",
		bar: "bg-amber-500",
	},
	{
		key: "onLeave",
		label: "On Leave",
		sub: "Today",
		icon: UserPlus,
		bg: "from-rose-500/10 to-rose-500/5",
		iconBg: "bg-rose-500/15",
		iconColor: "text-rose-600",
		num: "text-rose-700",
		bar: "bg-rose-500",
	},
	{
		key: "weeklyOff",
		label: "Week Off",
		sub: "Today",
		icon: TrendingUp,
		bg: "from-violet-500/10 to-violet-500/5",
		iconBg: "bg-violet-500/15",
		iconColor: "text-violet-600",
		num: "text-violet-700",
		bar: "bg-violet-500",
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
					<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{config.label}
					</p>
					<p className={`text-4xl font-bold mt-2 tabular-nums leading-none ${config.num}`}>
						{value}
					</p>
					<p className="text-[11px] text-muted-foreground mt-1.5">{config.sub}</p>
				</div>
				<div
					className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconBg} ${config.iconColor} group-hover:scale-110 transition-transform duration-200`}
				>
					<Icon className="h-5 w-5" />
				</div>
			</div>
			{/* Progress bar */}
			<div className="mt-4 h-1 w-full bg-black/5 rounded-full overflow-hidden">
				<div
					className={`h-full ${config.bar} rounded-full transition-all duration-700`}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

// ── Card Section Header ────────────────────────────────────────────────────
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
				<div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
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

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
	const { employee } = useUser();
	const [stats, setStats] = useState<Record<StatKey, number>>({
		totalEmployees: 0,
		clockedIn: 0,
		pendingLeaves: 0,
		onLeave: 0,
		weeklyOff: 0,
	});
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [pendingLeaves, setPendingLeaves] = useState<
		(LeaveRequest & { employee?: Employee })[]
	>([]);
	const [teams, setTeams] = useState<TeamWithDetails[]>([]);
	const [todayActivities, setTodayActivities] = useState<
		(Attendance & { employee?: Employee })[]
	>([]);

	function todayLocalStr() {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	}

	useEffect(() => {
		const fetchData = async () => {
			const supabase = createClient();
			const today = todayLocalStr();
			const dayOfWeek = new Date().getDay();

			const { count: empCount } = await supabase
				.from("employees")
				.select("*", { count: "exact", head: true })
				.eq("is_active", true)
				.in("role", ["employee", "hr"]);

			const { data: attData } = await supabase
				.from("attendance")
				.select("*, employee:employees(*)")
				.eq("date", today)
				.in("status", ["present", "late"]);

			const { data: pendingData } = await supabase
				.from("leave_requests")
				.select(
					"*, employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name), leave_types(*)"
				)
				.eq("status", "pending")
				.order("created_at", { ascending: false })
				.limit(10);

			const { count: leaveCount } = await supabase
				.from("leave_requests")
				.select("*", { count: "exact", head: true })
				.eq("status", "approved")
				.lte("start_date", today)
				.gte("end_date", today);

			const { data: empData } = await supabase
				.from("employees")
				.select("id")
				.eq("is_active", true)
				.eq("week_off_day", dayOfWeek);

			const { data: announcementsData } = await supabase
				.from("announcements")
				.select("*")
				.order("date", { ascending: false })
				.limit(10);

			const { data: teamsData } = await supabase
				.from("teams")
				.select(
					"*, leader:employees!teams_leader_id_fkey(*), team_members(*, employee:employees(*))"
				)
				.order("created_at", { ascending: false })
				.limit(8);

			const { data: activityData } = await supabase
				.from("attendance")
				.select("*, employee:employees(*)")
				.eq("date", today)
				.order("clock_in", { ascending: false })
				.limit(10);

			setStats({
				totalEmployees: empCount || 0,
				clockedIn: (attData || []).length,
				pendingLeaves: (pendingData || []).length,
				onLeave: leaveCount || 0,
				weeklyOff: (empData || []).length,
			});
			const rawPending = (pendingData || []) as Record<string, unknown>[];
			setPendingLeaves(
				rawPending.map((row) => ({
					...row,
					employee:
						(row.employee as Employee) ??
						(row.employees as Employee) ??
						undefined,
					leave_type:
						(row.leave_type as { name?: string }) ??
						(row.leave_types as { name?: string }) ??
						undefined,
				})) as (LeaveRequest & { employee?: Employee })[]
			);
			setAnnouncements((announcementsData as Announcement[]) || []);
			setTeams((teamsData as TeamWithDetails[]) || []);
			setTodayActivities(
				(activityData as (Attendance & { employee?: Employee })[]) || []
			);
		};
		fetchData();
	}, []);

	const handleLeaveAction = async (
		id: string,
		status: "approved" | "rejected"
	) => {
		const supabase = createClient();
		await supabase
			.from("leave_requests")
			.update({
				status,
				reviewed_by: employee?.id,
				reviewed_at: new Date().toISOString(),
			})
			.eq("id", id);
		setPendingLeaves((prev) => prev.filter((l) => l.id !== id));
		setStats((s) => ({
			...s,
			pendingLeaves: Math.max(0, s.pendingLeaves - 1),
		}));
	};

	const formatTime = (s: string | null) =>
		s
			? new Date(s).toLocaleTimeString("en-US", {
					hour: "2-digit",
					minute: "2-digit",
			  })
			: "–";

	const hour = new Date().getHours();
	const greeting =
		hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

	return (
		<div className="flex flex-col min-h-full bg-background">
			<DashboardHeader
				title="Admin Dashboard"
				description={`Welcome back, ${employee?.first_name || "Admin"}`}
			/>

			<div className="flex-1 space-y-6 p-4 md:p-6 pb-20 md:pb-8">

				{/* ── Welcome Banner ── */}
				<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-[#020286] px-6 py-5 text-white shadow-md">
					<div className="flex items-center justify-between gap-4">
						<div>
							<div className="flex items-center gap-2 mb-1">
								<ShieldCheck className="h-4 w-4 opacity-80" />
								<span className="text-xs font-medium opacity-80 uppercase tracking-wider">Admin Portal</span>
							</div>
							<h2 className="text-xl font-bold">{greeting}, {employee?.first_name || "Admin"} 👋</h2>
							<p className="text-sm opacity-75 mt-0.5">
								{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
							</p>
						</div>
						<div className="hidden sm:flex items-center gap-3">
							<div className="text-right">
								<p className="text-xs opacity-75">Pending Actions</p>
								<p className="text-3xl font-bold tabular-nums">{stats.pendingLeaves}</p>
								<p className="text-xs opacity-75">leave requests</p>
							</div>
						</div>
					</div>
					{/* Decorative circles */}
					<div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
					<div className="pointer-events-none absolute -right-4 top-8 h-24 w-24 rounded-full bg-white/5" />
				</div>

				{/* Top Info Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
					{STAT_CONFIGS.map((cfg) => (
						<StatCard
							key={cfg.key}
							config={cfg}
							value={stats[cfg.key]}
							total={stats.totalEmployees || 1}
						/>
					))}
				</div>

				{/* ── Announcements | Pending Leaves ── */}
				<div className="grid gap-5 lg:grid-cols-2">
					{/* Announcements */}
					<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
						<SectionHeader
							icon={<Megaphone className="h-5 w-5" />}
							iconBg="bg-primary/10"
							iconColor="text-primary"
							title="Announcements"
							sub={`${announcements.length} announcement${announcements.length !== 1 ? "s" : ""}`}
							action={
								<Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" asChild>
									<Link href="/admin/announcements">
										Manage <ArrowRight className="h-3 w-3" />
									</Link>
								</Button>
							}
						/>
						<div className="p-4">
							{announcements.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-muted/30">
									<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
										<Megaphone className="h-6 w-6 text-primary/50" />
									</div>
									<p className="text-sm font-medium">No announcements yet</p>
									<p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
										Create and manage from the announcements page
									</p>
									<Button size="sm" className="mt-4 rounded-xl" asChild>
										<Link href="/admin/announcements">Go to Announcements</Link>
									</Button>
								</div>
							) : (
								<div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
									{announcements.slice(0, 5).map((a) => (
										<div
											key={a.id}
											className="flex gap-3 rounded-xl p-3 hover:bg-muted/40 transition-colors group cursor-default"
										>
											<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<Megaphone className="h-4 w-4" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-semibold line-clamp-1 text-foreground">
													{a.title || "Announcement"}
												</p>
												<p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
													{a.content}
												</p>
												<p className="text-[10px] text-muted-foreground/70 mt-1 font-medium">
													{a.date}
												</p>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Pending Leaves */}
					<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
						<SectionHeader
							icon={<Calendar className="h-5 w-5" />}
							iconBg="bg-amber-500/15"
							iconColor="text-amber-600"
							title="Pending Leave Requests"
							sub={`${pendingLeaves.length} request${pendingLeaves.length !== 1 ? "s" : ""} awaiting approval`}
							action={
								pendingLeaves.length > 0 ? (
									<Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" asChild>
										<Link href="/admin/leave">
											View all <ArrowRight className="h-3 w-3" />
										</Link>
									</Button>
								) : undefined
							}
						/>
						<div className="p-4">
							{pendingLeaves.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-muted/30">
									<div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
										<CheckCircle className="h-6 w-6 text-emerald-500/70" />
									</div>
									<p className="text-sm font-medium">All clear!</p>
									<p className="text-xs text-muted-foreground mt-1">No pending leave requests</p>
								</div>
							) : (
								<div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
									{pendingLeaves.map((leave) => (
										<div
											key={leave.id}
											className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background p-3 hover:border-amber-300/70 hover:bg-amber-50/30 transition-all duration-150"
										>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-semibold truncate text-foreground">
													{leave.employee?.first_name} {leave.employee?.last_name}
												</p>
												<p className="text-xs text-muted-foreground mt-0.5">
													{(leave as unknown as { leave_type?: { name?: string } }).leave_type?.name ?? "Leave"}{" "}
													· {leave.start_date} → {leave.end_date}
												</p>
											</div>
											<div className="flex shrink-0 gap-1.5">
												<button
													onClick={() => handleLeaveAction(leave.id, "rejected")}
													className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-background text-muted-foreground hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors cursor-pointer"
												>
													Reject
												</button>
												<button
													onClick={() => handleLeaveAction(leave.id, "approved")}
													className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
												>
													Approve
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* ── Today's Activity | Teams | Birthdays ── */}
				<div className="grid gap-5 lg:grid-cols-3 items-start">
					{/* Activity */}
					<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
						<SectionHeader
							icon={<Activity className="h-5 w-5" />}
							iconBg="bg-sky-500/15"
							iconColor="text-sky-600"
							title="Today's Activity"
							sub={`${todayActivities.length} check-in${todayActivities.length !== 1 ? "s" : ""} today`}
						/>
						<div className="p-4">
							{todayActivities.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-muted/20">
									<div className="h-12 w-12 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-3">
										<LogIn className="h-5 w-5 text-sky-500/70" />
									</div>
									<p className="text-sm font-medium">No activity yet</p>
									<p className="text-xs text-muted-foreground mt-1 max-w-[160px]">
										Clock-in events will appear here
									</p>
								</div>
							) : (
								<ul className="space-y-1.5 max-h-[370px] overflow-y-auto pr-1">
									{todayActivities.map((a) => (
										<li
											key={a.id}
											className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/70 p-2.5 hover:bg-muted/30 transition-colors"
										>
											<Avatar className="h-9 w-9 shrink-0 border-2 border-background shadow-sm">
												{a.employee?.avatar_url && (
													<AvatarImage
														height={36}
														width={36}
														className="object-cover"
														src={a.employee.avatar_url}
														alt={`${a.employee.first_name}`}
													/>
												)}
												<AvatarFallback className="text-xs font-semibold bg-muted">
													{a.employee?.first_name?.[0]}
													{a.employee?.last_name?.[0]}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-semibold truncate text-foreground">
													{a.employee?.first_name} {a.employee?.last_name}
												</p>
												<p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
													<Clock className="h-3 w-3 shrink-0" />
													{formatTime(a.clock_in)}
													{a.total_hours != null && (
														<>
															<span className="text-border">·</span>
															<span>{a.total_hours}h</span>
														</>
													)}
												</p>
											</div>
											<span
												className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
													a.status === "present"
														? "bg-emerald-50 text-emerald-700 border border-emerald-200"
														: "bg-amber-50 text-amber-700 border border-amber-200"
												}`}
											>
												{a.status === "present" ? "Present" : "Late"}
											</span>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>

					{/* Teams */}
					<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
						<SectionHeader
							icon={<Users className="h-5 w-5" />}
							iconBg="bg-violet-500/15"
							iconColor="text-violet-600"
							title="Teams"
							sub={`${teams.length} team${teams.length !== 1 ? "s" : ""} active`}
							action={
								<Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" asChild>
									<Link href="/admin/teams">
										View all <ArrowRight className="h-3 w-3" />
									</Link>
								</Button>
							}
						/>
						<div className="p-4">
							{teams.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-muted/20">
									<p className="text-sm font-medium text-muted-foreground">No teams yet</p>
								</div>
							) : (
								<ul className="space-y-1.5 max-h-[370px] overflow-y-auto pr-1">
									{teams.map((team) => (
										<li
											key={team.id}
											className="flex items-center gap-3 rounded-xl border border-border/40 p-2.5 hover:bg-muted/30 transition-colors"
										>
											<Avatar className="h-9 w-9 shrink-0">
												{team.leader?.avatar_url && (
													<AvatarImage
														height={36}
														width={36}
														className="object-cover"
														src={team.leader.avatar_url}
														alt="Leader"
													/>
												)}
												<AvatarFallback className="text-xs bg-violet-500/15 text-violet-600 font-semibold">
													{team.leader?.first_name?.[0]}
													{team.leader?.last_name?.[0]}
													{!team.leader && team.name?.[0]}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-semibold truncate text-foreground">{team.name}</p>
												<p className="text-xs text-muted-foreground">
													{team.team_members?.length ?? 0} members
												</p>
											</div>
											<span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[10px] font-semibold text-violet-700">
												{team.team_members?.length ?? 0}
											</span>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>

					{/* Birthdays */}
					<UpcomingBirthdays />
				</div>
			</div>
		</div>
	);
}
