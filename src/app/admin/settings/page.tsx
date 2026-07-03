"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Loader2, Settings as SettingsIcon, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import type { Settings, LeaveType } from "@/lib/types";

export default function SettingsPage() {
	const [settings, setSettings] = useState<Settings | null>(null);
	const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [form, setForm] = useState({
		max_clocking_time: "",
		max_late_days: "",
		auto_clock_out_time: "",
		late_policy_leave_type_id: "",
		late_policy_deduction_per_day: "",
		company_name: "",
		company_logo_url: "",
		company_address: ["", "", ""],
		company_anniversary: "",
	});

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		const supabase = createClient();
		const { data: settingsData } = await supabase
			.from("settings")
			.select("*")
			.limit(1)
			.single();
		const { data: typesData } = await supabase
			.from("leave_types")
			.select("*")
			.eq("is_active", true);

		setLeaveTypes((typesData as LeaveType[]) || []);
		if (settingsData) {
			const s = settingsData as Settings;
			setSettings(s);
			const addr = Array.isArray(s.company_address) ? s.company_address : ["", "", ""];
			const anniversaryItem = addr.find((item) => item.startsWith("ANNIVERSARY:"));
			const anniversaryDate = anniversaryItem ? anniversaryItem.replace("ANNIVERSARY:", "") : "";
			const plainAddress = addr.filter((item) => !item.startsWith("ANNIVERSARY:"));
			while (plainAddress.length < 3) {
				plainAddress.push("");
			}
			setForm({
				max_clocking_time: s.max_clocking_time,
				max_late_days: s.max_late_days.toString(),
				auto_clock_out_time: s.auto_clock_out_time,
				late_policy_leave_type_id: s.late_policy_leave_type_id ?? "",
				late_policy_deduction_per_day:
					s.late_policy_deduction_per_day.toString(),
				company_name: s.company_name,
				company_logo_url: s.company_logo_url,
				company_address: plainAddress,
				company_anniversary: anniversaryDate,
			});
		}
		setLoading(false);
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const supabase = createClient();
			const finalAddress = form.company_address
				.map((s) => s.trim())
				.filter(Boolean);
			if (form.company_anniversary) {
				finalAddress.push(`ANNIVERSARY:${form.company_anniversary}`);
			}
			const payload = {
				max_clocking_time: form.max_clocking_time.trim(),
				max_late_days: form.max_late_days,
				auto_clock_out_time: form.auto_clock_out_time.trim(),
				late_policy_leave_type_id:
					form.late_policy_leave_type_id || null,
				late_policy_deduction_per_day:
					form.late_policy_deduction_per_day,
				company_name: form.company_name.trim(),
				company_logo_url: form.company_logo_url.trim(),
				company_address: finalAddress,
				updated_at: new Date().toISOString(),
			};
			if (settings?.id) {
				await supabase
					.from("settings")
					.update(payload)
					.eq("id", settings.id);
			} else {
				await supabase.from("settings").insert(payload);
			}
			toast.success("Settings saved successfully");
			await fetchData();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to save settings"
			);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className='flex min-h-screen items-center justify-center bg-[#f8fafc]'>
				<Loader2 className='h-6 w-6 animate-spin text-slate-400' />
			</div>
		);
	}

	return (
		<div className='flex flex-col min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased'>
			<DashboardHeader
				title='Settings'
				description='Manage attendance, leave policy, and company information'
			/>

			<div className='flex-1 space-y-6 p-4 md:p-6 pb-20 md:pb-6'>
				<div className='grid gap-6 lg:grid-cols-2'>
					{/* Attendance Settings */}
					<Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden">
						<CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-5">
							<CardTitle className='flex items-center gap-2.5'>
								<div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
									<SettingsIcon className='h-4 w-4' />
								</div>
								<span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Attendance Settings</span>
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4 p-6'>
							<div className='grid gap-2'>
								<Label htmlFor='max_clocking_time' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
									Max Clock-In Time
								</Label>
								<Input
									id='max_clocking_time'
									value={form.max_clocking_time}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											max_clocking_time: e.target.value,
										}))
									}
									placeholder='11:00 AM'
									className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
								/>
								<p className='text-[10px] font-bold text-slate-400 dark:text-slate-500'>
									Clock-ins after this time are marked as late
								</p>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='auto_clock_out_time' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
									Auto Clock-Out Time
								</Label>
								<Input
									id='auto_clock_out_time'
									value={form.auto_clock_out_time}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											auto_clock_out_time: e.target.value,
										}))
									}
									placeholder='7:30 PM'
									className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
								/>
								<p className='text-[10px] font-bold text-slate-400 dark:text-slate-500'>
									Automatically clock out after this time
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Late Policy */}
					<Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden">
						<CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-5">
							<CardTitle className='flex items-center gap-2.5'>
								<div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
									<SettingsIcon className='h-4 w-4' />
								</div>
								<span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Late Policy</span>
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4 p-6'>
							<div className='grid gap-2'>
								<Label htmlFor='max_late_days' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
									Max Late Days (per month)
								</Label>
								<Input
									id='max_late_days'
									type='number'
									min='0'
									value={form.max_late_days}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											max_late_days: e.target.value,
										}))
									}
									className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
								/>
								<p className='text-[10px] font-bold text-slate-400 dark:text-slate-500'>
									After this many late days, deductions apply
								</p>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='late_policy_leave_type_id' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
									Leave Type to Deduct
								</Label>
								<Select
									value={
										form.late_policy_leave_type_id || "none"
									}
									onValueChange={(v) =>
										setForm((f) => ({
											...f,
											late_policy_leave_type_id:
												v === "none" ? "" : v,
										}))
									}>
									<SelectTrigger id='late_policy_leave_type_id' className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:ring-0 transition-all h-10 px-3.5'>
										<SelectValue placeholder='Select leave type' />
									</SelectTrigger>
									<SelectContent className='rounded-xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-950'>
										<SelectItem value='none'>
											None (no deduction)
										</SelectItem>
										{leaveTypes.map((lt) => (
											<SelectItem
												key={lt.id}
												value={lt.id}>
												{lt.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className='text-[10px] font-bold text-slate-400 dark:text-slate-500'>
									Which leave balance to deduct from
								</p>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='late_policy_deduction_per_day' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
									Deduction per Late Day
								</Label>
								<Input
									id='late_policy_deduction_per_day'
									type='number'
									step='0.5'
									min='0'
									value={form.late_policy_deduction_per_day}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											late_policy_deduction_per_day:
												e.target.value,
										}))
									}
									className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
								/>
								<p className='text-[10px] font-bold text-slate-400 dark:text-slate-500'>
									Days to deduct per late day after max
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Company Information */}
					<Card className='lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden'>
						<CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-5">
							<CardTitle className='flex items-center gap-2.5'>
								<div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
									<SettingsIcon className='h-4 w-4' />
								</div>
								<span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Company Information</span>
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4 p-6'>
							<div className='grid gap-4 md:grid-cols-3'>
								<div className='grid gap-2'>
									<Label htmlFor='company_name' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
										Company Name
									</Label>
									<Input
										id='company_name'
										value={form.company_name}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												company_name: e.target.value,
											}))
										}
										placeholder='Company Name'
										className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
									/>
								</div>
								<div className='grid gap-2'>
									<Label htmlFor='company_logo_url' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
										Logo URL
									</Label>
									<Input
										id='company_logo_url'
										value={form.company_logo_url}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												company_logo_url:
													e.target.value,
											}))
										}
										placeholder='/logo.png'
										className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
									/>
								</div>
								<div className='grid gap-2'>
									<Label htmlFor='company_anniversary' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
										Company Anniversary Date
									</Label>
									<Input
										id='company_anniversary'
										type='date'
										value={form.company_anniversary}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												company_anniversary: e.target.value,
											}))
										}
										className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
									/>
								</div>
							</div>
							<div className='grid gap-2'>
								<Label className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>Company Address</Label>
								{[0, 1, 2].map((i) => (
									<Input
										key={i}
										value={form.company_address[i] || ""}
										onChange={(e) => {
											const addr = [
												...form.company_address,
											];
											addr[i] = e.target.value;
											setForm((f) => ({
												...f,
												company_address: addr,
											}));
										}}
										placeholder={`Address line ${i + 1}`}
										className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5 mb-1'
									/>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				<div className='flex justify-end'>
					<Button
						onClick={handleSave}
						disabled={saving}
						className="rounded-xl h-10 px-4 text-xs font-black uppercase tracking-wider bg-slate-800 text-white hover:bg-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-50 transition-all active:scale-[0.98]">
						{saving ? (
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Saving...
							</>
						) : (
							<>
								<Save className='mr-2 h-4 w-4' />
								Save Settings
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
