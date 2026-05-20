"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/app/employee/profile/actions";
import { DashboardHeader } from "@/components/dashboard/header";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/contexts/user-context";
import {
	User,
	Mail,
	Phone,
	Briefcase,
	Building2,
	Calendar,
	Save,
	Loader2,
	Camera,
	Trash2,
	Lock,
	IdCard,
	MapPin,
} from "lucide-react";

const AVATAR_BUCKET = "employee-documents";

export function ProfilePage() {
	const { employee, refreshUser } = useUser();
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [avatarUploading, setAvatarUploading] = useState(false);
	const [avatarError, setAvatarError] = useState<string | null>(null);
	const avatarInputRef = useRef<HTMLInputElement>(null);
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [passwordSuccess, setPasswordSuccess] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [formData, setFormData] = useState({
		first_name: "",
		last_name: "",
		phone: "",
		address: "",
		date_of_birth: "",
		joining_date: "",
	});
	const [profileError, setProfileError] = useState<string | null>(null);

	useEffect(() => {
		if (employee) {
			setFormData({
				first_name: employee.first_name || "",
				last_name: employee.last_name || "",
				phone: employee.phone || "",
				address: employee.address || "",
				date_of_birth: employee.date_of_birth || "",
				joining_date: employee.joining_date
					? String(employee.joining_date).slice(0, 10)
					: "",
			});
		}
	}, [employee]);

	const handleAvatarUpload = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file || !employee?.id) return;
		const validTypes = [
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/gif",
		];
		if (!validTypes.includes(file.type)) {
			setAvatarError("Please choose a JPG, PNG, WebP or GIF image.");
			return;
		}
		setAvatarError(null);
		setAvatarUploading(true);
		const supabase = createClient();
		const ext = file.name.split(".").pop() || "jpg";
		const path = `${employee.id}/avatar.${ext}`;
		const { error: uploadErr } = await supabase.storage
			.from(AVATAR_BUCKET)
			.upload(path, file, { upsert: true });
		if (uploadErr) {
			setAvatarError(uploadErr.message);
			setAvatarUploading(false);
			return;
		}
		const { data: urlData } = supabase.storage
			.from(AVATAR_BUCKET)
			.getPublicUrl(path);
		const url = urlData?.publicUrl;
		if (!url) {
			setAvatarError("Could not get image URL");
			setAvatarUploading(false);
			return;
		}
		const { error: updateErr } = await supabase
			.from("employees")
			.update({ avatar_url: url })
			.eq("id", employee.id);
		if (updateErr) {
			setAvatarError(updateErr.message);
			setAvatarUploading(false);
			return;
		}
		await refreshUser();
		setAvatarUploading(false);
		e.target.value = "";
	};

	const handleRemoveAvatar = async () => {
		if (!employee?.id) return;
		setAvatarError(null);
		setAvatarUploading(true);
		const supabase = createClient();
		const { error } = await supabase
			.from("employees")
			.update({ avatar_url: null })
			.eq("id", employee.id);
		if (!error) await refreshUser();
		setAvatarUploading(false);
	};

	const handleSave = async () => {
		if (!employee) return;
		setIsSaving(true);
		setProfileError(null);

		const result = await updateProfile(employee.id, {
			first_name: formData.first_name,
			last_name: formData.last_name,
			phone: formData.phone || null,
			address: formData.address || null,
			date_of_birth: formData.date_of_birth || null,
			joining_date: formData.joining_date || null,
		});

		if (result.ok) {
			await refreshUser();
			setIsEditing(false);
		} else {
			setProfileError(result.error);
		}
		setIsSaving(false);
	};

	const handleChangePassword = async () => {
		const { currentPassword, newPassword, confirmPassword } = passwordForm;
		setPasswordError(null);
		setPasswordSuccess(false);
		if (!newPassword || newPassword.length < 6) {
			setPasswordError("New password must be at least 6 characters");
			return;
		}
		if (newPassword !== confirmPassword) {
			setPasswordError("New passwords do not match");
			return;
		}
		setPasswordLoading(true);
		const supabase = createClient();
		try {
			// Re-authenticate with current password (optional but more secure)
			if (currentPassword) {
				const { error: signInError } =
					await supabase.auth.signInWithPassword({
						email: employee?.email ?? "",
						password: currentPassword,
					});
				if (signInError) {
					setPasswordError("Current password is incorrect");
					setPasswordLoading(false);
					return;
				}
			}
			const { error: updateError } = await supabase.auth.updateUser({
				password: newPassword,
			});
			if (updateError) throw updateError;
			setPasswordSuccess(true);
			setPasswordForm({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
		} catch (err: unknown) {
			setPasswordError(
				err instanceof Error ? err.message : "Failed to update password"
			);
		} finally {
			setPasswordLoading(false);
		}
	};

	const initials = employee
		? `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""
			}`.toUpperCase()
		: "U";

	if (!employee) {
		return (
			<div className='flex items-center justify-center h-96'>
				<p className='text-muted-foreground'>Loading profile...</p>
			</div>
		);
	}

	return (
		<div className='flex flex-col min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased'>
			<DashboardHeader
				title='My Profile'
				description='View and edit your profile'
			/>

			<div className='flex-1 space-y-6 p-4 md:p-6 pb-20 md:pb-6'>
				<div className='grid gap-6 lg:grid-cols-3'>
					{/* Profile Card */}
					<Card className='lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden h-fit'>
						<CardContent className='p-6'>
							<div className='flex flex-col items-center text-center w-full'>
								<input
									ref={avatarInputRef}
									type='file'
									accept='image/jpeg,image/png,image/webp,image/gif'
									className='hidden'
									onChange={handleAvatarUpload}
								/>
								<div className='relative flex flex-col items-center'>
									<Avatar className='h-24 w-24 border border-slate-100 dark:border-slate-800/80 shadow-sm'>
										{employee.avatar_url ? (
											<AvatarImage
												className='object-cover'
												src={employee.avatar_url}
												alt={`${employee.first_name} ${employee.last_name}`}
											/>
										) : null}
										<AvatarFallback className='bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-150/40 dark:border-slate-850 text-2xl font-black'>
											{initials}
										</AvatarFallback>
									</Avatar>
									<div className='mt-3 flex justify-center gap-2'>
										<Button
											variant='outline'
											size='sm'
											disabled={avatarUploading}
											onClick={() =>
												avatarInputRef.current?.click()
											}
											className='rounded-xl h-8 px-3 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 transition-all active:scale-[0.98]'>
											{avatarUploading ? (
												<Loader2 className='h-3.5 w-3.5 animate-spin' />
											) : (
												<>
													<Camera className='mr-1.5 h-3.5 w-3.5' />
													{employee.avatar_url
														? "Change"
														: "Upload"}
												</>
											)}
										</Button>
										{employee.avatar_url && (
											<Button
												variant='outline'
												size='sm'
												disabled={avatarUploading}
												onClick={handleRemoveAvatar}
												className='rounded-xl h-8 px-3 text-[10px] font-black uppercase tracking-wider border border-slate-200/60 dark:border-slate-800/60 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100/50 text-rose-500 active:scale-[0.98] transition-all'>
												<Trash2 className='h-3.5 w-3.5' />
											</Button>
										)}
									</div>
								</div>
								{avatarError && (
									<p className='mt-2 text-[10px] font-bold text-rose-550'>
										{avatarError}
									</p>
								)}
								<h3 className='mt-4 text-base font-black text-slate-850 dark:text-white'>
									{employee.first_name} {employee.last_name}
								</h3>

								<span className='mt-2 inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/50 shadow-[0_2px_8px_rgba(0,0,0,0.01)]'>
									{employee.role === "employee"
										? employee.designation || "—"
										: employee.role}
								</span>
								{employee.employee_id && (
									<div className='mt-3 flex items-center justify-center gap-2 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 px-3 py-1.5 border border-slate-100 dark:border-slate-800/40'>
										<IdCard className='h-3.5 w-3.5 text-slate-400' />
										<span className='text-xs font-bold text-slate-600 dark:text-slate-400 tabular-nums'>
											{employee.employee_id}
										</span>
									</div>
								)}

								<Separator className='my-5 bg-slate-100/60 dark:bg-slate-800/40' />

								<div className='w-full space-y-3.5 text-left'>
									<div className='flex items-center gap-3'>
										<div className='h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-950/30 flex items-center justify-center border border-slate-100 dark:border-slate-800/40 text-slate-400'>
											<Mail className='h-3.5 w-3.5' />
										</div>
										<span className='text-xs font-semibold text-slate-650 dark:text-slate-350 truncate'>
											{employee.email}
										</span>
									</div>
									{employee.phone && (
										<div className='flex items-center gap-3'>
											<div className='h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-950/30 flex items-center justify-center border border-slate-100 dark:border-slate-800/40 text-slate-400'>
												<Phone className='h-3.5 w-3.5' />
											</div>
											<span className='text-xs font-semibold text-slate-650 dark:text-slate-350'>
												{employee.phone}
											</span>
										</div>
									)}
									{employee.department && (
										<div className='flex items-center gap-3'>
											<div className='h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-950/30 flex items-center justify-center border border-slate-100 dark:border-slate-800/40 text-slate-400'>
												<Building2 className='h-3.5 w-3.5' />
											</div>
											<span className='text-xs font-semibold text-slate-650 dark:text-slate-350'>
												{employee.department}
											</span>
										</div>
									)}
									{employee.address && (
										<div className='flex items-center gap-3'>
											<div className='h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-950/30 flex items-center justify-center border border-slate-100 dark:border-slate-800/40 text-slate-400 shrink-0'>
												<MapPin className='h-3.5 w-3.5' />
											</div>
											<span className='text-xs font-semibold text-slate-650 dark:text-slate-350 truncate'>
												{employee.address}
											</span>
										</div>
									)}
									{employee.joining_date && (
										<div className='flex items-center gap-3'>
											<div className='h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-950/30 flex items-center justify-center border border-slate-100 dark:border-slate-800/40 text-slate-400'>
												<Calendar className='h-3.5 w-3.5' />
											</div>
											<span className='text-xs font-semibold text-slate-650 dark:text-slate-350'>
												Joined{" "}
												{new Date(
													employee.joining_date
												).toLocaleDateString("en-IN", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})}
											</span>
										</div>
									)}
								</div>

								<div className='w-full mt-5 pt-4 border-t border-slate-100/60 dark:border-slate-800/40 flex justify-center'>
									<span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
										employee.is_active
											? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100/50 dark:border-emerald-900/30"
											: "bg-slate-100/80 dark:bg-slate-800/60 text-slate-550 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50"
									}`}>
										{employee.is_active ? "Active" : "Inactive"}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className='lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden'>
						<CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-5">
							<div className='flex items-center justify-between'>
								<div>
									<CardTitle className='flex items-center gap-2.5'>
										<div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
											<User className='h-4.5 w-4.5' />
										</div>
										<span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Profile Information</span>
									</CardTitle>
									<p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5 leading-normal">
										Update your personal information
									</p>
								</div>
								{!isEditing ? (
									<Button
										variant='outline'
										onClick={() => setIsEditing(true)}
										className='rounded-xl h-10 px-4 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 transition-all active:scale-[0.98]'>
										Edit Profile
									</Button>
								) : (
									<div className='flex gap-2'>
										<Button
											variant='outline'
											onClick={() => {
												setIsEditing(false);
												setFormData({
													first_name:
														employee.first_name,
													last_name:
														employee.last_name,
													phone: employee.phone || "",
													address:
														employee.address || "",
													date_of_birth:
														employee.date_of_birth ||
														"",
													joining_date:
														employee.joining_date
															? String(
																employee.joining_date
															).slice(0, 10)
															: "",
												});
											}}
											className='rounded-xl h-10 px-4 text-xs font-bold bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 transition-all active:scale-[0.98]'>
											Cancel
										</Button>
										<Button
											onClick={handleSave}
											disabled={isSaving}
											className='gap-2 rounded-xl h-10 px-4 text-xs font-black uppercase tracking-wider bg-slate-850 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-50 transition-all active:scale-[0.98]'>
											{isSaving ? (
												<Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
											) : (
												<Save className='mr-1.5 h-4 w-4' />
											)}
											Save
										</Button>
									</div>
								)}
							</div>
						</CardHeader>
						<CardContent className='space-y-6 p-6'>
							<div className='grid gap-6 md:grid-cols-2'>
								<div className='space-y-2'>
									<Label htmlFor='first_name' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
										First Name
									</Label>
									{isEditing ? (
										<Input
											id='first_name'
											value={formData.first_name}
											onChange={(e) =>
												setFormData({
													...formData,
													first_name: e.target.value,
												})
											}
											className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
										/>
									) : (
										<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
											{employee.first_name}
										</p>
									)}
								</div>
								<div className='space-y-2'>
									<Label htmlFor='last_name' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>Last Name</Label>
									{isEditing ? (
										<Input
											id='last_name'
											value={formData.last_name}
											onChange={(e) =>
												setFormData({
													...formData,
													last_name: e.target.value,
												})
											}
											className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
										/>
									) : (
										<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
											{employee.last_name}
										</p>
									)}
								</div>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='email' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>Email</Label>
								<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
									{employee.email}
								</p>
								<p className='text-[10px] font-bold text-slate-400 dark:text-slate-500'>
									Email cannot be changed
								</p>
							</div>

							<div className='grid gap-6 md:grid-cols-2'>
								<div className='space-y-2'>
									<Label htmlFor='phone' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>Phone Number</Label>
									{isEditing ? (
										<Input
											id='phone'
											value={formData.phone}
											onChange={(e) =>
												setFormData({
													...formData,
													phone: e.target.value,
												})
											}
											placeholder='Enter phone number'
											className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
										/>
									) : (
										<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
											{employee.phone || "Not set"}
										</p>
									)}
								</div>
								<div className='space-y-2'>
									<Label htmlFor='date_of_birth' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
										Date of Birth
									</Label>
									{isEditing ? (
										<Input
											id='date_of_birth'
											type='date'
											value={formData.date_of_birth}
											onChange={(e) =>
												setFormData({
													...formData,
													date_of_birth:
														e.target.value,
												})
											}
											className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
										/>
									) : (
										<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
											{employee.date_of_birth
												? new Date(
													employee.date_of_birth
												).toLocaleDateString("en-IN", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})
												: "Not set"}
										</p>
									)}
								</div>
								<div className='space-y-2'>
									<Label htmlFor='joining_date' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
										Joining Date
									</Label>
									{isEditing ? (
										<Input
											id='joining_date'
											type='date'
											value={formData.joining_date}
											onChange={(e) =>
												setFormData({
													...formData,
													joining_date:
														e.target.value,
												})
											}
											className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
										/>
									) : (
										<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
											{employee.joining_date
												? new Date(
													employee.joining_date
												).toLocaleDateString("en-IN", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})
												: "Not set"}
										</p>
									)}
									{employee.employee_id && (
										<p className='text-[10px] font-bold text-slate-400 dark:text-slate-500'>
											Employee ID: {employee.employee_id}{" "}
											(updated when joining date changes)
										</p>
									)}
								</div>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='address' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>Address</Label>
								{isEditing ? (
									<Input
										id='address'
										value={formData.address}
										onChange={(e) =>
											setFormData({
												...formData,
												address: e.target.value,
											})
										}
										placeholder='Enter your address (used on salary slip)'
										className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
									/>
								) : (
									<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
										{employee.address || "Not set"}
									</p>
								)}
							</div>

							{profileError && (
								<p className='text-xs font-bold text-rose-500'>
									{profileError}
								</p>
							)}

							<Separator className="bg-slate-100/60 dark:bg-slate-800/40" />

							<div className='grid gap-6 md:grid-cols-2'>
								<div className='space-y-2'>
									<Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
										<Briefcase className='h-4 w-4 text-slate-400' />
										Designation
									</Label>
									<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
										{employee.designation || "Not assigned"}
									</p>
								</div>
								<div className='space-y-2'>
									<Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
										<Building2 className='h-4 w-4 text-slate-400' />
										Department
									</Label>
									<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
										{employee.department || "Not assigned"}
									</p>
								</div>
							</div>

							<p className='text-[10px] font-bold text-slate-400 dark:text-slate-500'>
								Contact HR to update your designation or department
							</p>

							<Separator className="bg-slate-100/60 dark:bg-slate-800/40" />

							<div className='space-y-4'>
								<Label className='flex items-center gap-2 text-xs font-bold text-slate-850 dark:text-white'>
									<Lock className='h-4 w-4 text-slate-400' />
									Change Password
								</Label>
								<div className='grid gap-4 md:grid-cols-1'>
									<div className='space-y-2'>
										<Label htmlFor='current_password' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
											Current Password (optional)
										</Label>
										<Input
											id='current_password'
											type='password'
											placeholder='••••••••'
											value={passwordForm.currentPassword}
											onChange={(e) =>
												setPasswordForm({
													...passwordForm,
													currentPassword:
														e.target.value,
												})
											}
											className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
										/>
									</div>
									<div className='space-y-2'>
										<Label htmlFor='new_password' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
											New Password
										</Label>
										<Input
											id='new_password'
											type='password'
											placeholder='••••••••'
											minLength={6}
											value={passwordForm.newPassword}
											onChange={(e) =>
												setPasswordForm({
													...passwordForm,
													newPassword: e.target.value,
												})
											}
											className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
										/>
									</div>
									<div className='space-y-2'>
										<Label htmlFor='confirm_new' className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
											Confirm New Password
										</Label>
										<Input
											id='confirm_new'
											type='password'
											placeholder='••••••••'
											minLength={6}
											value={passwordForm.confirmPassword}
											onChange={(e) =>
												setPasswordForm({
													...passwordForm,
													confirmPassword:
														e.target.value,
												})
											}
											className='bg-slate-50/20 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 rounded-xl focus:border-slate-200 focus:ring-0 transition-all h-10 px-3.5'
										/>
									</div>
								</div>
								{passwordError && (
									<p className='text-xs font-bold text-rose-500'>
										{passwordError}
									</p>
								)}
								{passwordSuccess && (
									<p className='text-xs font-bold text-emerald-600 dark:text-emerald-450'>
										Password updated successfully.
									</p>
								)}
								<Button
									type='button'
									variant='outline'
									onClick={handleChangePassword}
									disabled={passwordLoading}
									className='rounded-xl h-10 px-4 text-xs font-black uppercase tracking-wider bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 transition-all active:scale-[0.98]'>
									{passwordLoading ? (
										<Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
									) : (
										<Lock className='mr-1.5 h-4 w-4' />
									)}
									Update Password
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
