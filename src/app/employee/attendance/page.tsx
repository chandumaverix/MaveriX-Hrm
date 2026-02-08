"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import type { Attendance } from "@/lib/types";

type DayStatus = "present" | "late" | "absent" | "leave" | "week_off";

interface DayRow {
	date: string;
	status: DayStatus;
	record?: Attendance;
}

function getDatesInMonth(year: number, month: number): string[] {
	const dates: string[] = [];
	const days = new Date(year, month, 0).getDate();
	for (let d = 1; d <= days; d++) {
		const y = year.toString();
		const m = month.toString().padStart(2, "0");
		const day = d.toString().padStart(2, "0");
		dates.push(`${y}-${m}-${day}`);
	}
	return dates;
}

function getStatusBadge(status: DayStatus) {
	switch (status) {
		case "present":
			return (
				<Badge className='bg-success text-success-foreground'>
					Present
				</Badge>
			);
		case "late":
			return (
				<Badge className='bg-warning text-warning-foreground'>
					Late
				</Badge>
			);
		case "absent":
			return <Badge variant='destructive'>Absent</Badge>;
		case "leave":
			return <Badge variant='secondary'>On Leave</Badge>;
		case "week_off":
			return (
				<Badge variant='outline' className='border-muted-foreground/50'>
					Week Off
				</Badge>
			);
		default:
			return <Badge variant='outline'>{status}</Badge>;
	}
}

function formatTime(s: string | null) {
	if (!s) return "–";
	return new Date(s).toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function EmployeeAttendancePage() {
	const { employee } = useUser();
	const [records, setRecords] = useState<Attendance[]>([]);
	const [selectedMonth, setSelectedMonth] = useState(
		new Date().toISOString().slice(0, 7)
	);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (employee) fetchAttendance();
	}, [employee?.id, selectedMonth]);

	const fetchAttendance = async () => {
		if (!employee) return;
		const [year, month] = selectedMonth.split("-").map(Number);
		const start = `${year}-${String(month).padStart(2, "0")}-01`;
		const end = new Date(year, month, 0).toISOString().split("T")[0];

		const supabase = createClient();
		const { data } = await supabase
			.from("attendance")
			.select("*")
			.eq("employee_id", employee.id)
			.gte("date", start)
			.lte("date", end)
			.order("date", { ascending: false });

		setRecords(data || []);
		setIsLoading(false);
	};

	// Helper functions for month navigation
	const goToPreviousMonth = () => {
		const [year, month] = selectedMonth.split("-").map(Number);
		const prevDate = new Date(year, month - 2, 1);
		const newMonth = `${prevDate.getFullYear()}-${String(
			prevDate.getMonth() + 1
		).padStart(2, "0")}`;
		setSelectedMonth(newMonth);
	};

	const goToNextMonth = () => {
		const [year, month] = selectedMonth.split("-").map(Number);
		const nextDate = new Date(year, month, 1);
		const currentMonth = new Date().toISOString().slice(0, 7);
		const newMonth = `${nextDate.getFullYear()}-${String(
			nextDate.getMonth() + 1
		).padStart(2, "0")}`;
		// Don't allow going beyond current month
		if (newMonth <= currentMonth) {
			setSelectedMonth(newMonth);
		}
	};

	const recordByDate = new Map(records.map((r) => [r.date, r]));

	const [year, month] = selectedMonth.split("-").map(Number);
	const today = new Date().toISOString().slice(0, 10);
	const allDates = getDatesInMonth(year, month);
	const dates = allDates.filter((d) => d <= today);
	const weekOffDay = employee?.week_off_day ?? null;

	const days: DayRow[] = dates.map((date) => {
		const rec = recordByDate.get(date);
		const dayOfWeek = new Date(date + "T12:00:00").getDay();

		if (weekOffDay != null && dayOfWeek === weekOffDay) {
			return { date, status: "week_off" as DayStatus };
		}
		if (rec) {
			return { date, status: rec.status as DayStatus, record: rec };
		}
		return { date, status: "absent" as DayStatus };
	});

	// Most recent first
	days.reverse();

	const stats = {
		present: days.filter((d) => d.status === "present").length,
		late: days.filter((d) => d.status === "late").length,
		absent: days.filter((d) => d.status === "absent").length,
		leave: days.filter((d) => d.status === "leave").length,
		weekOff: days.filter((d) => d.status === "week_off").length,
	};

	// Format month display
	const monthDisplay = new Date(selectedMonth + "-01").toLocaleDateString(
		"en-US",
		{
			month: "long",
			year: "numeric",
		}
	);

	// Check if next button should be disabled
	const currentMonth = new Date().toISOString().slice(0, 7);
	const isCurrentMonth = selectedMonth === currentMonth;

	return (
		<div className='flex flex-col min-h-screen bg-background'>
			<DashboardHeader
				title='My Attendance'
				description='Track your attendance history and statistics'
			/>

			<div className='flex-1 space-y-6 p-4 md:p-6 pb-20 md:pb-6'>
				{/* Month Navigation */}
				<Card className='border-none shadow-sm'>
					<CardContent className='p-6'>
						<div className='flex items-center justify-between gap-4'>
							<Button
								variant='outline'
								size='icon'
								onClick={goToPreviousMonth}
								className='h-9 w-9 shrink-0'>
								<ChevronLeft className='h-4 w-4' />
							</Button>
							<div className='flex items-center gap-3 flex-1 justify-center'>
								<Calendar className='h-5 w-5 text-muted-foreground' />
								<h2 className='text-xl font-semibold tracking-tight'>
									{monthDisplay}
								</h2>
							</div>
							<Button
								variant='outline'
								size='icon'
								onClick={goToNextMonth}
								disabled={isCurrentMonth}
								className='h-9 w-9 shrink-0'>
								<ChevronRight className='h-4 w-4' />
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Stats Cards */}
				<div className='grid gap-4 grid-cols-2 md:grid-cols-5'>
					<Card className='border-none shadow-sm hover:shadow-md transition-shadow'>
						<CardContent className='p-5'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
										Present
									</p>
									<div className='h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center'>
										<Clock className='h-4 w-4 text-success' />
									</div>
								</div>
								<p className='text-3xl font-bold text-success'>
									{stats.present}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className='border-none shadow-sm hover:shadow-md transition-shadow'>
						<CardContent className='p-5'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
										Late
									</p>
									<div className='h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center'>
										<Clock className='h-4 w-4 text-warning' />
									</div>
								</div>
								<p className='text-3xl font-bold text-warning'>
									{stats.late}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className='border-none shadow-sm hover:shadow-md transition-shadow'>
						<CardContent className='p-5'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
										Absent
									</p>
									<div className='h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center'>
										<Clock className='h-4 w-4 text-destructive' />
									</div>
								</div>
								<p className='text-3xl font-bold text-destructive'>
									{stats.absent}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className='border-none shadow-sm hover:shadow-md transition-shadow'>
						<CardContent className='p-5'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
										Week Off
									</p>
									<div className='h-8 w-8 rounded-lg bg-muted flex items-center justify-center'>
										<Calendar className='h-4 w-4 text-muted-foreground' />
									</div>
								</div>
								<p className='text-3xl font-bold'>
									{stats.weekOff}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className='border-none shadow-sm hover:shadow-md transition-shadow'>
						<CardContent className='p-5'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
										On Leave
									</p>
									<div className='h-8 w-8 rounded-lg bg-muted flex items-center justify-center'>
										<Calendar className='h-4 w-4 text-muted-foreground' />
									</div>
								</div>
								<p className='text-3xl font-bold'>
									{stats.leave}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Attendance History Table */}
				<Card className='border-none shadow-sm'>
					<CardHeader className='pb-4'>
						<CardTitle className='text-lg font-semibold'>
							Attendance Records
						</CardTitle>
						<p className='text-sm text-muted-foreground'>
							Detailed view of all attendance entries for the selected month
						</p>
					</CardHeader>
					<CardContent className='px-0 pb-0'>
						{isLoading ? (
							<div className='py-16 text-center'>
								<div className='inline-flex items-center gap-2 text-muted-foreground'>
									<div className='h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent' />
									<span>Loading attendance data...</span>
								</div>
							</div>
						) : days.length === 0 ? (
							<div className='py-16 text-center text-muted-foreground'>
								<Calendar className='h-12 w-12 mx-auto mb-3 opacity-50' />
								<p>No attendance records for this month</p>
							</div>
						) : (
							<div className='overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow className='hover:bg-transparent border-t'>
											<TableHead className='font-semibold'>Date</TableHead>
											<TableHead className='font-semibold'>Status</TableHead>
											<TableHead className='font-semibold'>Clock In</TableHead>
											<TableHead className='font-semibold'>Clock Out</TableHead>
											<TableHead className='font-semibold'>Hours</TableHead>
											<TableHead className='font-semibold'>Notes</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{days.map((row) => (
											<TableRow
												key={row.date}
												className='hover:bg-muted/50 transition-colors'>
												<TableCell className='font-medium'>
													<div className='flex flex-col'>
														<span className='text-sm'>
															{new Date(
																row.date + "T12:00:00"
															).toLocaleDateString(
																"en-US",
																{
																	weekday: "short",
																	month: "short",
																	day: "numeric",
																}
															)}
														</span>
														<span className='text-xs text-muted-foreground'>
															{new Date(
																row.date + "T12:00:00"
															).getFullYear()}
														</span>
													</div>
												</TableCell>
												<TableCell>
													{getStatusBadge(row.status)}
												</TableCell>
												<TableCell className='text-muted-foreground tabular-nums text-sm'>
													{row.record
														? formatTime(
															row.record
																.clock_in
														)
														: "–"}
												</TableCell>
												<TableCell className='text-muted-foreground tabular-nums text-sm'>
													{row.record
														? formatTime(
															row.record
																.clock_out
														)
														: "–"}
												</TableCell>
												<TableCell className='tabular-nums font-medium text-sm'>
													{row.record?.total_hours
														? `${row.record.total_hours}h`
														: "–"}
												</TableCell>
												<TableCell className='max-w-[200px] text-sm text-muted-foreground'>
													<div className='truncate'>
														{row.record?.notes || "–"}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
