"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingBirthdays } from "@/components/dashboard/upcoming-birthdays";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { OFFICE_LOCATION } from "@/lib/constant";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useSettings } from "@/contexts/settings-context";
import { useUser } from "../../../contexts/user-context";
import {
	Clock,
	Calendar,
	CheckCircle2,
	CalendarDays,
	Users,
	Mail,
	Building2,
	CalendarCheck,
	Square,
	Globe,
	Loader2,
	RefreshCw,
	AlertCircle,
} from "lucide-react";
import type { Attendance, LeaveBalance, LeaveType } from "@/lib/types";
import { determineAttendanceStatus } from "@/lib/utils";
import { toast } from "react-hot-toast";
interface LeaveBalanceWithType extends LeaveBalance {
	leave_type?: LeaveType;
}

interface MinimalTeamMember {
	id: string;
	employee_id: string;
	first_name: string;
	last_name: string;
	avatar_url: string | null;
	designation: string | null;
	email: string;
	isSelf: boolean;
	isLeader: boolean;
}

/** Local date as YYYY-MM-DD (avoids UTC shift in calendar and API queries). */
function toLocalDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
		2,
		"0",
	)}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EmployeeDashboardPage() {
	const { employee } = useUser();
	const { settings } = useSettings();
	const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(
		null,
	);
	const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceWithType[]>(
		[],
	);
	const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
	const [monthAttendance, setMonthAttendance] = useState<Attendance[]>([]);
	const [approvedLeaveRecords, setApprovedLeaveRecords] = useState<any[]>([]);
	const [teamMembers, setTeamMembers] = useState<MinimalTeamMember[]>([]);
	const [isTeamLoading, setIsTeamLoading] = useState(false);
	const [stats, setStats] = useState({
		daysWorked: 0,
		hoursThisWeek: 0,
		pendingLeaves: 0,
		approvedLeaves: 0,
	});
	const [now, setNow] = useState(() => new Date());
	const [isClockOutDialogOpen, setIsClockOutDialogOpen] = useState(false);
	const [clockOutTimer, setClockOutTimer] = useState(3);
	const [isClockOutButtonDisabled, setIsClockOutButtonDisabled] =
		useState(true);
	const [isClockInLoading, setIsClockInLoading] = useState(false);

	const [isLocationAllowed, setIsLocationAllowed] = useState<boolean | null>(
		null,
	);
	const [isCheckingLocation, setIsCheckingLocation] = useState(false);
	const [locationMessage, setLocationMessage] = useState<string | null>(null);

	useEffect(() => {
		if (employee) {
			fetchData();
		}
	}, [employee]);

	// Live clock/timer tick (for current time when not clocked in, elapsed when clocked in)
	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(interval);
	}, []);

	const fetchData = async () => {
		if (!employee) return;
		const supabase = createClient();
		const today = toLocalDateStr(new Date());
		const currentYear = new Date().getFullYear();

		// Fetch today's attendance
		const { data: attendanceData } = await supabase
			.from("attendance")
			.select("*")
			.eq("employee_id", employee.id)
			.eq("date", today)
			.maybeSingle();

		setTodayAttendance(attendanceData as Attendance | null);

		// Fetch leave balances
		const { data: leaveBalanceData } = await supabase
			.from("leave_balances")
			.select("*, leave_type:leave_types(*)")
			.eq("employee_id", employee.id)
			.eq("year", currentYear);

		setLeaveBalances(
			(leaveBalanceData as unknown as LeaveBalanceWithType[]) || [],
		);

		// Fetch attendance for this month (for stats, recent list, calendar)
		const monthStart = toLocalDateStr(
			new Date(currentYear, new Date().getMonth(), 1),
		);
		const { data: monthAttendanceData } = await supabase
			.from("attendance")
			.select("*")
			.eq("employee_id", employee.id)
			.gte("date", monthStart)
			.order("date", { ascending: true });

		const monthAttendanceTyped =
			(monthAttendanceData as Attendance[]) || [];

		const daysWorked = monthAttendanceTyped.filter((a) =>
			["present", "late"].includes(a.status),
		).length;

		setMonthAttendance(monthAttendanceTyped);
		setRecentAttendance(
			[...monthAttendanceTyped]
				.sort((a, b) => b.date.localeCompare(a.date))
				.slice(0, 5),
		);

		// Fetch pending leave requests
		const { count: pendingLeaves } = await supabase
			.from("leave_requests")
			.select("*", { count: "exact", head: true })
			.eq("employee_id", employee.id)
			.eq("status", "pending");

		// Fetch approved leaves this year
		const { count: approvedLeavesCount } = await supabase
			.from("leave_requests")
			.select("*", { count: "exact", head: true })
			.eq("employee_id", employee.id)
			.eq("status", "approved");

		// Fetch approved leave requests detailed data for current year to check against calendar
		const yearStart = `${currentYear}-01-01`;
		const { data: approvedLeaveData } = await supabase
			.from("leave_requests")
			.select("*")
			.eq("employee_id", employee.id)
			.eq("status", "approved")
			.gte("end_date", yearStart);

		setApprovedLeaveRecords(approvedLeaveData || []);

		setStats({
			daysWorked: daysWorked || 0,
			hoursThisWeek: 0,
			pendingLeaves: pendingLeaves || 0,
			approvedLeaves: approvedLeavesCount || 0,
		});

		// Fetch minimal team info (first team only, up to a few members + leader)
		setIsTeamLoading(true);

		// First, check if employee is a team leader
		const { data: leaderTeams } = await supabase
			.from("teams")
			.select(
				"id, leader_id, leader:employees!teams_leader_id_fkey(id, first_name, last_name, avatar_url, designation, email)",
			)
			.eq("leader_id", employee.id)
			.limit(1);

		let teamId: string | undefined;
		let teamData: any = null;

		if (leaderTeams && leaderTeams.length > 0) {
			// Employee is a team leader - we already have team data
			teamId = leaderTeams[0].id;
			teamData = leaderTeams[0];
		} else {
			// Employee is a regular team member
			const { data: membershipData } = await supabase
				.from("team_members")
				.select("team_id")
				.eq("employee_id", employee.id)
				.limit(1);

			teamId = membershipData?.[0]?.team_id as string | undefined;

			// Fetch team data for regular members
			if (teamId) {
				const { data } = await supabase
					.from("teams")
					.select(
						"leader_id, leader:employees!teams_leader_id_fkey(id, first_name, last_name, avatar_url, designation, email)",
					)
					.eq("id", teamId)
					.maybeSingle();
				teamData = data;
			}
		}

		if (teamId && teamData) {
			const leaderId = teamData.leader_id as string | null;
			const leaderEmp = teamData.leader;

			const { data: teamMembersData } = await supabase
				.from("team_members")
				.select(
					"id, employee:employees(id, first_name, last_name, avatar_url, designation, email)",
				)
				.eq("team_id", teamId)
				.limit(10);

			const mapped: MinimalTeamMember[] = (teamMembersData || []).map(
				(m: any) => ({
					id: m.id,
					employee_id: m.employee.id,
					first_name: m.employee.first_name,
					last_name: m.employee.last_name,
					designation: m.employee.designation,
					avatar_url: m.employee.avatar_url,
					email: m.employee.email,
					isSelf: m.employee.id === employee.id,
					isLeader: m.employee.id === leaderId,
				}),
			);

			// Add leader to the list if not already present
			if (
				leaderId &&
				leaderEmp &&
				!mapped.some((x) => x.employee_id === leaderId)
			) {
				mapped.unshift({
					id: `leader-${leaderId}`,
					employee_id: leaderId,
					first_name: leaderEmp.first_name,
					last_name: leaderEmp.last_name,
					designation: leaderEmp.designation ?? null,
					avatar_url: leaderEmp.avatar_url ?? null,
					email: leaderEmp.email ?? "",
					isSelf: leaderId === employee.id,
					isLeader: true,
				});
			}
			setTeamMembers(mapped);
		} else {
			setTeamMembers([]);
		}
		setIsTeamLoading(false);
	};

	// re-check location function
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
			setLocationMessage(
				"Location is not available in this browser. Please enable location to clock in.",
			);
			return;
		}

		setIsCheckingLocation(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				const distance = getDistanceInMeters(
					latitude,
					longitude,
					OFFICE_LOCATION.lat,
					OFFICE_LOCATION.lng,
				);
				const withinRadius = distance <= 50; // 50 meters

				setIsLocationAllowed(withinRadius);
				setLocationMessage(
					withinRadius
						? null
						: "📍 Move a little closer to the office to clock in 😅",
				);
				setIsCheckingLocation(false);

				if (showToast) {
					if (withinRadius) {
						toast.success("✅ You’re in the zone 😎");
					} else {
						toast.error("🚫 Still too far away 👀");
					}
				}
			},
			(error) => {
				console.error(
					"Geolocation error while checking clock-in location",
					error,
				);
				setIsLocationAllowed(false);
				setLocationMessage(
					"📍 Oops! Couldn't check your location",
				);
				setIsCheckingLocation(false);
				if (showToast) toast.error("Unable to access location.");
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
		);
	};

	// check if user is within 50 meters of the office
	useEffect(() => {
		recheckLocation();
	}, [employee, todayAttendance]);

	const handleClockIn = async () => {
		if (!employee) return;

		if (isLocationAllowed === false) {
			toast.error(
				locationMessage ||
				"You are currently outside the allowed office radius for clock in.",
			);
			return;
		}

		setIsClockInLoading(true);

		try {
			const supabase = createClient();
			const now = new Date();
			const today = toLocalDateStr(now);
			const nowISO = now.toISOString();

			// ── 1. Duplicate clock-in guard
			const { data: existing, error: fetchError } = await supabase
				.from("attendance")
				.select("id")
				.eq("employee_id", employee.id)
				.eq("date", today)
				.maybeSingle();

			if (fetchError) throw fetchError;
			if (existing) {
				console.warn("Already clocked in today");
				return;
			}

			// ── 2. Robust late-status determination
			const status = determineAttendanceStatus(
				now,
				settings?.max_clocking_time,
			);

			// ── 3. Insert attendance record
			const { error: insertError } = await supabase
				.from("attendance")
				.insert({
					employee_id: employee.id,
					date: today,
					clock_in: nowISO,
					status,
					is_wfh: employee.is_wfh || false,
				});

			if (insertError) throw insertError;

			await fetchData();
		} catch (error) {
			console.error("Clock in error:", error);
			toast.error("Clock in failed. Please try again.");
			// TODO: surface this error to the user via toast/alert
		} finally {
			setIsClockInLoading(false);
		}
	};

	const handleClockOut = async () => {
		if (!todayAttendance || !employee) return;
		const supabase = createClient();
		const now = new Date();
		const clockIn = new Date(todayAttendance.clock_in!);
		const totalHours = (
			(now.getTime() - clockIn.getTime()) /
			(1000 * 60 * 60)
		).toFixed(2);

		await supabase
			.from("attendance")
			.update({
				clock_out: now.toISOString(),
				total_hours: parseFloat(totalHours),
			})
			.eq("id", todayAttendance.id);

		await fetchData();
		setIsClockOutDialogOpen(false); // Close the dialog after clocking out
	};

	const confirmClockOut = () => {
		setIsClockOutDialogOpen(true);
		setClockOutTimer(3);
		setIsClockOutButtonDisabled(true);
	};

	// Handle clock-out button countdown timer
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

	const formatTime = (timeString: string | null) => {
		if (!timeString) return "-";
		return new Date(timeString).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const getElapsedHMS = (clockInIso: string, toDate: Date) => {
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
	};

	// get distance in meters between two coordinates
	const getDistanceInMeters = (
		lat1: number,
		lng1: number,
		lat2: number,
		lng2: number,
	) => {
		const toRad = (v: number) => (v * Math.PI) / 180;
		const R = 6371e3; // metres
		const φ1 = toRad(lat1);
		const φ2 = toRad(lat2);
		const Δφ = toRad(lat2 - lat1);
		const Δλ = toRad(lng2 - lng1);
		const a =
			Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
			Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	};

	const getCurrentTimeParts = (d: Date) => {
		const hours12 = d.getHours() % 12 || 12;
		const ampm = d.getHours() < 12 ? "AM" : "PM";
		return {
			hours: String(hours12).padStart(2, "0"),
			minutes: String(d.getMinutes()).padStart(2, "0"),
			ampm,
		};
	};

	const totalLeaveTypes = leaveBalances.length;

	const monthDays = useMemo(() => {
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const days: Array<Date | null> = [];

		const leadingEmpty = firstDay.getDay(); // 0-6
		for (let i = 0; i < leadingEmpty; i++) {
			days.push(null);
		}
		for (let d = 1; d <= lastDay.getDate(); d++) {
			days.push(new Date(year, month, d));
		}
		return days;
	}, []);

	const monthAttendanceByDate = useMemo(() => {
		const map: Record<string, Attendance> = {};
		for (const a of monthAttendance) {
			map[a.date] = a;
		}
		return map;
	}, [monthAttendance]);



	const todayStr = toLocalDateStr(new Date());

	return (
		<div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
			<DashboardHeader title="My Dashboard" description="Employee Portal" />

			<div className="flex-1 space-y-6 p-6">
				<div className="grid gap-6 grid-cols-1 md:grid-cols-2">
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

							<CardContent className="p-7 space-y-6 relative z-10">
								{/* Greeting */}
								<div>
									<div className="flex items-center justify-between gap-2">
										<p className="text-[15px] font-black text-slate-300 uppercase tracking-widest leading-none m-0">
											Hey 👋
											{employee
												? `, ${employee.first_name}`
												: ""}
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
											{employee?.is_wfh && (
												<p className="text-[10px] font-black uppercase tracking-wider bg-white/10 border border-white/15 text-slate-200 px-3 py-1 rounded-full leading-none flex items-center shadow-sm">
													WFH
												</p>
											)}
										</div>
									</div>

									<h3 className="text-2xl mt-4 font-black uppercase tracking-tight leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
										Good{" "}
										{new Date().getHours() < 12
											? "Morning"
											: new Date().getHours() < 18
												? "Afternoon"
												: "Evening"}
									</h3>
								</div>

								{/* Status pill: Clocked In (light green/emerald glass style) */}
								{todayAttendance?.clock_in &&
									!todayAttendance.clock_out && (
										<div className="flex justify-start">
											<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider px-3 py-1 shadow-sm backdrop-blur-md">
												<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
												Clocked In
											</span>
										</div>
									)}

								{/* Timer: three boxes (HOURS / MINUTES / SECONDS) when clocked in; three-part current time when not */}
								<div className="flex flex-col items-center gap-3">
									{todayAttendance?.clock_in &&
										!todayAttendance.clock_out ? (
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
															{
																getElapsedHMS(
																	todayAttendance.clock_in!,
																	now,
																)[unit]
															}
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
														todayAttendance.clock_in,
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
									) : todayAttendance?.clock_in &&
										todayAttendance?.clock_out ? (
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
															{
																getCurrentTimeParts(
																	now,
																)[unit]
															}
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
															{
																getCurrentTimeParts(
																	now,
																)[unit]
															}
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

								{/* Primary action: Clock Out (red) / Clock In (blue) / Completed badge */}
								<div className="flex justify-center relative z-10">
									{todayAttendance?.clock_in &&
										!todayAttendance.clock_out ? (
										<>
											<Dialog
												open={isClockOutDialogOpen}
												onOpenChange={
													setIsClockOutDialogOpen
												}>
												<DialogTrigger asChild>
													<Button
														onClick={confirmClockOut}
														className="gap-2 rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-fuchsia-600 hover:from-rose-450 hover:via-red-450 hover:to-fuchsia-555 active:scale-[0.98] transition-all text-white px-6 h-13 text-sm font-extrabold w-full shadow-[0_8px_24px_rgba(244,63,94,0.35)] border border-white/10">
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
															className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white h-10 px-4 font-bold text-xs transition-all"
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
															className="rounded-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white h-10 px-4 font-bold text-xs transition-all shadow-[0_4px_12px_rgba(225,29,72,0.3)]">
															{isClockOutButtonDisabled
																? `Clock Out in ${clockOutTimer}s`
																: "Clock Out"}
														</Button>
													</DialogFooter>
												</DialogContent>
											</Dialog>
										</>
									) : todayAttendance ? (
										<Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-sm gap-1.5 backdrop-blur-md">
											<CheckCircle2 className="h-4 w-4 text-emerald-400" />
											Shift Completed
										</Badge>
									) : (
										<div className="w-full">
											{(!employee?.is_wfh && isLocationAllowed === false) ? (
												<Button
													onClick={() => recheckLocation(true)}
													disabled={isCheckingLocation || isClockInLoading}
													className="gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-450 hover:to-orange-550 active:scale-[0.98] transition-all text-white px-6 h-13 text-sm font-bold w-full shadow-[0_8px_24px_rgba(245,158,11,0.35)] border border-white/10">
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
													className="gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-450 hover:to-pink-400 active:scale-[0.98] transition-all text-white px-6 h-13 text-sm font-bold w-full disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(168,85,247,0.35)] border border-white/10">
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

								{/* Recent Attendance (unchanged functionality) */}
								<div className="space-y-3 border-t border-white/10 pt-5">
									<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
										Today's Attendance
									</p>

									{recentAttendance.filter((att) => {
										const today = new Date();
										const attDate = new Date(att.date);

										return (
											attDate.getDate() === today.getDate() &&
											attDate.getMonth() ===
											today.getMonth() &&
											attDate.getFullYear() ===
											today.getFullYear()
										);
									}).length === 0 ? (
										<p className="text-[10px] text-slate-400 font-bold italic py-1 text-left">
											No attendance record for today.
										</p>
									) : (
										<div className="space-y-2">
											{recentAttendance
												.filter((att) => {
													const today = new Date();
													const attDate = new Date(
														att.date,
													);

													return (
														attDate.getDate() ===
														today.getDate() &&
														attDate.getMonth() ===
														today.getMonth() &&
														attDate.getFullYear() ===
														today.getFullYear()
													);
												})
												.map((att) => (
													<div
														key={att.id}
														className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 w-full">
														<div className="flex items-center gap-2 min-w-0">
															<CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
															<span className="font-semibold text-xs text-white truncate">
																{new Date(
																	att.date + "T12:00:00"
																).toLocaleDateString(
																	"en-US",
																	{
																		month: "short",
																		day: "numeric",
																	},
																)}
															</span>
															<span className="text-slate-400 text-xs">·</span>
															<span className="text-slate-300 text-xs font-medium truncate">
																{formatTime(
																	att.clock_in,
																)}{" "}
																–{" "}
																{formatTime(
																	att.clock_out,
																)}
															</span>
														</div>

														{att.total_hours != null && (
															<span className="text-[10px] font-black text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 shadow-sm tabular-nums shrink-0">
																{att.total_hours.toFixed(2)}h
															</span>
														)}
													</div>
												))}
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Calendar with holidays / attendance highlights */}
					<Card className="rounded-2xl border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
						<CardHeader className="pb-3 text-left">
							<CardTitle className="flex items-center justify-between text-base">
								<span className="flex items-center gap-2">
									<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(37,99,235,0.05)]">
										<Calendar className="h-4.5 w-4.5" />
									</div>
									<span className="text-xs font-black uppercase tracking-wider text-slate-805 dark:text-white">
										Calendar
									</span>
								</span>
								<span className="text-[10px] text-slate-400 font-bold">
									{new Date().toLocaleDateString("en-US", {
										weekday: "long",
										month: "long",
										day: "numeric",
										year: "numeric",
									})}
								</span>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-7 text-center text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-950/20 py-2 rounded-xl border border-slate-100/50 dark:border-slate-850/50">
								{[
									"Sun",
									"Mon",
									"Tue",
									"Wed",
									"Thu",
									"Fri",
									"Sat",
								].map((d) => (
									<div key={d}>{d}</div>
								))}
							</div>
							<div className="grid grid-cols-7 gap-1.5 text-xs">
								{monthDays.map((day, idx) => {
									if (!day) {
										return <div key={idx} />;
									}
									const dateStr = toLocalDateStr(day);
									const isToday = dateStr === todayStr;
									const att = monthAttendanceByDate[dateStr];
									const hasAttendance = !!att;

									const isOnLeave = approvedLeaveRecords.some(
										(leave) => dateStr >= leave.start_date && dateStr <= leave.end_date
									);

									// Determine type and label
									let label: string | null = null;
									let type: "present" | "late" | "absent" | "weekoff" | "leave" | null = null;

									if (hasAttendance) {
										if (att.status === "present") {
											label = "Present";
											type = "present";
										} else if (att.status === "late") {
											label = "Late";
											type = "late";
										} else {
											label = "Leave";
											type = "leave";
										}
									} else {
										const weekOffDay = employee?.week_off_day;
										const isWeekoff = weekOffDay !== null && weekOffDay !== undefined
											? day.getDay() === weekOffDay
											: (day.getDay() === 0 || day.getDay() === 6);

										if (isOnLeave) {
											label = "Leave";
											type = "leave";
										} else if (isWeekoff) {
											label = "Weekoff";
											type = "weekoff";
										} else if (dateStr < todayStr) {
											label = "Absent";
											type = "absent";
										}
									}

									// Define styling classes
									let badgeClass = "";
									if (type) {
										switch (type) {
											case "present":
												badgeClass = "bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100/50 dark:border-emerald-900/30";
												break;
											case "late":
												badgeClass = "bg-rose-50/80 dark:bg-rose-950/20 text-rose-500 dark:text-rose-455 border border-rose-100/50 dark:border-rose-900/30";
												break;
											case "absent":
												badgeClass = "bg-red-50/50 dark:bg-red-950/10 text-red-505 dark:text-red-400 border border-red-100/40 dark:border-red-900/20";
												break;
											case "weekoff":
												badgeClass = "bg-slate-100/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50";
												break;
											case "leave":
												badgeClass = "bg-indigo-50/80 dark:bg-indigo-950/20 text-indigo-505 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30";
												break;
										}
									}

									return (
										<div
											key={dateStr}
											className={`relative flex min-h-[48px] py-1.5 flex-col items-center justify-center rounded-xl text-[10px] font-bold transition-all duration-205 hover:scale-[1.02] active:scale-[0.98] ${isToday
												? "bg-blue-50/30 dark:bg-blue-950/10 border-2 border-blue-500/80 dark:border-blue-500/60 shadow-[0_4px_12px_rgba(59,130,246,0.06)]"
												: "bg-slate-50/30 dark:bg-slate-900/10 text-slate-700 dark:text-slate-350 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-850/60"
												}`}>
											<span className={`text-[10px] ${isToday ? "text-blue-600 dark:text-blue-400 font-extrabold" : "text-slate-800 dark:text-slate-205"}`}>
												{day.getDate()}
											</span>
											{label && type ? (
												<span className={`mt-1 text-[6.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${badgeClass}`}>
													{label}
												</span>
											) : isToday ? (
												<span className="mt-1 text-[6.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-50/80 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450 border border-blue-100/40 dark:border-blue-900/20">
													Today
												</span>
											) : null}
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Stats row */}
				<div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
					<StatCard
						title="Days Worked"
						value={stats.daysWorked}
						icon={<Calendar className="h-5 w-5" />}
						description="This month"
					/>
					<StatCard
						title='Pending Leaves'
						value={stats.pendingLeaves}
						icon={<Clock className='h-5 w-5' />}
						description='Awaiting approval'
					/>
					<StatCard
						title='Approved Leaves'
						value={stats.approvedLeaves}
						icon={<CheckCircle2 className='h-5 w-5' />}
						description='This year'
					/>
					<StatCard
						title='Leave Types'
						value={totalLeaveTypes}
						icon={<CalendarDays className='h-5 w-5' />}
						description='Total leave types'
					/>
				</div>

				{/* Bottom row: Team, Birthdays, Profile */}
				<div className="grid gap-6 lg:grid-cols-3">
					{/* Team card */}
					<Card className="rounded-2xl border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
						<CardHeader className="pb-3 text-left">
							<div className="flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 text-indigo-500 dark:text-indigo-400 shadow-[0_2px_8px_rgba(99,102,241,0.05)]">
									<Users className="h-4.5 w-4.5" />
								</div>
								<CardTitle className="text-xs font-black uppercase tracking-wider text-slate-805 dark:text-white">
									My Team
								</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="pt-0 space-y-2">
							{isTeamLoading ? (
								<p className="text-[10px] font-bold text-slate-400 text-left">
									Loading team...
								</p>
							) : teamMembers.length === 0 ? (
								<p className="text-[10px] font-bold text-slate-400 rounded-xl bg-slate-50/30 dark:bg-slate-950/20 py-8 text-center border border-slate-100 dark:border-slate-850">
									You are not assigned to any team yet.
								</p>
							) : (
								<div className="space-y-2.5 max-h-[370px] overflow-y-auto pr-1 scrollbar-hide">
									{teamMembers.map((m) => (
										<div
											key={m.id}
											className={`flex items-center gap-3 rounded-xl border p-2.5 transition-all ${m.isSelf
												? "border-indigo-100 dark:border-indigo-950/40 bg-indigo-50/10 dark:bg-indigo-950/10 shadow-[0_2px_8px_rgba(99,102,241,0.02)]"
												: "border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-850 hover:shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
												}`}>
											<Avatar className="h-8 w-8 shrink-0 border border-slate-100 dark:border-slate-800">
												{m.avatar_url ? (
													<AvatarImage
														className="object-cover"
														src={m.avatar_url}
														alt={`${m.first_name} ${m.last_name}`}
													/>
												) : null}
												<AvatarFallback className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
													{m.first_name[0]}
													{m.last_name[0]}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0 text-left">
												<p className="text-[10px] font-bold text-slate-800 dark:text-slate-205 truncate">
													{m.first_name} {m.last_name}
												</p>
												<p className="text-[9px] text-slate-400 font-bold mt-0.5 truncate">
													{m.designation || "—"}
												</p>
												<p className="text-[9px] text-slate-405 dark:text-slate-450 mt-0.5 truncate">
													{m.email}
												</p>
											</div>
											<div className="flex gap-1 shrink-0">
												{m.isLeader && (
													<span className="text-[8px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 px-1.5 py-0.5 rounded">
														Leader
													</span>
												)}
												{m.isSelf && (
													<span className="text-[8px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-850 text-slate-550 dark:text-slate-400 border border-slate-200/50 px-1.5 py-0.5 rounded">
														You
													</span>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Upcoming Birthdays (shared component) */}
					<UpcomingBirthdays />

					{/* Profile summary card */}
					<Card className="rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden text-left">
						<CardContent className="p-6 space-y-4">
							{employee ? (
								<>
									{/* Profile Header Row: Avatar + Name + Employee ID */}
									<div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-850/60">
										<Avatar className="h-14 w-14 border border-slate-100 dark:border-slate-800 shadow-sm">
											{employee.avatar_url ? (
												<AvatarImage
													className="object-cover"
													src={employee.avatar_url}
													alt={`${employee.first_name} ${employee.last_name}`}
												/>
											) : null}
											<AvatarFallback className="text-sm font-black bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400">
												{employee.first_name?.[0]}
												{employee.last_name?.[0]}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<h3 className="font-black text-sm text-slate-805 dark:text-white leading-tight truncate">
												{employee.first_name}{" "}
												{employee.last_name}
											</h3>
											<p className="text-[10px] text-slate-400 font-bold mt-0.5">
												ID:{" "}
												{employee.employee_id || "—"}
											</p>
										</div>
									</div>

									{/* Details Grid */}
									<div className="space-y-3.5">
										{/* Email */}
										{employee.email && (
											<div className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-850/50 p-2.5 rounded-xl">
												<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
													<Mail className="h-3.5 w-3.5" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
														Email
													</p>
													<p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
														{employee.email}
													</p>
												</div>
											</div>
										)}

										{/* Designation */}
										{employee.designation && (
											<div className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-850/50 p-2.5 rounded-xl">
												<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 text-indigo-500 dark:text-indigo-400 shrink-0">
													<Building2 className="h-3.5 w-3.5" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
														Designation
													</p>
													<p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
														{employee.designation}
													</p>
												</div>
											</div>
										)}

										{/* Mobile Number */}
										{employee.phone && (
											<div className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-850/50 p-2.5 rounded-xl">
												<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-550 dark:text-emerald-450 shrink-0">
													<svg
														className="h-3.5 w-3.5"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor">
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
														/>
													</svg>
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
														Mobile No
													</p>
													<p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
														{employee.phone}
													</p>
												</div>
											</div>
										)}

										{/* Joining Date */}
										{employee.joining_date && (
											<div className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-850/50 p-2.5 rounded-xl">
												<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50/80 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-900/30 text-violet-500 dark:text-violet-400 shrink-0">
													<CalendarCheck className="h-3.5 w-3.5" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
														Joining Date
													</p>
													<p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
														{new Date(
															employee.joining_date,
														).toLocaleDateString(
															"en-IN",
															{
																day: "numeric",
																month: "short",
																year: "numeric",
															},
														)}
													</p>
												</div>
											</div>
										)}

										{/* Website */}
										<div className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-850/50 p-2.5 rounded-xl">
											<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50/80 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 text-amber-600 dark:text-amber-450 shrink-0">
												<Globe className="h-3.5 w-3.5" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
													Website
												</p>
												<p className="text-[10px] font-extrabold text-blue-600 dark:text-blue-450 hover:underline truncate">
													<a
														href="https://mavericksmedia.org/"
														target="_blank"
														rel="noopener noreferrer">
														mavericksmedia.org
													</a>
												</p>
											</div>
										</div>
									</div>
								</>
							) : (
								<div className="flex flex-col items-center justify-center py-10 text-center">
									<div className="h-16 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800 mb-3" />
									<div className="h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
									<div className="h-3 w-20 animate-pulse rounded bg-slate-100/70 dark:bg-slate-800/70 mt-2" />
									<p className="text-xs text-slate-400 mt-3 font-bold">
										Loading profile...
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
