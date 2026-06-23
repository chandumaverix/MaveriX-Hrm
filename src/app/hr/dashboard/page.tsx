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
import { OFFICE_LOCATION } from "@/lib/constant";
import { determineAttendanceStatus } from "@/lib/utils";
import { toast } from "react-hot-toast";
import {
	Users,
	Clock,
	Calendar,
	Megaphone,
	CheckCircle2,
	Activity,
	UserPlus,
	UserMinus,
	ChevronLeft,
	ChevronRight,
	Timer,
	LogIn,
	Square,
	ArrowRight,
	TrendingUp,
	Sparkles,
	Loader2,
	XCircle,
	ShieldCheck,
	RefreshCw,
	AlertCircle,
} from "lucide-react";
import { useSettings } from "@/contexts/settings-context";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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

// ── Helpers ─────────────────────────────────────────────────────────────────
function toLocalDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(s: string | null) {
	if (!s) return "–";
	return new Date(s).toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
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
	const { settings } = useSettings();
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
	const [leavePerformance, setLeavePerformance] = useState<LeavePerformanceSummary>({
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
	const [earlyBirds, setEarlyBirds] = useState<{name: string, avgClockInMinutes: number, formattedTime: string, recentClockIns: string[]}[]>([]);
	const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
	const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
	const [calendarMonth, setCalendarMonth] = useState(() => new Date());
	const [monthAttendance, setMonthAttendance] = useState<Attendance[]>([]);
	const [myApprovedLeaves, setMyApprovedLeaves] = useState<any[]>([]);
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

	const [isClockInLoading, setIsClockInLoading] = useState(false);
	const [isClockOutDialogOpen, setIsClockOutDialogOpen] = useState(false);
	const [clockOutTimer, setClockOutTimer] = useState(3);
	const [isClockOutButtonDisabled, setIsClockOutButtonDisabled] = useState(true);
	const [isLocationAllowed, setIsLocationAllowed] = useState<boolean | null>(null);
	const [isCheckingLocation, setIsCheckingLocation] = useState(false);
	const [locationMessage, setLocationMessage] = useState<string | null>(null);

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
			const supabase = createClient();
			const today = new Date().toISOString().split("T")[0];
			const dayOfWeek = new Date().getDay();

			// 1. Clock-in queries (only if employee is loaded)
			if (employee?.id) {
				try {
					const { data: myAtt } = await supabase
						.from("attendance")
						.select("*")
						.eq("employee_id", employee.id)
						.eq("date", today)
						.maybeSingle();
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

					const { data: myLeaves } = await supabase
						.from("leave_requests")
						.select("*")
						.eq("employee_id", employee.id)
						.eq("status", "approved")
						.gte("end_date", monthStart)
						.lte("start_date", monthEnd);
					setMyApprovedLeaves(myLeaves || []);
				} catch (err) {
					console.error("Error fetching personal attendance:", err);
				}
			}

			// 2. General dashboard stats (runs regardless of employee loading state)
			try {
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
				const clockedIn = (attData || []).length;

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
				const weeklyOff = (empData || []).length;

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

				const onTimeCount = (attData || []).filter(a => a.status === "present").length;
				const lateCount = (attData || []).filter(a => a.status === "late").length;
				const attendanceRate = (() => {
					const totalActive = empCount || 0;
					const presentCount = clockedIn;
					return totalActive > 0 ? Math.round((presentCount / totalActive) * 100) : 82;
				})();

				const nowTime = new Date();
				const chartYear = nowTime.getFullYear();

				const monthStartStr = new Date(chartYear, nowTime.getMonth(), 1).toISOString().split("T")[0];
				const { data: monthAttData } = await supabase
					.from("attendance")
					.select("clock_in, employee:employees(id, first_name, last_name)")
					.gte("date", monthStartStr)
					.lte("date", today)
					.not("clock_in", "is", null);

				const employeeClockIns = new Map<string, { name: string; totalMinutes: number; count: number; rawClockIns: string[] }>();
				if (monthAttData) {
					monthAttData.forEach((record: any) => {
						const empId = record.employee?.id;
						if (!empId) return;
						const name = `${record.employee.first_name} ${record.employee.last_name}`;
						const date = new Date(record.clock_in);
						const minutes = date.getHours() * 60 + date.getMinutes();
						
						const existing = employeeClockIns.get(empId) || { name, totalMinutes: 0, count: 0, rawClockIns: [] };
						existing.totalMinutes += minutes;
						existing.count += 1;
						existing.rawClockIns.push(record.clock_in);
						employeeClockIns.set(empId, existing);
					});
				}

				const earlyBirdsData = Array.from(employeeClockIns.values())
					.map(emp => {
						const avg = emp.totalMinutes / emp.count;
						const hours = Math.floor(avg / 60);
						const mins = Math.floor(avg % 60);
						const ampm = hours >= 12 ? 'PM' : 'AM';
						const displayHours = hours % 12 || 12;

						const sortedRaw = [...emp.rawClockIns].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
						const recentClockIns = sortedRaw.slice(0, 5).map(iso => {
							const d = new Date(iso);
							const h = d.getHours();
							const m = d.getMinutes();
							const ap = h >= 12 ? 'PM' : 'AM';
							const dh = h % 12 || 12;
							return `${dh}:${m.toString().padStart(2, '0')} ${ap}`;
						});

						return {
							name: emp.name,
							avgClockInMinutes: avg,
							formattedTime: `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`,
							recentClockIns
						};
					})
					.sort((a, b) => a.avgClockInMinutes - b.avgClockInMinutes)
					.slice(0, 5);

				setEarlyBirds(earlyBirdsData);

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
				const currentMonthIdx = nowTime.getMonth();
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
					clockedIn,
					pendingLeaves: (pendingData || []).length,
					onLeave: leaveCount || 0,
					weeklyOff,
					blockedEmployees: blockedCount || 0,
					pendingResignations: pendingResCount || 0,
					processingResignations: processingResCount || 0,
					acceptedResignations: acceptedResCount || 0,
					attendanceRate,
					onTimeCount,
					lateCount,
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
				setTeams((teamsData as unknown as TeamWithDetails[]) || []);
				setTodayActivities((activityData as unknown as typeof todayActivities) || []);
			} catch (err) {
				console.error("Error fetching general dashboard metrics:", err);
			}
		};
		fetchAll();
	}, [employee?.id, calendarMonth]);

	// ── Location helpers (same logic as employee dashboard) ──────────────────────
	const getDistanceInMeters = (
		lat1: number, lng1: number, lat2: number, lng2: number
	) => {
		const toRad = (v: number) => (v * Math.PI) / 180;
		const R = 6371e3;
		const φ1 = toRad(lat1), φ2 = toRad(lat2);
		const Δφ = toRad(lat2 - lat1), Δλ = toRad(lng2 - lng1);
		const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	};

	const recheckLocation = (showToast = false) => {
		if (!employee) return;
		if (todayAttendance?.clock_in) return;

		if (employee.is_wfh) {
			setIsLocationAllowed(true);
			setLocationMessage(null);
			return;
		}

		if (typeof window === "undefined" || !("geolocation" in navigator)) {
			setIsLocationAllowed(false);
			setLocationMessage("Location is not available in this browser. Please enable location to clock in.");
			return;
		}

		setIsCheckingLocation(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				const distance = getDistanceInMeters(latitude, longitude, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);
				const withinRadius = distance <= 50;
				setIsLocationAllowed(withinRadius);
				setLocationMessage(withinRadius ? null : "📍 Move a little closer to the office to clock in 😅");
				setIsCheckingLocation(false);
				if (showToast) {
					if (withinRadius) toast.success("✅ You're in the zone 😎");
					else toast.error("🚫 Still too far away 👀");
				}
			},
			(error) => {
				console.error("Geolocation error:", error);
				setIsLocationAllowed(false);
				setLocationMessage("📍 Oops! Couldn't check your location");
				setIsCheckingLocation(false);
				if (showToast) toast.error("Unable to access location.");
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
		);
	};

	useEffect(() => {
		recheckLocation();
	}, [employee, todayAttendance]);

	const handleClockIn = async () => {
		if (!employee) return;

		if (isLocationAllowed === false) {
			toast.error(locationMessage || "You are currently outside the allowed office radius for clock in.");
			return;
		}

		setIsClockInLoading(true);
		try {
			const supabase = createClient();
			const now = new Date();
			const today = toLocalDateStr(now);
			const nowISO = now.toISOString();

			// Duplicate clock-in guard
			const { data: existing, error: fetchError } = await supabase
				.from("attendance")
				.select("id")
				.eq("employee_id", employee.id)
				.eq("date", today)
				.maybeSingle();
			if (fetchError) throw fetchError;
			if (existing) { console.warn("Already clocked in today"); return; }

			const status = determineAttendanceStatus(now, settings?.max_clocking_time);

			const { error: insertError } = await supabase.from("attendance").insert({
				employee_id: employee.id,
				date: today,
				clock_in: nowISO,
				status,
				is_wfh: employee.is_wfh || false,
			});
			if (insertError) throw insertError;

			const { data } = await supabase
				.from("attendance")
				.select("*")
				.eq("employee_id", employee.id)
				.eq("date", today)
				.single();
			setTodayAttendance(data as Attendance);
			setStats((s) => ({ ...s, clockedIn: s.clockedIn + 1 }));
		} catch (error) {
			console.error("Clock in failed:", error);
			toast.error("Clock in failed. Please try again.");
		} finally {
			setIsClockInLoading(false);
		}
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
		setIsClockOutDialogOpen(false);
	};

	const confirmClockOut = () => {
		setIsClockOutDialogOpen(true);
		setClockOutTimer(3);
		setIsClockOutButtonDisabled(true);
	};

	useEffect(() => {
		if (!isClockOutDialogOpen) {
			setClockOutTimer(3);
			setIsClockOutButtonDisabled(true);
			return;
		}

		if (clockOutTimer > 0) {
			const timer = setInterval(() => {
				setClockOutTimer((prev) => {
					if (prev <= 1) {
						setIsClockOutButtonDisabled(false);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
			return () => clearInterval(timer);
		}
	}, [isClockOutDialogOpen, clockOutTimer]);

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
		<div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
			<DashboardHeader
				title=""
				searchPlaceholder="Search employees by name"
			/>

			{/* Main Grid Pane */}
			<div className="flex-1 p-4 md:p-6 space-y-6">

				{/* ── PATH CRUMB INDICATOR ── */}
				<div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-left">
					<Link href="/hr/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
					<span>/</span>
					<span className="text-slate-500">Overview</span>
				</div>

				{/* ── Clock-In / Greeting Card + Calendar ── */}
				<div className="grid gap-6 grid-cols-1 md:grid-cols-2">

					{/* Clock Card */}
					<div className="relative p-0.5 rounded-[32px] overflow-hidden bg-slate-950 shadow-2xl border border-white/5 min-h-[500px]">
						{/* Glowing glass background elements/shapes */}
						<div className="absolute top-[-10%] left-[-10%] w-72 h-72 rounded-full bg-gradient-to-tr from-fuchsia-600/50 to-indigo-650/40 opacity-70 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
						<div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/40 via-purple-600/40 to-pink-650/50 opacity-80 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
						<div className="absolute top-[40%] right-[10%] w-48 h-48 rounded-full bg-cyan-500/30 opacity-60 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

						<Card className="relative z-10 h-full rounded-[30px] border border-white/10 border-t-white/15 bg-white/[0.04] dark:bg-black/[0.15] backdrop-blur-3xl shadow-none overflow-hidden text-left">
							{/* Grid Texture overlay */}
							<div
								className="absolute inset-0 opacity-[0.15] pointer-events-none"
								style={{
									backgroundImage: `
										linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
										linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
									`,
									backgroundSize: '24px 24px'
								}}
							/>

							<CardContent className="p-7 space-y-6 relative z-10 flex flex-col justify-between h-full">
								{/* Greeting */}
								<div className="space-y-4">
									<div className="flex items-center justify-between gap-2">
										<p className="text-[15px] font-black text-slate-300 uppercase tracking-widest leading-none m-0">
											Hey 👋
											{employee ? `, ${employee.first_name}` : ""}
										</p>

										<div className="flex items-center gap-1.5">
											<p className="text-[10px] font-black uppercase tracking-wider bg-white/10 border border-white/15 text-slate-200 px-3 py-1 rounded-full leading-none flex items-center shadow-sm">
												{new Date().toLocaleDateString(
													"en-US",
													{
														weekday: "short",
														month: "short",
														day: "numeric",
													},
												)}
											</p>
										</div>
									</div>

									<h3 className="text-2xl font-black uppercase tracking-tight leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
										{greeting}
									</h3>
								</div>

								{/* Status pill: Clocked In (light green/emerald glass style) */}
								{isActive && (
									<div className="flex justify-start">
										<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider px-3 py-1 shadow-sm backdrop-blur-md">
											<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
											Clocked In
										</span>
									</div>
								)}

								{/* Timer: three boxes */}
								<div className="flex flex-col items-center gap-3">
									{isActive && elapsed ? (
										<>
											<div className="grid grid-cols-3 gap-3.5 w-full max-w-[340px]">
												{(
													[
														"hours",
														"minutes",
														"seconds",
													] as const
												).map((unit) => (
													<div
														key={unit}
														className="flex flex-col items-center justify-center rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 py-5 px-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all hover:scale-[1.02] hover:bg-white/10">
														<span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
															{elapsed[unit]}
														</span>
														<span className="text-[9px] font-black uppercase tracking-wider text-slate-300 mt-1.5">
															{unit === "hours"
																? "Hours"
																: unit === "minutes"
																	? "Minutes"
																	: "Seconds"}
														</span>
													</div>
												))}
											</div>
											<p className="text-[10px] text-slate-400 font-bold mt-1">
												Clocked in:{" "}
												<span className="font-extrabold text-white">
													{new Date(
														todayAttendance!.clock_in!,
													).toLocaleDateString("en-US", {
														weekday: "short",
														month: "short",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</span>
											</p>
										</>
									) : (
										<>
											<div className="grid grid-cols-3 gap-3.5 w-full max-w-[340px]">
												{(
													[
														"hours",
														"minutes",
														"ampm",
													] as const
												).map((unit) => (
													<div
														key={unit}
														className="flex flex-col items-center justify-center rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 py-5 px-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all hover:scale-[1.02] hover:bg-white/10">
														<span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
															{currentTime[unit]}
														</span>
														<span className="text-[9px] font-black uppercase tracking-wider text-slate-300 mt-1.5">
															{unit === "hours"
																? "Hours"
																: unit === "minutes"
																	? "Minutes"
																	: "AM/PM"}
														</span>
													</div>
												))}
											</div>
											<p className="text-[10px] text-slate-400 font-bold mt-1">
												Current time
											</p>
										</>
									)}
								</div>

								{/* Primary action */}
								<div className="flex justify-center relative z-10 w-full">
									{isActive ? (
										<Dialog
											open={isClockOutDialogOpen}
											onOpenChange={
												setIsClockOutDialogOpen
											}>
											<DialogTrigger asChild>
												<Button
													onClick={confirmClockOut}
													className="gap-2 rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-fuchsia-600 hover:from-rose-450 hover:via-red-450 hover:to-fuchsia-555 active:scale-[0.98] transition-all text-white px-6 h-13 text-sm font-extrabold w-full shadow-[0_8px_24px_rgba(244,63,94,0.35)] border border-white/10 cursor-pointer">
													<Square className="h-4 w-4 fill-white" />
													Clock Out
												</Button>
											</DialogTrigger>
											<DialogContent className="max-w-[360px] rounded-[24px] border border-white/10 bg-slate-950 p-5 shadow-2xl text-slate-200">
												<DialogHeader>
													<DialogTitle className="text-xs font-black uppercase tracking-wider text-white text-left">
														Confirm Clock Out
													</DialogTitle>
													<p className="text-xs text-slate-300 leading-relaxed mt-2 text-left">
														Are you sure you want to clock out? This action will record your departure time and calculate your total hours worked.
													</p>
												</DialogHeader>
												<DialogFooter className="flex gap-2 mt-4 justify-end">
													<Button
														className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white h-10 px-4 font-bold text-xs transition-all cursor-pointer"
														onClick={() =>
															setIsClockOutDialogOpen(
																false,
															)
														}>
														Cancel
													</Button>
													<Button
														onClick={handleClockOut}
														disabled={
															isClockOutButtonDisabled
														}
														className="rounded-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white h-10 px-4 font-bold text-xs transition-all shadow-[0_4px_12px_rgba(225,29,72,0.3)] cursor-pointer">
														{isClockOutButtonDisabled
															? `Clock Out in ${clockOutTimer}s`
															: "Clock Out"}
													</Button>
												</DialogFooter>
											</DialogContent>
										</Dialog>
									) : isDone ? (
										<Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-sm gap-1.5 backdrop-blur-md">
											<CheckCircle2 className="h-4 w-4 text-emerald-400" />
											Shift Completed
										</Badge>
									) : (
										<div className="w-full space-y-2">
											{(!employee?.is_wfh && isLocationAllowed === false) ? (
												<Button
													onClick={() => recheckLocation(true)}
													disabled={isCheckingLocation || isClockInLoading}
													className="gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-450 hover:to-orange-550 active:scale-[0.98] transition-all text-white px-6 h-13 text-sm font-bold w-full shadow-[0_8px_24px_rgba(245,158,11,0.35)] border border-white/10"
												>
													<RefreshCw className={`h-4 w-4 ${isCheckingLocation ? "animate-spin" : ""}`} />
													{isCheckingLocation ? "Verifying location..." : "Verify Location"}
												</Button>
											) : (
												<Button
													onClick={handleClockIn}
													disabled={
														isClockInLoading ||
														isCheckingLocation ||
														(!employee?.is_wfh && isLocationAllowed === false)
													}
													title={
														isCheckingLocation
															? "Checking your location..."
															: isLocationAllowed === false && locationMessage
																? locationMessage
																: undefined
													}
													className="gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-450 hover:to-pink-400 active:scale-[0.98] transition-all text-white px-6 h-13 text-sm font-bold w-full disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(168,85,247,0.35)] border border-white/10 cursor-pointer"
												>
													{isClockInLoading ? (
														<Loader2 className="h-4 w-4 animate-spin text-white" />
													) : isCheckingLocation ? (
														<Loader2 className="h-4 w-4 animate-spin text-white" />
													) : (
														<Clock className="h-4 w-4" />
													)}
													{isClockInLoading
														? "Clocking In..."
														: isCheckingLocation
															? "Verifying location..."
															: "Clock In"}
												</Button>
											)}
										</div>
									)}
								</div>

								{isLocationAllowed === false && locationMessage && (
									<p className="text-xs text-white/60 text-center mt-1 font-bold flex items-center justify-center gap-1.5">
										<AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
										{locationMessage}
									</p>
								)}

								{/* Today's record */}
								{recentAttendance.filter((att) => {
									const t = new Date();
									const d = new Date(att.date + "T12:00:00");
									return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
								}).map((att) => (
									<div key={att.id} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3 mt-4 w-full">
										<div className="flex items-center gap-2 min-w-0">
											<CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
											<span className="font-semibold text-xs text-white truncate">
												{new Date(att.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
											</span>
											<span className="text-slate-400 text-xs">·</span>
											<span className="text-slate-300 text-xs font-medium truncate">{formatTime(att.clock_in)} – {formatTime(att.clock_out)}</span>
										</div>
										{att.total_hours != null && (
											<span className="text-[10px] font-black text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 shadow-sm tabular-nums shrink-0">{att.total_hours.toFixed(2)}h</span>
										)}
									</div>
								))}
							</CardContent>
						</Card>
					</div>

					{/* Calendar Card */}
					<div className="bg-white border border-slate-100 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between overflow-hidden">
						<div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
							<div className="flex items-center gap-2 text-left">
								<Calendar className="w-4.5 h-4.5 text-blue-600" />
								<div>
									<h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Attendance Calendar</h4>
									<p className="text-[9px] text-slate-400 font-bold mt-0.5">{calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<button
									onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
									className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer border border-slate-150"
								>
									<ChevronLeft className="h-4 w-4 text-slate-500" />
								</button>
								<button
									onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
									className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer border border-slate-150"
								>
									<ChevronRight className="h-4 w-4 text-slate-500" />
								</button>
							</div>
						</div>
						<div className="p-5 space-y-3">
							{/* Day headers */}
							<div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
								{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
									<div key={d} className="py-1">{d}</div>
								))}
							</div>
							{/* Day cells — employee-style with Present/Late/Absent/Weekoff/Leave badges */}
							<div className="grid grid-cols-7 gap-1.5">
								{monthDays.map((day, idx) => {
									if (!day) return <div key={idx} />;
									const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
									const isToday = dateStr === todayStr;
									const att = monthAttendanceByDate[dateStr];
									const festivalTitles = festivalMap[dateStr];

									// Determine status label & type (same logic as employee dashboard)
									let label: string | null = null;
									let type: "present" | "late" | "absent" | "weekoff" | "leave" | null = null;

									const isOnLeave = myApprovedLeaves.some(
										(leave) => dateStr >= leave.start_date && dateStr <= leave.end_date
									);

									if (att) {
										if (att.status === "present") { label = "Present"; type = "present"; }
										else if (att.status === "late") { label = "Late"; type = "late"; }
										else { label = "Leave"; type = "leave"; }
									} else {
										const weekOffDay = employee?.week_off_day;
										const isWeekoff = weekOffDay !== null && weekOffDay !== undefined
											? day.getDay() === weekOffDay
											: (day.getDay() === 0 || day.getDay() === 6);
										if (isOnLeave) { label = "Leave"; type = "leave"; }
										else if (isWeekoff) { label = "Weekoff"; type = "weekoff"; }
										else if (dateStr < todayStr) { label = "Absent"; type = "absent"; }
									}

									// Badge class per status type
									let badgeClass = "";
									if (type) {
										switch (type) {
											case "present": badgeClass = "bg-emerald-50/80 text-emerald-600 border border-emerald-100/50"; break;
											case "late":    badgeClass = "bg-amber-50/80 text-amber-600 border border-amber-100/50"; break;
											case "absent":  badgeClass = "bg-red-50/60 text-red-500 border border-red-100/40"; break;
											case "weekoff": badgeClass = "bg-slate-100/80 text-slate-500 border border-slate-200/50"; break;
											case "leave":   badgeClass = "bg-indigo-50/80 text-indigo-500 border border-indigo-100/50"; break;
										}
									}

									// Day cell outer class
									const cellClass = isToday
										? "bg-blue-50/30 border-2 border-blue-500/80 shadow-[0_4px_12px_rgba(59,130,246,0.06)]"
										: "bg-slate-50/30 text-slate-700 border border-slate-100 hover:bg-slate-50/80";

									return (
										<div
											key={dateStr}
											onClick={() => festivalTitles && setSelectedFestivalDate(dateStr)}
											className={`relative flex min-h-[52px] py-1.5 flex-col items-center justify-center rounded-xl text-[10px] font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${cellClass} ${festivalTitles ? "cursor-pointer" : "cursor-default"}`}
										>
											<span className={`text-[10px] ${isToday ? "text-blue-600 font-extrabold" : "text-slate-800"}`}>
												{day.getDate()}
											</span>
											{/* Holiday dot */}
											{festivalTitles && (
												<span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-pink-500 inline-block" />
											)}
											{/* Status badge (hide when a festival dot takes priority) */}
											{label && type && !festivalTitles ? (
												<span className={`mt-0.5 text-[6px] font-black uppercase tracking-wider px-1 py-0.5 rounded-md ${badgeClass}`}>
													{label}
												</span>
											) : isToday && !label && !festivalTitles ? (
												<span className="mt-0.5 text-[6px] font-black uppercase tracking-wider px-1 py-0.5 rounded-md bg-blue-50/80 text-blue-600 border border-blue-100/40">
													Today
												</span>
											) : null}
										</div>
									);
								})}
							</div>
							{/* Legend */}
							<div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
								{[
									{ label: "Present", cls: "bg-emerald-400" },
									{ label: "Late",    cls: "bg-amber-400" },
									{ label: "Absent",  cls: "bg-red-400" },
									{ label: "Weekoff", cls: "bg-slate-400" },
									{ label: "Leave",   cls: "bg-indigo-400" },
									{ label: "Holiday", cls: "bg-pink-500" },
								].map((l) => (
									<div key={l.label} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
										<span className={`h-2 w-2 rounded-full ${l.cls} inline-block`} />
										{l.label}
									</div>
								))}
							</div>
							{/* Festival popup */}
							{selectedFestivalDate && festivalMap[selectedFestivalDate] && (
								<div
									className="mt-2 rounded-xl border border-pink-200 bg-pink-50 p-3 text-xs cursor-pointer text-left"
									onClick={() => setSelectedFestivalDate(null)}
								>
									<p className="font-bold text-pink-800 mb-1">
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
									<p className="text-pink-500/70 mt-2 text-[9px] font-bold">Tap to dismiss</p>
								</div>
							)}
						</div>
					</div>
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
							<Link href="/hr/announcements" className="text-[9px] font-black uppercase bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
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
							<Link href="/hr/leave" className="text-[9px] font-black uppercase bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
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
							<Link href="/hr/resignations" className="text-[9px] font-black uppercase bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
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
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

					{/* Column 1: Leave performance line chart */}
					<div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left">
						<div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
							<div>
								<h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Leave Performance</h3>
								<p className="text-[9px] text-slate-400 font-bold mt-0.5">
									Leave requests & deductions — {leavePerformance.year}
								</p>
							</div>
							<Link href="/hr/leave" className="text-[8px] font-black uppercase tracking-wide bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
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

					{/* Column 2: Early Birds Line Chart */}
					<div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left">
						<div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
							<div>
								<h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Early Birds</h3>
								<p className="text-[9px] text-slate-400 font-bold mt-0.5">Top 5 earliest average clock-ins this month</p>
							</div>
							<Link href="/hr/attendance" className="text-[9px] font-black uppercase bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
								View All
							</Link>
						</div>

						<div className="flex-1 w-full flex flex-col items-center justify-center pt-2">
							{earlyBirds.length === 0 ? (
								<p className="text-[10px] text-slate-400 italic">No clock-in data yet.</p>
							) : (
								<div className="w-full relative">
									{(() => {
										const chartW = 300;
										const chartH = 100;
										const padX = 20;
										const padY = 15;
										const values = earlyBirds.map(e => e.avgClockInMinutes);
										const minVal = Math.min(...values) - 15;
										const maxVal = Math.max(...values) + 15;
										const range = maxVal - minVal || 1;
										const innerW = chartW - padX * 2;
										const innerH = chartH - padY * 2;
										
										const pathData = values.map((val, i) => {
											const x = padX + (i / (values.length - 1)) * innerW;
											const y = padY + ((val - minVal) / range) * innerH; // earliest time (lowest val) at top
											return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
										}).join(" ");

										const pointCoords = values.map((val, i) => ({
											x: padX + (i / (values.length - 1)) * innerW,
											y: padY + ((val - minVal) / range) * innerH,
											val,
											emp: earlyBirds[i]
										}));

										return (
											<>
												<svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto overflow-visible">
													<path d={pathData} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
													{pointCoords.map((p, i) => (
														<g key={i}>
															<circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#2563eb" strokeWidth="2" />
															<text x={p.x} y={p.y - 14} fontSize="5" fontWeight="bold" fill="#94a3b8" textAnchor="middle" className="uppercase tracking-wider">Avg.</text>
															<text x={p.x} y={p.y - 7} fontSize="7" fontWeight="black" fill="#64748b" textAnchor="middle">{p.emp.formattedTime}</text>
														</g>
													))}
												</svg>
												<div className="flex justify-between w-full mt-1.5 px-1">
													{earlyBirds.map((e, i) => {
														const parts = e.name.split(' ');
														const shortName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : e.name;
														return (
															<div key={i} className="text-[7px] text-slate-500 font-bold max-w-[40px] text-center leading-tight">
																<div className="text-[8px] font-black text-slate-400 mb-0.5">#{i + 1}</div>
																{shortName}
															</div>
														);
													})}
												</div>
												<details className="w-full mt-3 pt-3 border-t border-slate-100 group">
													<summary className="text-[8px] font-black uppercase text-slate-400 flex items-center justify-between cursor-pointer list-none outline-none hover:text-slate-600 transition-colors select-none [&::-webkit-details-marker]:hidden">
														<span>Recent Clock-ins</span>
														<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-open:rotate-180 transition-transform duration-200 text-slate-300">
															<polyline points="6 9 12 15 18 9"></polyline>
														</svg>
													</summary>
													<div className="flex flex-col gap-1.5 mt-2.5">
														{earlyBirds.map((e, i) => {
															const parts = e.name.split(' ');
															const shortName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : e.name;
															return (
																<div key={i} className="flex items-center justify-between gap-1 border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
																	<div className="flex items-center gap-1.5 w-16 shrink-0">
																		<span className="text-[8px] font-black text-slate-300">#{i + 1}</span>
																		<span className="text-[9px] font-bold text-slate-700 truncate">{shortName}</span>
																	</div>
																	<div className="flex items-center gap-1 justify-end flex-wrap">
																		{e.recentClockIns.map((time, j) => (
																			<span key={j} className="text-[7px] font-bold text-slate-500 bg-slate-50 border border-slate-150 px-1 py-0.5 rounded whitespace-nowrap">
																				{time}
																			</span>
																		))}
																		{e.recentClockIns.length === 0 && <span className="text-[8px] text-slate-400 italic">No recent logs</span>}
																	</div>
																</div>
															);
														})}
													</div>
												</details>
											</>
										);
									})()}
								</div>
							)}
						</div>
					</div>

				</div>

				{/* ── Activity | Teams | Birthdays ── */}
				<div className="grid gap-5 lg:grid-cols-3 items-stretch">
					{/* Today's Activity */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden flex flex-col h-full">
						<div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
							<div className="flex items-center gap-2 text-left">
								<Activity className="w-4.5 h-4.5 text-sky-500" />
								<div>
									<h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Today's Activity</h4>
									<p className="text-[9px] text-slate-400 font-bold mt-0.5">{todayActivities.length} check-in{todayActivities.length !== 1 ? "s" : ""} today</p>
								</div>
							</div>
						</div>
						<div className="p-5 flex-grow flex flex-col min-h-0">
							{todayActivities.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-slate-50 border border-slate-100 flex-grow">
									<div className="h-12 w-12 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-3">
										<LogIn className="h-5 w-5 text-sky-500/70" />
									</div>
									<p className="text-sm font-bold text-slate-700">No activity yet</p>
									<p className="text-xs text-slate-400 mt-1 max-w-[160px] font-semibold">Clock-ins will appear here</p>
								</div>
							) : (
								<ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide text-left flex-grow">
									{todayActivities.map((a) => (
										<li key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-2.5 hover:bg-slate-50 transition-colors">
											<Avatar className="h-9 w-9 shrink-0 border border-slate-200 shadow-sm">
												{a.employee?.avatar_url ? (
													<AvatarImage className="object-cover" src={a.employee.avatar_url} alt={a.employee?.first_name} />
												) : null}
												<AvatarFallback className="text-xs font-black bg-slate-100 text-slate-600">
													{a.employee?.first_name?.[0]}{a.employee?.last_name?.[0]}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="text-xs font-black text-slate-800 truncate">{a.employee?.first_name} {a.employee?.last_name}</p>
												<p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
													<Clock className="h-3 w-3 shrink-0" />
													{formatTime(a.clock_in)}
													{a.total_hours != null && (
														<><span className="text-slate-200">·</span><span>{a.total_hours.toFixed(2)}h</span></>
													)}
												</p>
											</div>
											<span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${a.status === "present" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
												{a.status === "present" ? "Present" : "Late"}
											</span>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>

					{/* Recent Teams */}
					<div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden flex flex-col h-full">
						<div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
							<div className="flex items-center gap-2 text-left">
								<Users className="w-4.5 h-4.5 text-violet-500" />
								<div>
									<h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Recent Teams</h4>
									<p className="text-[9px] text-slate-400 font-bold mt-0.5">{teams.length} active groups</p>
								</div>
							</div>
							<Link href="/hr/teams" className="text-[9px] font-black uppercase bg-slate-50 border border-slate-150 px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors">
								View All
							</Link>
						</div>
						<div className="p-5 flex-grow flex flex-col min-h-0">
							{teams.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-slate-50 border border-slate-100 flex-grow">
									<p className="text-xs text-slate-400 font-bold">No teams yet</p>
								</div>
							) : (
								<ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide text-left flex-grow">
									{teams.map((team) => (
										<li key={team.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5 bg-white hover:bg-slate-50 transition-colors">
											<Avatar className="h-9 w-9 shrink-0 border border-slate-200">
												{team.leader?.avatar_url ? (
													<AvatarImage className="object-cover" src={team.leader.avatar_url} alt={team.leader?.first_name} />
												) : null}
												<AvatarFallback className="text-xs font-black bg-violet-50 text-violet-600">
													{team.leader?.first_name?.[0]}{team.leader?.last_name?.[0]}{!team.leader && team.name?.[0]}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<p className="font-black text-xs text-slate-800 truncate">{team.name}</p>
												<p className="text-[10px] text-slate-400 font-bold">{team.team_members?.length || 0} members</p>
											</div>
											<span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 border border-violet-205 text-[10px] font-black text-violet-750">
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
