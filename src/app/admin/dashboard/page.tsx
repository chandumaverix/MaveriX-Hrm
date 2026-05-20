"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UpcomingBirthdays } from "@/components/dashboard/upcoming-birthdays";
import { EmployeeSearchInput } from "@/components/dashboard/employee-search-input";
import { DashboardHeader } from "@/components/dashboard/header";
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
	UserMinus,
	LogIn,
	TrendingUp,
	ArrowRight,
	ShieldCheck,
	Sparkles,
	ChevronDown,
	Check,
	Play,
	Info,
	Bell,
	DollarSign,
	TrendingDown,
	Briefcase
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

interface LeaveMonthPoint {
	label: string;
	requestCount: number;
	deductionCount: number;
}

interface LeavePerformanceSummary {
	year: number;
	monthly: LeaveMonthPoint[];
	totalRequests: number;
	totalDeductions: number;
	pendingCount: number;
	requestsChange: string;
	deductionsChange: string;
	pendingLabel: string;
}

function dateInCalendarMonth(
	dateStr: string,
	year: number,
	month: number
): boolean {
	const d = new Date(`${dateStr}T00:00:00`);
	return d.getFullYear() === year && d.getMonth() === month;
}

function pctChange(current: number, previous: number): string {
	if (previous === 0) return current > 0 ? "+100%" : "0%";
	const delta = Math.round(((current - previous) / previous) * 100);
	return `${delta >= 0 ? "+" : ""}${delta}%`;
}

function buildLinePath(
	values: number[],
	maxVal: number,
	padX: number,
	padY: number,
	innerW: number,
	innerH: number
): string {
	if (values.length === 0) return "";
	return values
		.map((val, i) => {
			const x = padX + (values.length <= 1 ? 0 : (i / (values.length - 1)) * innerW);
			const y = padY + (1 - val / maxVal) * innerH;
			return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
		})
		.join(" ");
}

export default function AdminDashboardPage() {
	const { employee } = useUser();
	const [currentTime, setCurrentTime] = useState("");

	// Data States
	const [stats, setStats] = useState({
		totalEmployees: 0,
		clockedIn: 0,
		pendingLeaves: 0,
		onLeave: 0,
		weeklyOff: 0,
		blockedEmployees: 0,
		pendingResignations: 0,
		processingResignations: 0,
		acceptedResignations: 0,
		attendanceRate: 82,
		onTimeCount: 0,
		lateCount: 0,
	});

	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [pendingLeaves, setPendingLeaves] = useState<
		(LeaveRequest & { employee?: Employee })[]
	>([]);
	const [teams, setTeams] = useState<TeamWithDetails[]>([]);
	const [todayActivities, setTodayActivities] = useState<
		(Attendance & { employee?: Employee })[]
	>([]);
	const [leavePerformance, setLeavePerformance] =
		useState<LeavePerformanceSummary>({
			year: new Date().getFullYear(),
			monthly: Array.from({ length: 12 }, (_, i) => ({
				label: new Date(new Date().getFullYear(), i, 1).toLocaleString(
					"en-US",
					{ month: "short" }
				),
				requestCount: 0,
				deductionCount: 0,
			})),
			totalRequests: 0,
			totalDeductions: 0,
			pendingCount: 0,
			requestsChange: "0%",
			deductionsChange: "0%",
			pendingLabel: "Awaiting",
		});

	// Real-time ticking Clock
	useEffect(() => {
		setCurrentTime(new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
		const timer = setInterval(() => {
			setCurrentTime(new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	function todayLocalStr() {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	}

	useEffect(() => {
		const fetchData = async () => {
			const supabase = createClient();
			const today = todayLocalStr();
			const dayOfWeek = new Date().getDay();

			const { data: activeEmployees } = await supabase
				.from("employees")
				.select("id, department, role")
				.eq("is_active", true)
				.in("role", ["employee", "hr"]);

			const empCount = activeEmployees?.length || 0;

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
				.limit(20);

			const { count: blockedCount } = await supabase
				.from("employees")
				.select("*", { count: "exact", head: true })
				.eq("is_active", false);

			const { count: pendingResCount } = await supabase
				.from("resignations")
				.select("*", { count: "exact", head: true })
				.eq("status", "pending");

			const { count: processingResCount } = await supabase
				.from("resignations")
				.select("*", { count: "exact", head: true })
				.eq("status", "processing");

			const { count: acceptedResCount } = await supabase
				.from("resignations")
				.select("*", { count: "exact", head: true })
				.eq("status", "accepted");

			const { data: activityData } = await supabase
				.from("attendance")
				.select("*, employee:employees(*)")
				.eq("date", today)
				.order("clock_in", { ascending: false })
				.limit(20);

			const now = new Date();
			const chartYear = now.getFullYear();
			const rangeStart = `${chartYear}-01-01`;
			const rangeEnd = `${chartYear}-12-31`;

			const monthSlots = Array.from({ length: 12 }, (_, i) => ({
				label: new Date(chartYear, i, 1).toLocaleString("en-US", {
					month: "short",
				}),
				year: chartYear,
				month: i,
			}));

			const [{ data: yearLeaves }, { data: yearDeductions }] =
				await Promise.all([
					supabase
						.from("leave_requests")
						.select("id, start_date")
						.gte("start_date", rangeStart)
						.lte("start_date", rangeEnd),
					supabase
						.from("leave_deductions")
						.select("id, deduction_date")
						.gte("deduction_date", rangeStart)
						.lte("deduction_date", rangeEnd),
				]);

			const monthly = monthSlots.map((slot) => ({
				label: slot.label,
				requestCount: (yearLeaves || []).filter((leave) =>
					dateInCalendarMonth(leave.start_date, slot.year, slot.month)
				).length,
				deductionCount: (yearDeductions || []).filter((ded) =>
					dateInCalendarMonth(ded.deduction_date, slot.year, slot.month)
				).length,
			}));

			const totalRequests = monthly.reduce((sum, m) => sum + m.requestCount, 0);
			const totalDeductions = monthly.reduce(
				(sum, m) => sum + m.deductionCount,
				0
			);
			const currentMonthIdx = now.getMonth();
			const currentRequests = monthly[currentMonthIdx]?.requestCount ?? 0;
			const previousRequests =
				currentMonthIdx > 0
					? (monthly[currentMonthIdx - 1]?.requestCount ?? 0)
					: 0;
			const currentDeductions = monthly[currentMonthIdx]?.deductionCount ?? 0;
			const previousDeductions =
				currentMonthIdx > 0
					? (monthly[currentMonthIdx - 1]?.deductionCount ?? 0)
					: 0;

			setLeavePerformance({
				year: chartYear,
				monthly,
				totalRequests,
				totalDeductions,
				pendingCount: (pendingData || []).length,
				requestsChange: pctChange(currentRequests, previousRequests),
				deductionsChange: pctChange(currentDeductions, previousDeductions),
				pendingLabel: "Awaiting",
			});

			setStats({
				totalEmployees: empCount || 0,
				clockedIn: (attData || []).length,
				pendingLeaves: (pendingData || []).length,
				onLeave: leaveCount || 0,
				weeklyOff: (empData || []).length,
				blockedEmployees: blockedCount || 0,
				pendingResignations: pendingResCount || 0,
				processingResignations: processingResCount || 0,
				acceptedResignations: acceptedResCount || 0,
				attendanceRate: (() => {
					const totalActive = activeEmployees?.length || 0;
					const presentCount = (attData || []).length;
					return totalActive > 0 ? Math.round((presentCount / totalActive) * 100) : 82;
				})(),
				onTimeCount: (attData || []).filter(a => a.status === "present").length,
				lateCount: (attData || []).filter(a => a.status === "late").length,
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
		setLeavePerformance((lp) => ({
			...lp,
			pendingCount: Math.max(0, lp.pendingCount - 1),
		}));
	};

	const formatTime = (s: string | null) =>
		s
			? new Date(s).toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
			})
			: "–";
	return (
		<div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
			<DashboardHeader title="" />

			{/* Main Grid Pane */}
			<div className="flex-1 p-6 space-y-6">

				{/* ── PATH CRUMB INDICATOR ── */}
				<div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-left">
					<Link href="/admin/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
					<span>/</span>
					<span className="text-slate-500">Overview</span>
				</div>

				{/* ── METRICS STATS ROW (Dynamic 5-Column Full-Width Grid) ── */}
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
					{[
						{
							label: "Total Employees",
							val: stats.totalEmployees,
							sub: "+12% vs last month",
							subStyle: "text-emerald-600 bg-emerald-50 border-emerald-100",
							icon: Users,
							iconStyle: "text-blue-600 bg-blue-50 border-blue-100"
						},
						{
							label: "Clocked In Today",
							val: stats.clockedIn,
							sub: `${stats.totalEmployees > 0 ? Math.round((stats.clockedIn / stats.totalEmployees) * 100) : 0}% Attendance`,
							subStyle: "text-blue-600 bg-blue-50 border-blue-100",
							icon: Clock,
							iconStyle: "text-emerald-600 bg-emerald-50 border-emerald-100"
						},
						{
							label: "Pending Leaves",
							val: stats.pendingLeaves,
							sub: "Awaiting approval",
							subStyle: "text-amber-600 bg-amber-50 border-amber-100",
							icon: Calendar,
							iconStyle: "text-amber-600 bg-amber-50 border-amber-100"
						},
						{
							label: "On Leave Today",
							val: stats.onLeave,
							sub: "Out of Office",
							subStyle: "text-rose-600 bg-rose-50 border-rose-100",
							icon: UserPlus,
							iconStyle: "text-rose-600 bg-rose-50 border-rose-100"
						},
						{
							label: "Blocked Staff",
							val: stats.blockedEmployees,
							sub: "Inactive status",
							subStyle: "text-rose-600 bg-rose-50 border-rose-100",
							icon: UserMinus,
							iconStyle: "text-rose-600 bg-rose-50 border-rose-100"
						}
					].map((item, idx) => {
						const Icon = item.icon;
						return (
							<div key={idx} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left">
								<div className="flex justify-between items-center">
									<span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.label}</span>
									<div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${item.iconStyle}`}>
										<Icon className="w-4 h-4" />
									</div>
								</div>
								<div className="mt-4">
									<h2 className="text-3xl font-black text-slate-800 leading-none tabular-nums">{item.val}</h2>
									<span className={`inline-block text-[9px] font-black uppercase tracking-wide border px-2 py-0.5 rounded-md mt-2 ${item.subStyle}`}>
										{item.sub}
									</span>
								</div>
							</div>
						);
					})}
				</div>

				{/* ── THREE COLUMNS: ANNOUNCEMENTS / LEAVES / EXIT RESIGNATIONS ── */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

					{/* Announcements */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between overflow-hidden">
						<div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
							<div className="flex items-center gap-2 text-left">
								<Megaphone className="w-4.5 h-4.5 text-indigo-500" />
								<div>
									<h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Announcements</h4>
									<p className="text-[9px] text-slate-400 font-bold mt-0.5">Broadcasting feed</p>
								</div>
							</div>
							<Link href="/admin/announcements" className="text-[9px] font-black uppercase bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
								View All
							</Link>
						</div>
						<div className="p-5 flex-grow">
							{announcements.length === 0 ? (
								<p className="text-[10px] text-slate-400 italic py-6">No broadcasts posted yet.</p>
							) : (
								<div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-hide text-left">
									{announcements.slice(0, 3).map((a) => (
										<div key={a.id} className="flex gap-2.5 p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all">
											<div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></div>
											<div>
												<h6 className="text-[10px] font-black text-slate-700 leading-snug">{a.title}</h6>
												<p className="text-[9px] text-slate-400 font-bold leading-normal mt-0.5 line-clamp-1">{a.content}</p>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Leave Approvals */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between overflow-hidden">
						<div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
							<div className="flex items-center gap-2 text-left">
								<Calendar className="w-4.5 h-4.5 text-amber-500" />
								<div>
									<h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Leave Requests</h4>
									<p className="text-[9px] text-slate-400 font-bold mt-0.5">Approval list</p>
								</div>
							</div>
							<Link href="/admin/leave" className="text-[9px] font-black uppercase bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
								View All
							</Link>
						</div>
						<div className="p-5 flex-grow">
							{pendingLeaves.length === 0 ? (
								<p className="text-[10px] text-slate-400 italic py-6">All clear! No pending leave requests.</p>
							) : (
								<div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-hide text-left">
									{pendingLeaves.slice(0, 3).map((leave) => (
										<div key={leave.id} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
											<div className="min-w-0 flex-1">
												<h6 className="text-[10px] font-black text-slate-700 truncate">{leave.employee?.first_name} {leave.employee?.last_name}</h6>
												<p className="text-[8px] text-slate-400 font-bold mt-0.5">
													{(leave as any).leave_type?.name || "Leave"} · {leave.start_date}
												</p>
											</div>
											<div className="flex shrink-0 gap-1.5 ml-2">
												<button
													onClick={() => handleLeaveAction(leave.id, "rejected")}
													className="px-2 py-1 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 rounded-md text-[8px] font-extrabold cursor-pointer transition-colors"
												>
													Reject
												</button>
												<button
													onClick={() => handleLeaveAction(leave.id, "approved")}
													className="px-2 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-[8px] font-extrabold cursor-pointer transition-colors"
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

					{/* Exit Management & Resignations */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between overflow-hidden">
						<div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
							<div className="flex items-center gap-2 text-left">
								<ShieldCheck className="w-4.5 h-4.5 text-rose-500" />
								<div>
									<h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Exit Clearances</h4>
									<p className="text-[9px] text-slate-400 font-bold mt-0.5">Resignations logs</p>
								</div>
							</div>
							<Link href="/admin/resignations" className="text-[9px] font-black uppercase bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
								View All
							</Link>
						</div>
						<div className="p-5 flex-grow text-left">
							<div className="space-y-2">
								<div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
										<span className="text-[10px] font-black text-slate-700">Resignations Submitted</span>
									</div>
									<span className="text-xs font-black text-slate-800">{stats.pendingResignations}</span>
								</div>
								<div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
										<span className="text-[10px] font-black text-slate-700">Active Clearances</span>
									</div>
									<span className="text-xs font-black text-slate-800">{stats.processingResignations}</span>
								</div>
								<div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
										<span className="text-[10px] font-black text-slate-700">Exit Completed</span>
									</div>
									<span className="text-xs font-black text-slate-800">{stats.acceptedResignations}</span>
								</div>
							</div>
						</div>
					</div>

				</div>

				{/* ── TWO COLUMNS: LEAVE PERFORMANCE (LINE CHART) & OVERALL ATTENDANCE (CIRCULAR DONUT) ── */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

					{/* Column 1: Leave performance line chart */}
					<div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left">
						<div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
							<div>
								<h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Leave Performance</h3>
								<p className="text-[9px] text-slate-400 font-bold mt-0.5">
									Leave requests & deductions — {leavePerformance.year}
								</p>
							</div>
							<Link href="/admin/leave" className="text-[8px] font-black uppercase tracking-wide bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
								View All
							</Link>
						</div>

						<div className="grid md:grid-cols-12 gap-6 items-center">
							<div className="md:col-span-8">
								{(() => {
									const chartW = 360;
									const chartH = 140;
									const padX = 12;
									const padY = 16;
									const data = leavePerformance.monthly;
									const requestValues = data.map((d) => d.requestCount);
									const deductionValues = data.map((d) => d.deductionCount);
									const maxVal = Math.max(
										...requestValues,
										...deductionValues,
										1
									);
									const innerW = chartW - padX * 2;
									const innerH = chartH - padY * 2;
									const requestPath = buildLinePath(
										requestValues,
										maxVal,
										padX,
										padY,
										innerW,
										innerH
									);
									const deductionPath = buildLinePath(
										deductionValues,
										maxVal,
										padX,
										padY,
										innerW,
										innerH
									);
									const pointCoords = (values: number[]) =>
										values.map((val, i) => ({
											x:
												padX +
												(values.length <= 1
													? 0
													: (i / (values.length - 1)) * innerW),
											y: padY + (1 - val / maxVal) * innerH,
											val,
										}));

									return (
										<div className="relative pt-2">
											<div className="flex items-center gap-4 mb-2 px-1">
												<span className="flex items-center gap-1.5 text-[8px] font-black uppercase text-slate-500">
													<span className="w-2 h-2 rounded-full bg-blue-600" />
													Leave requests
												</span>
												<span className="flex items-center gap-1.5 text-[8px] font-black uppercase text-slate-500">
													<span className="w-2 h-2 rounded-full bg-amber-500" />
													Deductions
												</span>
											</div>
											<svg
												viewBox={`0 0 ${chartW} ${chartH}`}
												className="w-full h-36"
												aria-label="Monthly leave requests and deductions line chart"
											>
												{[0.25, 0.5, 0.75].map((ratio) => (
													<line
														key={ratio}
														x1={padX}
														y1={padY + ratio * innerH}
														x2={chartW - padX}
														y2={padY + ratio * innerH}
														stroke="#f1f5f9"
														strokeWidth="1"
													/>
												))}
												{deductionPath ? (
													<path
														d={deductionPath}
														fill="none"
														stroke="#f59e0b"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												) : null}
												{requestPath ? (
													<path
														d={requestPath}
														fill="none"
														stroke="#2563eb"
														strokeWidth="2.5"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												) : null}
												{pointCoords(deductionValues).map((p, i) => (
													<g key={`ded-${i}`}>
														<circle
															cx={p.x}
															cy={p.y}
															r="3.5"
															fill="#fff"
															stroke="#f59e0b"
															strokeWidth="2"
														/>
														<title>{`${data[i].label}: ${p.val} deduction${p.val === 1 ? "" : "s"}`}</title>
													</g>
												))}
												{pointCoords(requestValues).map((p, i) => (
													<g key={`req-${i}`}>
														<circle
															cx={p.x}
															cy={p.y}
															r="3.5"
															fill="#fff"
															stroke="#2563eb"
															strokeWidth="2"
														/>
														<title>{`${data[i].label}: ${p.val} request${p.val === 1 ? "" : "s"}`}</title>
													</g>
												))}
											</svg>
											<div
												className="flex justify-between px-1 -mt-1"
												style={{
													paddingLeft: `${(padX / chartW) * 100}%`,
													paddingRight: `${(padX / chartW) * 100}%`,
												}}
											>
												{data.map((d) => (
													<span
														key={d.label}
														className="text-[7px] text-slate-400 font-bold"
													>
														{d.label}
													</span>
												))}
											</div>
										</div>
									);
								})()}
							</div>

							<div className="md:col-span-4 space-y-2">
								{[
									{
										label: "Total Requests",
										val: String(leavePerformance.totalRequests),
										change: leavePerformance.requestsChange,
										color: leavePerformance.requestsChange.startsWith("-")
											? "text-rose-500"
											: "text-emerald-500",
									},
									{
										label: "Total Deductions",
										val: String(leavePerformance.totalDeductions),
										change: leavePerformance.deductionsChange,
										color: leavePerformance.deductionsChange.startsWith("-")
											? "text-rose-500"
											: "text-emerald-500",
									},
									{
										label: "Pending Requests",
										val: String(leavePerformance.pendingCount),
										change: leavePerformance.pendingLabel,
										color: "text-amber-500",
									},
								].map((item, idx) => (
									<div key={idx} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-100 rounded-xl">
										<div className="text-left">
											<p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{item.label}</p>
											<p className="text-xs font-black text-slate-700 mt-0.5">{item.val}</p>
										</div>
										<span className={`text-[8px] font-black uppercase ${item.color}`}>{item.change}</span>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Column 2: Overall Attendance Circular Donut Chart ( OMS Image Right Component) */}
					<div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left">
						<div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
							<div>
								<h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Overall Attendance</h3>
								<p className="text-[9px] text-slate-400 font-bold mt-0.5">On time vs late arrivals break</p>
							</div>
							<Link href="/admin/attendance" className="text-[9px] font-black uppercase bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
								View All
							</Link>
						</div>

						<div className="flex flex-col sm:flex-row items-center gap-6 justify-center">

							{/* Pure SVG Donut gauge */}
							<div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
								<svg className="w-full h-full transform -rotate-90">
									<circle cx="56" cy="56" r="44" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
									<circle cx="56" cy="56" r="44" stroke="#2563eb" strokeWidth="8" strokeDasharray="276" strokeDashoffset={String(276 - (Math.max(0, Math.min(100, Number(stats.attendanceRate) || 0)) / 100) * 276)} strokeLinecap="round" fill="transparent" />
								</svg>
								<div className="absolute text-center">
									<span className="text-xl font-black text-slate-800">{(Number(stats.attendanceRate) || 0)}%</span>
									<p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Total Present</p>
								</div>
							</div>

							{/* Legend breakdown list */}
							<div className="space-y-1.5 text-left w-full">
								{[
									{ label: "On Time", val: `${stats.onTimeCount}`, dot: "bg-emerald-500" },
									{ label: "Late Arrival", val: `${stats.lateCount}`, dot: "bg-rose-500" }
								].map((item, idx) => (
									<div key={idx} className="flex items-center justify-between text-[10px] font-bold p-1 border-b border-slate-50">
										<div className="flex items-center gap-1.5">
											<div className={`w-1.5 h-1.5 rounded-full ${item.dot}`}></div>
											<span className="text-slate-500">{item.label}</span>
										</div>
										<span className="text-slate-800 font-black">{item.val}</span>
									</div>
								))}
							</div>

						</div>
					</div>

				</div>

				{/* ── THREE COLUMNS: BIRTHDAYS / LATEST ACTIVITY / TEAMS ── */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

					{/* Activities Timeline */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between overflow-hidden">
						<div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
							<div className="flex items-center gap-2 text-left">
								<Activity className="w-4.5 h-4.5 text-sky-500" />
								<div>
									<h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Latest Activity</h4>
									<p className="text-[9px] text-slate-400 font-bold mt-0.5">Timesheet checking logs</p>
								</div>
							</div>
						</div>
						<div className="p-5 flex-grow">
							{todayActivities.length === 0 ? (
								<p className="text-[10px] text-slate-400 italic py-6">No check-ins logged today.</p>
							) : (
								<div className="relative space-y-4 max-h-[360px] overflow-y-auto pr-1 text-left scrollbar-hide">
									{/* Vertical timeline track line */}
									<div className="absolute left-[11px] top-1 bottom-1 w-[1px] bg-slate-100 dark:bg-slate-800"></div>

									{todayActivities.slice(0, 20).map((a) => {
										const isLate = a.status === "late";
										return (
											<div key={a.id} className="relative flex items-center gap-3 text-xs pl-0.5 group">
												{/* Node Bullet indicator */}
												<div className={`absolute left-[9px] w-1.5 h-1.5 rounded-full border border-white dark:border-slate-900 z-10 ${
													isLate ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
												}`} />

												{/* Employee Avatar */}
												<Avatar className="h-6.5 w-6.5 border border-slate-100 dark:border-slate-850 shrink-0 ml-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
													{a.employee?.avatar_url && (
														<AvatarImage src={a.employee.avatar_url} className="object-cover" />
													)}
													<AvatarFallback className="text-[8px] font-black bg-slate-105 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
														{a.employee?.first_name?.[0]}{a.employee?.last_name?.[0]}
													</AvatarFallback>
												</Avatar>

												{/* Information Block */}
												<div className="min-w-0 flex-1">
													<div className="flex items-center justify-between gap-2">
														<h6 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">
															{a.employee?.first_name} {a.employee?.last_name}
														</h6>
														<span className="text-[9px] font-medium text-slate-400 tabular-nums">
															{formatTime(a.clock_in)}
														</span>
													</div>
													<div className="flex items-center gap-1.5 mt-0.5">
														<span className="text-[9px] text-slate-400 font-medium">Clocked in</span>
														{isLate ? (
															<span className="text-[7.5px] font-black tracking-wider uppercase px-1.5 py-0.2 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 text-rose-500 dark:text-rose-400 rounded-md">
																Late
															</span>
														) : (
															<span className="text-[7.5px] font-black tracking-wider uppercase px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-550 dark:text-emerald-400 rounded-md">
																On Time
															</span>
														)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>

					{/* Teams List */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between overflow-hidden">
						<div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
							<div className="flex items-center gap-2 text-left">
								<Users className="w-4.5 h-4.5 text-violet-500" />
								<div>
									<h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Teams & Structure</h4>
									<p className="text-[9px] text-slate-400 font-bold mt-0.5">Org directory</p>
								</div>
							</div>
							<Link href="/admin/teams" className="text-[9px] font-black uppercase bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
								View All
							</Link>
						</div>
						<div className="p-5 flex-grow">
							{teams.length === 0 ? (
								<p className="text-[10px] text-slate-400 italic py-6">No teams created yet.</p>
							) : (
								<div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-hide text-left">
									{teams.slice(0, 20).map((team) => (
										<div key={team.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-xl">
											<div className="min-w-0 flex-1">
												<h6 className="text-[10px] font-black text-slate-700 truncate">{team.name}</h6>
												<p className="text-[8px] text-slate-400 font-bold mt-0.5">
													Leader: {team.leader?.first_name || "—"}
												</p>
											</div>
											<span className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
												{team.team_members?.length ?? 0} Members
											</span>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Birthdays */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
						<UpcomingBirthdays />
					</div>

				</div>

			</div>
		</div>
	);
}
