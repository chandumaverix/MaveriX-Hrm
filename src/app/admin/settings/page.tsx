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
			setForm({
				max_clocking_time: s.max_clocking_time,
				max_late_days: s.max_late_days.toString(),
				auto_clock_out_time: s.auto_clock_out_time,
				late_policy_leave_type_id: s.late_policy_leave_type_id ?? "",
				late_policy_deduction_per_day:
					s.late_policy_deduction_per_day.toString(),
				company_name: s.company_name,
				company_logo_url: s.company_logo_url,
				company_address: Array.isArray(s.company_address)
					? s.company_address
					: ["", "", ""],
			});
		}
		setLoading(false);
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const supabase = createClient();
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
				company_address: form.company_address
					.map((s) => s.trim())
					.filter(Boolean),
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
			<div className='flex min-h-screen items-center justify-center'>
				<Loader2 className='h-8 w-8 animate-spin text-primary' />
			</div>
		);
	}

	return (
		<div className='flex flex-col'>
			<DashboardHeader
				title='Settings'
				description='Manage attendance, leave policy, and company information'
			/>

			<div className='flex-1 space-y-6 p-6'>
				<div className='grid gap-6 lg:grid-cols-2'>
					{/* Attendance Settings */}
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<SettingsIcon className='h-5 w-5' />
								Attendance Settings
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='grid gap-2'>
								<Label htmlFor='max_clocking_time'>
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
								/>
								<p className='text-xs text-muted-foreground'>
									Clock-ins after this time are marked as late
								</p>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='auto_clock_out_time'>
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
								/>
								<p className='text-xs text-muted-foreground'>
									Automatically clock out after this time
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Late Policy */}
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<SettingsIcon className='h-5 w-5' />
								Late Policy
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='grid gap-2'>
								<Label htmlFor='max_late_days'>
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
								/>
								<p className='text-xs text-muted-foreground'>
									After this many late days, deductions apply
								</p>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='late_policy_leave_type_id'>
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
									<SelectTrigger id='late_policy_leave_type_id'>
										<SelectValue placeholder='Select leave type' />
									</SelectTrigger>
									<SelectContent>
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
								<p className='text-xs text-muted-foreground'>
									Which leave balance to deduct from
								</p>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='late_policy_deduction_per_day'>
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
								/>
								<p className='text-xs text-muted-foreground'>
									Days to deduct per late day after max
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Company Information */}
					<Card className='lg:col-span-2'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<SettingsIcon className='h-5 w-5' />
								Company Information
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='grid gap-4 md:grid-cols-2'>
								<div className='grid gap-2'>
									<Label htmlFor='company_name'>
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
									/>
								</div>
								<div className='grid gap-2'>
									<Label htmlFor='company_logo_url'>
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
									/>
								</div>
							</div>
							<div className='grid gap-2'>
								<Label>Company Address</Label>
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
						size='lg'
						className='gap-2'>
						{saving ? (
							<>
								<Loader2 className='h-4 w-4 animate-spin' />
								Saving...
							</>
						) : (
							<>
								<Save className='h-4 w-4' />
								Save Settings
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
