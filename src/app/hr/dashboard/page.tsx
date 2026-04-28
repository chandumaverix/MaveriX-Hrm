"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { UpcomingBirthdays } from "@/components/dashboard/upcoming-birthdays";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/user-context";
import {
	Users,
	Clock,
	Calendar,
	Megaphone,
	CheckCircle2,
	Activity,
	UserPlus,
	ChevronLeft,
	ChevronRight,
	Timer,
	LogIn,
	Square,
	ArrowRight,
	TrendingUp,
	Sparkles,
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

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(s: string | null) {
	if (!s) return "–";
	return new Date(s).toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getElapsedHMS(clockInIso: string, toDate: Date) {
	const start = new Date(clockInIso).getTime();
	const end = toDate.getTime();
	const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return {
		hours: String(hours).padStart(2, "0"),
		minutes: String(minutes).padStart(2, "0"),
		seconds: String(seconds).padStart(2, "0"),
	};
}

function getCurrentTimeParts(d: Date) {
	const hours12 = d.getHours() % 12 || 12;
	const ampm = d.getHours() < 12 ? "AM" : "PM";
	return {
		hours: String(hours12).padStart(2, "0"),
		minutes: String(d.getMinutes()).padStart(2, "0"),
		ampm,
	};
}

// ── Stat Card ────────────────────────────────────────────────────────────────
const STAT_CONFIGS = [
	{
		key: "totalEmployees" as const,
		label: "Total Employees",
		sub: "Active",
		icon: Users,
		bg: "from-teal-500/10 to-teal-500/5",
		iconBg: "bg-teal-500/15",
		iconColor: "text-teal-600",
		num: "text-teal-700",
		bar: "bg-teal-500",
	},
	{
		key: "clockedIn" as const,
		label: "Clocked In",
		sub: "Today",
		icon: Clock,
		bg: "from-indigo-500/10 to-indigo-500/5",
		iconBg: "bg-indigo-500/15",
		iconColor: "text-indigo-600",
		num: "text-indigo-700",
		bar: "bg-indigo-500",
	},
	{
		key: "pendingLeaves" as const,
		label: "Pending Leaves",
		sub: "Awaiting review",
		icon: Calendar,
		bg: "from-amber-500/10 to-amber-500/5",
		iconBg: "bg-amber-500/15",
		iconColor: "text-amber-600",
		num: "text-amber-700",
		bar: "bg-amber-500",
	},
	{
		key: "onLeave" as const,
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
		key: "weeklyOff" as const,
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

// ── Section Header Helper ────────────────────────────────────────────────────
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

// ── Main Page ────────────────────────────────────────────────────────────────
export default function HRDashboardPage() {
	const { employee } = useUser();
	const [stats, setStats] = useState<Record<StatKey, number>>({
		totalEmployees: 0,
		clockedIn: 0,
		pendingLeaves: 0,
		onLeave: 0,
		weeklyOff: 0,
	});
	const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
	const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
	const [calendarMonth, setCalendarMonth] = useState(() => new Date());
	const [monthAttendance, setMonthAttendance] = useState<Attendance[]>([]);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [pendingLeaves, setPendingLeaves] = useState<
		(LeaveRequest & {
			employee?: Employee;
			leave_type?: { name?: string };
		})[]
	>([]);
	const [teams, setTeams] = useState<TeamWithDetails[]>([]);
	const [todayActivities, setTodayActivities] = useState<
		(Attendance & { employee?: Employee })[]
	>([]);
	const [festivalMap, setFestivalMap] = useState<Record<string, string[]>>({});
	const [selectedFestivalDate, setSelectedFestivalDate] = useState<string | null>(null);
	const [now, setNow] = useState(() => new Date());

	// Live clock tick
	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(interval);
	}, []);

	// Festivals
	useEffect(() => {
		const fetchFestivals = async () => {
			const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
			const calendarId = "en.indian#holiday@group.v.calendar.google.com";
			if (!apiKey || !calendarId) return;
			const year = calendarMonth.getFullYear();
			const month = calendarMonth.getMonth();
			const timeMin = new Date(year, month, 1).toISOString();
			const timeMax = new Date(year, month + 1, 0).toISOString();
			const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
			try {
				const res = await fetch(url);
				if (!res.ok) return;
				const json = await res.json();
				const items = (json.items as Array<{ summary?: string; start?: { date?: string; dateTime?: string } }>) || [];
				const map: Record<string, string[]> = {};
				for (const ev of items) {
					const title = ev.summary || "Holiday";
					const startDate = ev.start?.date || (ev.start?.dateTime ? ev.start.dateTime.split("T")[0] : undefined);
					if (!startDate) continue;
					if (!map[startDate]) map[startDate] = [];
					map[startDate].push(title);
				}
				setFestivalMap(map);
			} catch {
				// Calendar is optional; fail silently
			}
		};
		fetchFestivals();
	}, [calendarMonth]);

	// Main data fetch
	useEffect(() => {
		const fetchAll = async () => {
			if (!employee) return;
			const supabase = createClient();
			const today = new Date().toISOString().split("T")[0];
			const dayOfWeek = new Date().getDay();

			const { data: myAtt } = await supabase
				.from("attendance")
				.select("*")
				.eq("employee_id", employee.id)
				.eq("date", today)
				.single();
			setTodayAttendance(myAtt as Attendance | null);

			const curMonthStart = new Date().toISOString().slice(0, 8) + "01";
			const { data: recentAtt } = await supabase
				.from("attendance")
				.select("*")
				.eq("employee_id", employee.id)
				.gte("date", curMonthStart)
				.order("date", { ascending: false })
				.limit(5);
			setRecentAttendance((recentAtt as Attendance[]) || []);

			const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).toISOString().split("T")[0];
			const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).toISOString().split("T")[0];
			const { data: monthAtt } = await supabase
				.from("attendance")
				.select("*")
				.eq("employee_id", employee.id)
				.gte("date", monthStart)
				.lte("date", monthEnd);
			setMonthAttendance((monthAtt as Attendance[]) || []);

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
			const clockedIn = (attData || []).length;

			const { data: pendingData } = await supabase
				.from("leave_requests")
				.select("*, employee:employees(*), leave_type:leave_types(*)")
				.eq("status", "pending")
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
				.neq("role", "admin")
				.eq("week_off_day", dayOfWeek);
			const weeklyOff = (empData || []).length;

			const { data: announcementsData } = await supabase
				.from("announcements")
				.select("*")
				.order("date", { ascending: false })
				.limit(10);

			const { data: teamsData } = await supabase
				.from("teams")
				.select("*, leader:employees!teams_leader_id_fkey(*), team_members(*, employee:employees(*))")
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
				clockedIn,
				pendingLeaves: (pendingData || []).length,
				onLeave: leaveCount || 0,
				weeklyOff,
			});
			setPendingLeaves((pendingData as unknown as typeof pendingLeaves) || []);
			setAnnouncements((announcementsData as Announcement[]) || []);
			setTeams((teamsData as unknown as TeamWithDetails[]) || []);
			setTodayActivities((activityData as unknown as typeof todayActivities) || []);
		};
		fetchAll();
	}, [employee?.id, calendarMonth]);

	const handleClockIn = async () => {
		if (!employee) return;
		const supabase = createClient();
		const today = new Date().toISOString().split("T")[0];
		await supabase.from("attendance").insert({
			employee_id: employee.id,
			date: today,
			clock_in: new Date().toISOString(),
			status: "present",
		});
		const { data } = await supabase
			.from("attendance")
			.select("*")
			.eq("employee_id", employee.id)
			.eq("date", today)
			.single();
		setTodayAttendance(data as Attendance);
		setStats((s) => ({ ...s, clockedIn: s.clockedIn + 1 }));
	};

	const handleClockOut = async () => {
		if (!todayAttendance || !employee) return;
		const supabase = createClient();
		const nowDate = new Date();
		const clockIn = new Date(todayAttendance.clock_in!);
		const totalHours = (nowDate.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
		await supabase
			.from("attendance")
			.update({ clock_out: nowDate.toISOString(), total_hours: totalHours })
			.eq("id", todayAttendance.id);
		const { data } = await supabase
			.from("attendance")
			.select("*")
			.eq("employee_id", employee.id)
			.eq("date", new Date().toISOString().split("T")[0])
			.single();
		setTodayAttendance(data as Attendance);
		setRecentAttendance((prev) => {
			const updated = [...prev];
			const idx = updated.findIndex((a) => a.date === new Date().toISOString().split("T")[0]);
			if (idx >= 0 && data) updated[idx] = data as Attendance;
			return updated;
		});
	};

	const handleLeaveAction = async (id: string, status: "approved" | "rejected") => {
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
		setStats((s) => ({ ...s, pendingLeaves: Math.max(0, s.pendingLeaves - 1) }));
	};

	// Calendar grid
	const calYear = calendarMonth.getFullYear();
	const calMonth = calendarMonth.getMonth();
	const firstDay = new Date(calYear, calMonth, 1);
	const lastDay = new Date(calYear, calMonth + 1, 0);
	const monthDays: (Date | null)[] = [];
	for (let i = 0; i < firstDay.getDay(); i++) monthDays.push(null);
	for (let d = 1; d <= lastDay.getDate(); d++) monthDays.push(new Date(calYear, calMonth, d));
	const monthAttendanceByDate: Record<string, Attendance> = {};
	for (const a of monthAttendance) monthAttendanceByDate[a.date] = a;
	const todayStr = new Date().toISOString().split("T")[0];

	const hour = now.getHours();
	const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

	const isActive = !!todayAttendance?.clock_in && !todayAttendance.clock_out;
	const isDone = !!todayAttendance?.clock_in && !!todayAttendance.clock_out;

	const elapsed = isActive ? getElapsedHMS(todayAttendance!.clock_in!, now) : null;
	const currentTime = getCurrentTimeParts(now);

	return (
		<div className="flex flex-col min-h-full bg-background">
			<DashboardHeader
				title="HR Dashboard"
				description={`Welcome back, ${employee?.first_name || "HR"}`}
				searchPlaceholder="Search employees by name"
			/>

			<div className="flex-1 space-y-6 p-4 md:p-6 pb-20 md:pb-8">

				{/* ── Clock-In / Greeting Card + Calendar ── */}
				<div className="grid gap-5 grid-cols-1 md:grid-cols-2">

					{/* Clock Card */}
					<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#020286] to-indigo-700 text-white shadow-lg">
						{/* Decorative blobs */}
						<div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
						<div className="pointer-events-none absolute right-10 bottom-0 h-28 w-28 rounded-full bg-white/5" />

						<div className="relative p-6 space-y-5">
							{/* Greeting row */}
							<div className="flex items-start justify-between gap-3">
								<div>
									<div className="flex items-center gap-2 mb-1">
										<Sparkles className="h-3.5 w-3.5 opacity-70" />
										<span className="text-xs font-medium opacity-75 uppercase tracking-wider">HR Portal</span>
									</div>
									<h2 className="text-xl font-bold">{greeting}{employee ? `, ${employee.first_name}` : ""} 👋</h2>
									<p className="text-sm opacity-70 mt-0.5">
										{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
									</p>
								</div>
								{isActive && (
									<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 px-3 py-1.5 text-xs font-bold text-white shrink-0">
										<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
										Active
									</span>
								)}
								{isDone && (
									<span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-bold text-white shrink-0">
										<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
										Done
									</span>
								)}
							</div>

							{/* Timer boxes */}
							<div className="grid grid-cols-3 gap-3">
								{isActive && elapsed ? (
									(["hours", "minutes", "seconds"] as const).map((unit) => (
										<div key={unit} className="flex flex-col items-center justify-center rounded-xl bg-white/10 border border-white/15 py-4 px-2 backdrop-blur-sm">
											<span className="text-3xl sm:text-4xl font-bold tabular-nums">{elapsed[unit]}</span>
											<span className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mt-1">
												{unit === "hours" ? "Hrs" : unit === "minutes" ? "Min" : "Sec"}
											</span>
										</div>
									))
								) : (
									(["hours", "minutes", "ampm"] as const).map((unit) => (
										<div key={unit} className="flex flex-col items-center justify-center rounded-xl bg-white/10 border border-white/15 py-4 px-2 backdrop-blur-sm">
											<span className="text-3xl sm:text-4xl font-bold tabular-nums">{currentTime[unit]}</span>
											<span className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mt-1">
												{unit === "hours" ? "Hrs" : unit === "minutes" ? "Min" : "AM/PM"}
											</span>
										</div>
									))
								)}
							</div>

							{/* Sub-caption */}
							{isActive && todayAttendance?.clock_in && (
								<p className="text-xs opacity-60 text-center">
									Clocked in at {new Date(todayAttendance.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
								</p>
							)}
							{(isDone || !isActive) && <p className="text-xs opacity-60 text-center">{isActive ? "" : "Current time"}</p>}

							{/* CTA Button */}
							<div className="flex justify-center">
								{isActive ? (
									<button
										onClick={handleClockOut}
										className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white px-6 py-3.5 text-base font-bold transition-all duration-150 shadow-md cursor-pointer"
									>
										<Square className="h-4 w-4" />
										Clock Out
									</button>
								) : isDone ? (
									<div className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/15 border border-white/20 px-6 py-3.5 text-base font-bold">
										<CheckCircle2 className="h-4 w-4 text-emerald-400" />
										Attendance Completed
									</div>
								) : (
									<button
										onClick={handleClockIn}
										className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-primary hover:bg-white/90 active:scale-95 px-6 py-3.5 text-base font-bold transition-all duration-150 shadow-md cursor-pointer"
									>
										<Clock className="h-4 w-4" />
										Clock In
									</button>
								)}
							</div>

							{/* Today's record */}
							{recentAttendance.filter((att) => {
								const t = new Date();
								const d = new Date(att.date + "T12:00:00");
								return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
							}).map((att) => (
								<div key={att.id} className="flex items-center justify-between rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm">
									<div className="flex items-center gap-2">
										<CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
										<span className="font-medium opacity-90">
											{new Date(att.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
										</span>
										<span className="opacity-60 text-xs">{formatTime(att.clock_in)} – {formatTime(att.clock_out)}</span>
									</div>
									{att.total_hours != null && (
										<span className="opacity-80 text-xs font-semibold tabular-nums">{att.total_hours.toFixed(2)}h</span>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Calendar Card */}
					<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
						<div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/50">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
									<Calendar className="h-5 w-5" />
								</div>
								<div>
									<p className="font-semibold text-sm text-foreground">Attendance Calendar</p>
									<p className="text-xs text-muted-foreground">{calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<button
									onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
									className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors cursor-pointer border border-border/50"
								>
									<ChevronLeft className="h-4 w-4" />
								</button>
								<button
									onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
									className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors cursor-pointer border border-border/50"
								>
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
						<div className="p-4 space-y-3">
							{/* Day headers */}
							<div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
								{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
									<div key={d} className="py-1">{d}</div>
								))}
							</div>
							{/* Day cells */}
							<div className="grid grid-cols-7 gap-1.5">
								{monthDays.map((day, idx) => {
									if (!day) return <div key={idx} />;
									const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
									const isToday = dateStr === todayStr;
									const att = monthAttendanceByDate[dateStr];
									const festivalTitles = festivalMap[dateStr];
									const statusColor =
										att?.status === "present" ? "ring-1 ring-emerald-400 bg-emerald-50 text-emerald-800"
										: att?.status === "late" ? "ring-1 ring-amber-400 bg-amber-50 text-amber-800"
										: att?.status === "leave" ? "ring-1 ring-violet-400 bg-violet-50 text-violet-800"
										: "bg-muted/60 text-foreground";
									return (
										<div
											key={dateStr}
											onClick={() => festivalTitles && setSelectedFestivalDate(dateStr)}
											className={`relative flex h-10 flex-col items-center justify-center rounded-lg text-[11px] font-medium transition-all duration-150 ${isToday ? "bg-primary text-white shadow-sm ring-2 ring-primary/30 scale-[1.05]" : statusColor} ${festivalTitles ? "cursor-pointer" : "cursor-default"}`}
										>
											<span>{day.getDate()}</span>
											{festivalTitles && (
												<span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-pink-500 inline-block" />
											)}
											{!festivalTitles && att && (
												<span className={`text-[8px] leading-none mt-0.5 font-bold opacity-80`}>
													{att.status === "present" ? "✓" : att.status === "late" ? "~" : att.status === "leave" ? "L" : ""}
												</span>
											)}
										</div>
									);
								})}
							</div>
							{/* Legend */}
							<div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/40">
								{[
									{ label: "Present", cls: "bg-emerald-400" },
									{ label: "Late", cls: "bg-amber-400" },
									{ label: "Leave", cls: "bg-violet-400" },
									{ label: "Holiday", cls: "bg-pink-500" },
								].map((l) => (
									<div key={l.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
										<span className={`h-2 w-2 rounded-full ${l.cls} inline-block`} />
										{l.label}
									</div>
								))}
							</div>
							{/* Festival popup */}
							{selectedFestivalDate && festivalMap[selectedFestivalDate] && (
								<div
									className="mt-2 rounded-xl border border-pink-200 bg-pink-50 p-3 text-xs cursor-pointer"
									onClick={() => setSelectedFestivalDate(null)}
								>
									<p className="font-semibold text-pink-800 mb-1.5">
										🎉 Holidays on {new Date(selectedFestivalDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
									</p>
									<ul className="space-y-0.5 text-pink-700">
										{festivalMap[selectedFestivalDate].map((title, idx) => (
											<li key={idx} className="flex items-center gap-1.5">
												<span className="h-1 w-1 rounded-full bg-pink-500 inline-block" />
												{title}
											</li>
										))}
									</ul>
									<p className="text-pink-500/70 mt-2 text-[10px]">Tap to dismiss</p>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* ── Stats ── */}
				<div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
					{STAT_CONFIGS.map((cfg) => (
						<StatCard
							key={cfg.key}
							config={cfg}
							value={stats[cfg.key]}
							total={stats.totalEmployees || 1}
						/>
					))}
				</div>

				{/* ── Announcements ── */}
				<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
					<SectionHeader
						icon={<Megaphone className="h-5 w-5" />}
						iconBg="bg-primary/10"
						iconColor="text-primary"
						title="Announcements"
						sub={`${announcements.length} announcement${announcements.length !== 1 ? "s" : ""}`}
						action={
							<Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" asChild>
								<Link href="/hr/announcements">
									Manage <ArrowRight className="h-3 w-3" />
								</Link>
							</Button>
						}
					/>
					<div className="p-4">
						{announcements.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-muted/30">
								<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
									<Megaphone className="h-5 w-5 text-primary/50" />
								</div>
								<p className="text-sm font-medium">No announcements yet</p>
								<p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Create and manage from the announcements page</p>
								<Button size="sm" className="mt-4 rounded-xl" asChild>
									<Link href="/hr/announcements">Go to Announcements</Link>
								</Button>
							</div>
						) : (
							<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[240px] overflow-y-auto pr-1">
								{announcements.slice(0, 6).map((a) => (
									<div key={a.id} className="flex gap-3 rounded-xl p-3 hover:bg-muted/40 transition-colors border border-border/40">
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
											<Megaphone className="h-3.5 w-3.5" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-semibold line-clamp-1">{a.title || "Announcement"}</p>
											<p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
											<p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">{a.date}</p>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* ── Pending Approvals ── */}
				{pendingLeaves.length > 0 && (
					<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
						<SectionHeader
							icon={<Timer className="h-5 w-5" />}
							iconBg="bg-amber-500/15"
							iconColor="text-amber-600"
							title="Pending Approvals"
							sub={`${pendingLeaves.length} employee${pendingLeaves.length !== 1 ? "s" : ""} waiting`}
							action={
								<Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" asChild>
									<Link href="/hr/leave">
										View all <ArrowRight className="h-3 w-3" />
									</Link>
								</Button>
							}
						/>
						<div className="p-4">
							<div className="grid sm:grid-cols-2 gap-2">
								{pendingLeaves.map((leave) => (
									<div
										key={leave.id}
										className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-3 hover:border-amber-300/70 hover:bg-amber-50/30 transition-all duration-150"
									>
										<div className="min-w-0 flex-1">
											<p className="font-semibold text-sm text-foreground truncate">
												{leave.employee?.first_name} {leave.employee?.last_name}
											</p>
											<p className="text-xs text-muted-foreground mt-0.5">
												{(leave.leave_type as { name?: string })?.name ?? "Leave"} · {leave.start_date}
											</p>
										</div>
										<div className="flex gap-1.5 shrink-0 ml-3">
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
						</div>
					</div>
				)}

				{/* ── Activity | Teams | Birthdays ── */}
				<div className="grid gap-5 lg:grid-cols-3 items-start">
					{/* Today's Activity */}
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
									<p className="text-xs text-muted-foreground mt-1 max-w-[160px]">Clock-ins will appear here</p>
								</div>
							) : (
								<ul className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
									{todayActivities.map((a) => (
										<li key={a.id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/70 p-2.5 hover:bg-muted/30 transition-colors">
											<Avatar className="h-9 w-9 shrink-0 border-2 border-background shadow-sm">
												{a.employee?.avatar_url ? (
													<AvatarImage className="object-cover" src={a.employee.avatar_url} alt={a.employee?.first_name} />
												) : null}
												<AvatarFallback className="text-xs font-semibold bg-muted">
													{a.employee?.first_name?.[0]}{a.employee?.last_name?.[0]}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-semibold truncate">{a.employee?.first_name} {a.employee?.last_name}</p>
												<p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
													<Clock className="h-3 w-3 shrink-0" />
													{formatTime(a.clock_in)}
													{a.total_hours != null && (
														<><span className="text-border">·</span><span>{a.total_hours}h</span></>
													)}
												</p>
											</div>
											<span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${a.status === "present" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
												{a.status === "present" ? "Present" : "Late"}
											</span>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>

					{/* Recent Teams */}
					<div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
						<SectionHeader
							icon={<Users className="h-5 w-5" />}
							iconBg="bg-violet-500/15"
							iconColor="text-violet-600"
							title="Recent Teams"
							sub={`${teams.length} teams · Active groups`}
							action={
								<Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" asChild>
									<Link href="/hr/teams">
										View all <ArrowRight className="h-3 w-3" />
									</Link>
								</Button>
							}
						/>
						<div className="p-4">
							{teams.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-muted/20">
									<p className="text-sm text-muted-foreground font-medium">No teams yet</p>
								</div>
							) : (
								<ul className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
									{teams.map((team) => (
										<li key={team.id} className="flex items-center gap-3 rounded-xl border border-border/40 p-2.5 hover:bg-muted/30 transition-colors">
											<Avatar className="h-9 w-9 shrink-0">
												{team.leader?.avatar_url ? (
													<AvatarImage className="object-cover" src={team.leader.avatar_url} alt={team.leader?.first_name} />
												) : null}
												<AvatarFallback className="text-xs font-semibold bg-violet-500/15 text-violet-600">
													{team.leader?.first_name?.[0]}{team.leader?.last_name?.[0]}{!team.leader && team.name?.[0]}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<p className="font-semibold text-sm truncate">{team.name}</p>
												<p className="text-xs text-muted-foreground">{team.team_members?.length || 0} members</p>
											</div>
											<span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[10px] font-bold text-violet-700">
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
