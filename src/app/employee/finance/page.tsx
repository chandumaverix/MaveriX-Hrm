"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/user-context";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	DollarSign,
	FileText,
	Upload,
	ExternalLink,
	CreditCard,
	Loader2,
	Trash2,
	Eye,
	EyeOff,
	Download,
} from "lucide-react";
import type { FinanceRecord } from "@/lib/types";
import { SalarySlipDownload } from "@/components/salary-slip/salary-slip-download";
import { companyConfig } from "@/lib/constant";
import { getSalarySlipData } from "@/lib/salary-slip-helper";

const BUCKET = "employee-documents";

export default function EmployeeFinancePage() {
	const { employee } = useUser();
	const [records, setRecords] = useState<FinanceRecord[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [uploading, setUploading] = useState<"aadhar" | "pan" | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [profile, setProfile] = useState<{
		adhar_url?: string | null;
		pan_url?: string | null;
	} | null>(null);
	const [employeeAddress, setEmployeeAddress] = useState<string>("");
	const [bankForm, setBankForm] = useState({
		bank_name: "",
		bank_account_number: "",
		bank_ifsc: "",
		bank_location: "",
		pan_number: "",
		aadhar_number: "",
	});
	const [isEditingBank, setIsEditingBank] = useState(false);
	const [isSavingBank, setIsSavingBank] = useState(false);
	const [bankMessage, setBankMessage] = useState<string | null>(null);
	const [salaryVisible, setSalaryVisible] = useState(false);
	const aadharInputRef = useRef<HTMLInputElement>(null);
	const panInputRef = useRef<HTMLInputElement>(null);

	const formatOrMask = (amount: number | null): string =>
		salaryVisible && amount != null
			? `₹${amount.toLocaleString("en-IN")}`
			: "••••••";

	useEffect(() => {
		if (employee?.id) {
			fetchFinanceRecords();
			fetchProfile();
		} else {
			setIsLoading(false);
		}
	}, [employee?.id]);

	const fetchFinanceRecords = async () => {
		if (!employee?.id) return;
		const supabase = createClient();
		const { data } = await supabase
			.from("finance_records")
			.select("*")
			.eq("employee_id", employee.id)
			.order("year", { ascending: false })
			.order("month", { ascending: false });
		setRecords((data as FinanceRecord[]) || []);
		setIsLoading(false);
	};

	// Check if salary slip is allocated for a given month/year
	const isSalarySlipAllocated = (month: number, year: number) => {
		const salaryRecord = records.find(
			(r) =>
				r.type === "salary" &&
				r.month === month &&
				r.year === year &&
				r.employee_id === employee?.id
		);
		return salaryRecord?.salary_slip_allocated === true;
	};

	const fetchProfile = async () => {
		if (!employee?.id) return;
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select("*")
			.eq("id", employee.id)
			.single();
		if (data) {
			const row = data as Record<string, unknown>;
			setProfile({
				adhar_url: (row.adhar_url as string | null) ?? null,
				pan_url: (row.pan_url as string | null) ?? null,
			});
			setEmployeeAddress((row.address as string) || "");
			setBankForm({
				bank_name: (row.bank_name as string) || "",
				bank_account_number: (row.bank_account_number as string) || "",
				bank_ifsc: (row.bank_ifsc as string) || "",
				bank_location: (row.bank_location as string) || "",
				pan_number: (row.pan_number as string) || "",
				aadhar_number: (row.aadhar_number as string) || "",
			});
		}
	};

	const handleFileUpload = async (
		type: "aadhar" | "pan",
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file || !employee?.id) return;
		setUploadError(null);
		setUploading(type);
		const supabase = createClient();
		const ext = file.name.split(".").pop() || "pdf";
		const path = `${employee.id}/${type}.${ext}`;
		const { error: uploadError } = await supabase.storage
			.from(BUCKET)
			.upload(path, file, { upsert: true });
		if (uploadError) {
			setUploadError(uploadError.message);
			setUploading(null);
			return;
		}
		const { data: urlData } = supabase.storage
			.from(BUCKET)
			.getPublicUrl(path);
		const url = urlData?.publicUrl;
		if (!url) {
			setUploadError("Could not get file URL");
			setUploading(null);
			return;
		}
		const col = type === "aadhar" ? "adhar_url" : "pan_url";
		const { error: updateError } = await supabase
			.from("employees")
			.update({ [col]: url })
			.eq("id", employee.id);
		if (updateError) {
			setUploadError(
				updateError.message +
					" (Ensure employees table has adhar_url and pan_url columns.)"
			);
			setUploading(null);
			return;
		}
		setProfile((p) => ({ ...p, [col]: url }));
		setUploading(null);
		e.target.value = "";
	};

	const handleDeleteDocument = async (type: "aadhar" | "pan") => {
		if (!employee?.id) return;
		setUploadError(null);
		setUploading(type);
		const supabase = createClient();
		const col = type === "aadhar" ? "adhar_url" : "pan_url";
		const { error } = await supabase
			.from("employees")
			.update({ [col]: null })
			.eq("id", employee.id);
		setUploading(null);
		if (error) {
			setUploadError(error.message);
			return;
		}
		setProfile((p) => ({ ...p, [col]: null }));
	};

	const isImageUrl = (url: string) =>
		/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

	const byMonthYear = records.reduce((acc, r) => {
		const key = `${r.year ?? 0}-${r.month ?? 0}`;
		if (!acc[key])
			acc[key] = {
				salary: 0,
				bonus: 0,
				deduction: 0,
				reimbursement: 0,
				items: [],
			};
		acc[key].items.push(r);
		if (r.type === "salary") acc[key].salary += Number(r.amount);
		else if (r.type === "bonus") acc[key].bonus += Number(r.amount);
		else if (r.type === "deduction") acc[key].deduction += Number(r.amount);
		else if (r.type === "reimbursement")
			acc[key].reimbursement += Number(r.amount);
		return acc;
	}, {} as Record<string, { salary: number; bonus: number; deduction: number; reimbursement: number; items: FinanceRecord[] }>);
	const sortedMonths = Object.entries(byMonthYear).sort(
		([a], [b]) => parseInt(b, 10) - parseInt(a, 10)
	);

	const latestBaseSalary = (() => {
		const salaryRecords = records.filter((r) => r.type === "salary");
		if (salaryRecords.length === 0) return null;
		const sorted = [...salaryRecords].sort((a, b) => {
			const ay = a.year ?? 0;
			const by = b.year ?? 0;
			if (ay !== by) return by - ay;
			const am = a.month ?? 0;
			const bm = b.month ?? 0;
			return bm - am;
		});
		return Number(sorted[0].amount);
	})();
	const annualSalary =
		latestBaseSalary !== null ? latestBaseSalary * 12 : null;

	const handleSaveBankDetails = async () => {
		if (!employee?.id) return;
		setIsSavingBank(true);
		setBankMessage(null);
		const supabase = createClient();
		const { error } = await supabase
			.from("employees")
			.update({
				bank_name: bankForm.bank_name || null,
				bank_account_number: bankForm.bank_account_number || null,
				bank_ifsc: bankForm.bank_ifsc || null,
				bank_location: bankForm.bank_location || null,
				pan_number: bankForm.pan_number || null,
				aadhar_number: bankForm.aadhar_number || null,
			})
			.eq("id", employee.id);

		if (error) {
			setBankMessage(
				error.message +
					" (Ensure employees table has bank_name, bank_account_number, bank_ifsc, bank_location, pan_number, aadhar_number columns.)"
			);
		} else {
			setBankMessage("Bank details updated successfully.");
			setIsEditingBank(false);
		}
		setIsSavingBank(false);
	};

	return (
		<div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased">
			<DashboardHeader
				title='Finance & Salary'
				description='Your salary details and docs'
			/>

			<div className='flex-1 space-y-6 p-4 md:p-6 pb-20 md:pb-6'>
				<div className='flex justify-end'>
					<Button
						variant='outline'
						size='sm'
						onClick={() => setSalaryVisible((v) => !v)}
						className="rounded-xl h-9 px-3 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 transition-all active:scale-[0.98]">
						{salaryVisible ? (
							<>
								<EyeOff className='h-3.5 w-3.5 mr-1.5' />
								Hide Amount
							</>
						) : (
							<>
								<Eye className='h-3.5 w-3.5 mr-1.5' />
								Show Amount
							</>
						)}
					</Button>
				</div>

				{/* Top summary: 3 cards */}
				<div className='grid gap-4 md:grid-cols-3'>
					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] group'>
						<div className='flex items-start justify-between'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500'>Base Salary</p>
								<p className='text-[10px] text-slate-400/80 dark:text-slate-550/80 font-bold mt-0.5'>Latest monthly salary</p>
								<p className='text-2xl font-black mt-3 text-slate-850 dark:text-white tabular-nums leading-none'>
									{latestBaseSalary !== null
										? formatOrMask(latestBaseSalary)
										: "—"}
								</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.05)] group-hover:scale-105 transition-transform'>
								<DollarSign className='h-4.5 w-4.5' />
							</div>
						</div>
					</div>

					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] group'>
						<div className='flex items-start justify-between'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500'>Annual Salary</p>
								<p className='text-[10px] text-slate-400/80 dark:text-slate-550/80 font-bold mt-0.5'>Approximate (12 × base)</p>
								<p className='text-2xl font-black mt-3 text-slate-850 dark:text-white tabular-nums leading-none'>
									{annualSalary !== null
										? formatOrMask(annualSalary)
										: "—"}
								</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-[0_2px_8px_rgba(16,185,129,0.05)] group-hover:scale-105 transition-transform'>
								<CreditCard className='h-4.5 w-4.5' />
							</div>
						</div>
					</div>

					<div className='relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] group'>
						<div className='flex items-start justify-between'>
							<div>
								<p className='text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500'>Currency</p>
								<p className='text-[10px] text-slate-400/80 dark:text-slate-550/80 font-bold mt-0.5'>All amounts in</p>
								<p className='text-2xl font-black mt-3 text-slate-850 dark:text-white tabular-nums leading-none'>
									INR
								</p>
							</div>
							<div className='h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-900/30 text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-[0_2px_8px_rgba(100,116,139,0.05)] group-hover:scale-105 transition-transform'>
								<span className='text-[10px] font-black'>₹</span>
							</div>
						</div>
					</div>
				</div>

				{/* Bank details & personal info */}
				<Card className="border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden">
					<CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-5">
						<div>
							<CardTitle className='flex items-center gap-2.5'>
								<div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
									<FileText className='h-4.5 w-4.5' />
								</div>
								<span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Bank Details & Info</span>
							</CardTitle>
							<p className='text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5 leading-normal'>
								Manage your bank account and personal salary details
							</p>
						</div>
						<Button
							variant='outline'
							size='sm'
							onClick={() => {
								setIsEditingBank((v) => !v);
								setBankMessage(null);
							}}
							className="rounded-xl h-10 px-4 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 transition-all active:scale-[0.98]">
							{isEditingBank ? "Cancel" : "Update Details"}
						</Button>
					</CardHeader>
					<CardContent className='space-y-6 p-6'>
						{bankMessage && (
							<div className='rounded-xl bg-slate-50 dark:bg-slate-950/20 p-3 text-xs font-bold border border-slate-100 dark:border-slate-900/30 text-slate-600 dark:text-slate-400'>
								{bankMessage}
							</div>
						)}
						<div className='grid gap-6 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
									Bank Name
								</Label>
								{isEditingBank ? (
									<input
										className='h-10 w-full rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 px-3 text-sm focus:border-slate-350 focus:outline-none transition-all'
										value={bankForm.bank_name}
										onChange={(e) =>
											setBankForm({
												...bankForm,
												bank_name: e.target.value,
											})
										}
									/>
								) : (
									<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
										{bankForm.bank_name || "Not set"}
									</p>
								)}
							</div>
							<div className='space-y-2'>
								<Label className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
									Account Number
								</Label>
								{isEditingBank ? (
									<input
										className='h-10 w-full rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 px-3 text-sm focus:border-slate-350 focus:outline-none transition-all'
										value={bankForm.bank_account_number}
										onChange={(e) =>
											setBankForm({
												...bankForm,
												bank_account_number:
													e.target.value,
											})
										}
									/>
								) : (
									<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
										{bankForm.bank_account_number ||
											"Not set"}
									</p>
								)}
							</div>
							<div className='space-y-2'>
								<Label className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
									IFSC Code
								</Label>
								{isEditingBank ? (
									<input
										className='h-10 w-full rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 px-3 text-sm focus:border-slate-350 focus:outline-none transition-all'
										value={bankForm.bank_ifsc}
										onChange={(e) =>
											setBankForm({
												...bankForm,
												bank_ifsc: e.target.value,
											})
										}
									/>
								) : (
									<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
										{bankForm.bank_ifsc || "Not set"}
									</p>
								)}
							</div>
							<div className='space-y-2'>
								<Label className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
									Location / Branch
								</Label>
								{isEditingBank ? (
									<input
										className='h-10 w-full rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 px-3 text-sm focus:border-slate-350 focus:outline-none transition-all'
										value={bankForm.bank_location}
										onChange={(e) =>
											setBankForm({
												...bankForm,
												bank_location: e.target.value,
											})
										}
									/>
								) : (
									<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
										{bankForm.bank_location || "Not set"}
									</p>
								)}
							</div>
							<div className='space-y-2'>
								<Label className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
									PAN Number
								</Label>
								{isEditingBank ? (
									<input
										className='h-10 w-full rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 px-3 text-sm focus:border-slate-350 focus:outline-none transition-all'
										value={bankForm.pan_number}
										onChange={(e) =>
											setBankForm({
												...bankForm,
												pan_number: e.target.value,
											})
										}
									/>
								) : (
									<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
										{bankForm.pan_number || "Not set"}
									</p>
								)}
							</div>
							<div className='space-y-2'>
								<Label className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>
									Aadhar Number
								</Label>
								{isEditingBank ? (
									<input
										className='h-10 w-full rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 px-3 text-sm focus:border-slate-350 focus:outline-none transition-all'
										value={bankForm.aadhar_number}
										onChange={(e) =>
											setBankForm({
												...bankForm,
												aadhar_number: e.target.value,
											})
										}
									/>
								) : (
									<p className='rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold'>
										{bankForm.aadhar_number || "Not set"}
									</p>
								)}
							</div>
						</div>
						{isEditingBank && (
							<div className='flex justify-end pt-2'>
								<Button
									size='sm'
									onClick={handleSaveBankDetails}
									disabled={isSavingBank}
									className="rounded-xl h-10 px-4 text-xs font-bold bg-primary text-white hover:bg-primary/95 transition-all active:scale-[0.98]">
									{isSavingBank ? (
										<>
											<Loader2 className='mr-2 h-4 w-4 animate-spin' />
											Saving...
										</>
									) : (
										"Save Details"
									)}
								</Button>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Salary by month */}
				<Card className="border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden">
					<CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-5">
						<CardTitle className='flex items-center gap-2.5'>
							<div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
								<DollarSign className='h-4.5 w-4.5' />
							</div>
							<span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Salary Details by Month</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6">
						{isLoading ? (
							<div className='flex items-center justify-center py-12'>
								<Loader2 className='h-6 w-6 animate-spin text-slate-400' />
							</div>
						) : sortedMonths.length === 0 ? (
							<p className='text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600 py-4 text-center'>
								No salary records yet.
							</p>
						) : (
							<div className='space-y-6'>
								{sortedMonths.map(
									([
										key,
										{
											salary,
											bonus,
											deduction,
											reimbursement,
											items,
										},
									]) => {
										const [y, m] = key
											.split("-")
											.map(Number);
										const monthName = m
											? new Date(y, m - 1).toLocaleString(
													"en-IN",
													{
														month: "long",
														year: "numeric",
													}
											  )
											: `Year ${y}`;
										const isSlipAllocated =
											isSalarySlipAllocated(m, y);
										const fullEmployeeData = {
											...employee,
											bank_name: bankForm.bank_name,
											bank_account_number: bankForm.bank_account_number,
											pan_number: bankForm.pan_number,
											address: employeeAddress,
										} as any;
										const slipData = getSalarySlipData(
											fullEmployeeData,
											m,
											y,
											records
										);
										return (
											<div
												key={key}
												className="rounded-2xl border border-slate-100 dark:border-slate-800/40 p-5 bg-slate-50/15 dark:bg-slate-900/50 hover:border-slate-200/50 dark:hover:border-slate-800/80 transition-colors">
												<div className='flex items-center justify-between mb-4'>
													<div className='flex items-center gap-3'>
														<h4 className="font-bold text-sm text-slate-800 dark:text-white">
															{monthName}
														</h4>
														<span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
															isSlipAllocated
																? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100/50 dark:border-emerald-900/30"
																: "bg-slate-100/80 dark:bg-slate-800/60 text-slate-550 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50"
														}`}>
															{isSlipAllocated
																? "Available"
																: "Pending"}
														</span>
													</div>
													{isSlipAllocated && (
														<SalarySlipDownload
															data={slipData}
															trigger={
																<Button
																	variant='outline'
																	size='sm'
																	className="rounded-xl h-8 px-3 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 transition-all">
																	<Download className='h-3.5 w-3.5 mr-1.5' />
																	Download Slip
																</Button>
															}
														/>
													)}
												</div>
												{!isSlipAllocated && (
													<div className='mb-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/25 border border-dashed border-slate-200/60 dark:border-slate-850 px-3 py-3'>
														<p className='text-[10px] text-slate-400 dark:text-slate-550 font-bold text-center uppercase tracking-wider'>
															Salary slip will be available once allocated by admin
														</p>
													</div>
												)}
												<div className='space-y-2'>
													{items.map((r) => (
														<div
															key={r.id}
															className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100/40 dark:border-slate-800/20 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors">
															<div className='flex items-center gap-3'>
																<span className="capitalize text-xs font-bold text-slate-700 dark:text-slate-350">
																	{r.type}
																</span>
																<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
																	r.status === "paid"
																		? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100/50 dark:border-emerald-900/30"
																		: "bg-slate-100/80 dark:bg-slate-800/60 text-slate-550 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50"
																}`}>
																	{r.status}
																</span>
															</div>
															<span
																className={`text-xs font-black tabular-nums ${
																	r.type ===
																	"deduction"
																		? "text-rose-500"
																		: "text-emerald-600 dark:text-emerald-450"
																}`}>
																{r.type ===
																"deduction"
																	? "-"
																	: "+"}
																{formatOrMask(
																	Number(
																		r.amount
																	)
																)}
															</span>
														</div>
													))}
												</div>
												<div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center">
													<span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
														Net Salary
													</span>
													<span className="text-sm font-black text-slate-850 dark:text-white tabular-nums">
														{formatOrMask(
															salary +
																bonus -
																deduction +
																reimbursement
														)}
													</span>
												</div>
											</div>
										);
									}
								)}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Aadhar & PAN – display on page, view, delete */}
				<Card className="border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.015)] rounded-2xl overflow-hidden">
					<CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-5">
						<CardTitle className='flex items-center gap-2.5'>
							<div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
								<FileText className='h-4.5 w-4.5' />
							</div>
							<span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Aadhar & PAN</span>
						</CardTitle>
						<p className='text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5 leading-normal'>
							Uploaded documents are shown below. View, replace, or delete.
						</p>
					</CardHeader>
					<CardContent className='space-y-6 p-6'>
						{uploadError && (
							<div className='rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3 text-xs font-bold border border-rose-100 dark:border-rose-900/30 text-rose-500'>
								{uploadError}
							</div>
						)}
						<div className='grid gap-6 md:grid-cols-2'>
							{/* Aadhar */}
							<div className='space-y-2'>
								<Label className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>Aadhar Card</Label>
								<input
									ref={aadharInputRef}
									type='file'
									accept='.pdf,.jpg,.jpeg,.png'
									className='sr-only'
									aria-hidden
									tabIndex={-1}
									disabled={!!uploading}
									onChange={(e) =>
										handleFileUpload("aadhar", e)
									}
								/>
								{profile?.adhar_url ? (
									<div className="rounded-xl border border-slate-100 dark:border-slate-800/60 overflow-hidden bg-slate-50/30 dark:bg-slate-950/10">
										<div className='aspect-[3/2] bg-slate-50 dark:bg-slate-950/20 flex items-center justify-center min-h-[140px]'>
											{isImageUrl(profile.adhar_url) ? (
												<img
													src={profile.adhar_url}
													alt='Aadhar'
													className='w-full h-full object-contain'
												/>
											) : (
												<div className='flex flex-col items-center gap-2 text-slate-400'>
													<FileText className='h-10 w-10' />
													<span className="text-[10px] font-black uppercase tracking-wider">
														PDF / Document
													</span>
												</div>
											)}
										</div>
										<div className='flex flex-wrap gap-2 p-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900'>
											<Button
												variant='outline'
												size='sm'
												className="rounded-xl h-8 px-2.5 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 transition-all"
												asChild>
												<a
													href={profile.adhar_url}
													target='_blank'
													rel='noopener noreferrer'>
													<ExternalLink className='mr-1.5 h-3.5 w-3.5' />
													View
												</a>
											</Button>
											<Button
												type='button'
												variant='ghost'
												size='sm'
												disabled={!!uploading}
												onClick={() =>
													aadharInputRef.current?.click()
												}
												className="rounded-xl h-8 px-2.5 text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all">
												{uploading === "aadhar" ? (
													<Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
												) : (
													<Upload className='mr-1.5 h-3.5 w-3.5' />
												)}
												Replace
											</Button>
											<Button
												type='button'
												variant='ghost'
												size='sm'
												className="rounded-xl h-8 px-2.5 text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
												disabled={!!uploading}
												onClick={() =>
													handleDeleteDocument(
														"aadhar"
													)
												}>
												<Trash2 className='mr-1.5 h-3.5 w-3.5' />
												Delete
											</Button>
										</div>
									</div>
								) : (
									<Button
										type='button'
										variant='outline'
										disabled={!!uploading}
										onClick={() =>
											aadharInputRef.current?.click()
										}
										className="w-full py-8 border-dashed rounded-xl text-[10px] font-black uppercase tracking-wider border-slate-250 hover:bg-slate-50/50 transition-all">
										{uploading === "aadhar" ? (
											<Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
										) : (
											<Upload className='mr-1.5 h-3.5 w-3.5' />
										)}
										Upload Aadhar
									</Button>
								)}
							</div>
							{/* PAN */}
							<div className='space-y-2'>
								<Label className='text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500'>PAN Card</Label>
								<input
									ref={panInputRef}
									type='file'
									accept='.pdf,.jpg,.jpeg,.png'
									className='sr-only'
									aria-hidden
									tabIndex={-1}
									disabled={!!uploading}
									onChange={(e) => handleFileUpload("pan", e)}
								/>
								{profile?.pan_url ? (
									<div className="rounded-xl border border-slate-100 dark:border-slate-800/60 overflow-hidden bg-slate-50/30 dark:bg-slate-950/10">
										<div className='aspect-[3/2] bg-slate-50 dark:bg-slate-950/20 flex items-center justify-center min-h-[140px]'>
											{isImageUrl(profile.pan_url) ? (
												<img
													src={profile.pan_url}
													alt='PAN'
													className='w-full h-full object-contain'
												/>
											) : (
												<div className='flex flex-col items-center gap-2 text-slate-400'>
													<FileText className='h-10 w-10' />
													<span className="text-[10px] font-black uppercase tracking-wider">
														PDF / Document
													</span>
												</div>
											)}
										</div>
										<div className='flex flex-wrap gap-2 p-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900'>
											<Button
												variant='outline'
												size='sm'
												className="rounded-xl h-8 px-2.5 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 transition-all"
												asChild>
												<a
													href={profile.pan_url}
													target='_blank'
													rel='noopener noreferrer'>
													<ExternalLink className='mr-1.5 h-3.5 w-3.5' />
													View
												</a>
											</Button>
											<Button
												type='button'
												variant='ghost'
												size='sm'
												disabled={!!uploading}
												onClick={() =>
													panInputRef.current?.click()
												}
												className="rounded-xl h-8 px-2.5 text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all">
												{uploading === "pan" ? (
													<Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
												) : (
													<Upload className='mr-1.5 h-3.5 w-3.5' />
												)}
												Replace
											</Button>
											<Button
												type='button'
												variant='ghost'
												size='sm'
												className="rounded-xl h-8 px-2.5 text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
												disabled={!!uploading}
												onClick={() =>
													handleDeleteDocument("pan")
												}>
												<Trash2 className='mr-1.5 h-3.5 w-3.5' />
												Delete
											</Button>
										</div>
									</div>
								) : (
									<Button
										type='button'
										variant='outline'
										disabled={!!uploading}
										onClick={() =>
											panInputRef.current?.click()
										}
										className="w-full py-8 border-dashed rounded-xl text-[10px] font-black uppercase tracking-wider border-slate-250 hover:bg-slate-50/50 transition-all">
										{uploading === "pan" ? (
											<Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
										) : (
											<Upload className='mr-1.5 h-3.5 w-3.5' />
										)}
										Upload PAN
									</Button>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
