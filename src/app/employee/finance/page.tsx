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
		<div className='flex flex-col'>
			<DashboardHeader
				title='Finance & Salary'
				description='Your salary details and docs'
			/>

			<div className='flex-1 space-y-6 p-6'>
				<div className='flex justify-end'>
					<Button
						variant='outline'
						size='sm'
						onClick={() => setSalaryVisible((v) => !v)}
						className='gap-2'>
						{salaryVisible ? (
							<>
								<EyeOff className='h-4 w-4' />
								Hide amount
							</>
						) : (
							<>
								<Eye className='h-4 w-4' />
								Show amount
							</>
						)}
					</Button>
				</div>

				{/* Top summary: 3 cards */}
				<div className='grid gap-4 md:grid-cols-3'>
					<Card className='bg-primary/5 border-none shadow-sm'>
						<CardHeader className='flex flex-row items-center justify-between pb-2'>
							<div>
								<CardTitle className='text-sm font-medium'>
									Base Salary
								</CardTitle>
								<p className='text-xs text-muted-foreground'>
									Latest monthly salary
								</p>
							</div>
							<DollarSign className='h-5 w-5 text-primary' />
						</CardHeader>
						<CardContent>
							<p className='text-2xl font-bold'>
								{latestBaseSalary !== null
									? formatOrMask(latestBaseSalary)
									: "—"}
							</p>
						</CardContent>
					</Card>
					<Card className='border-none bg-background shadow-sm'>
						<CardHeader className='flex flex-row items-center justify-between pb-2'>
							<div>
								<CardTitle className='text-sm font-medium'>
									Annual Salary
								</CardTitle>
								<p className='text-xs text-muted-foreground'>
									Approximate (12 × base)
								</p>
							</div>
							<CreditCard className='h-5 w-5 text-primary' />
						</CardHeader>
						<CardContent>
							<p className='text-2xl font-bold'>
								{annualSalary !== null
									? formatOrMask(annualSalary)
									: "—"}
							</p>
						</CardContent>
					</Card>
					<Card className='border-none bg-background shadow-sm'>
						<CardHeader className='flex flex-row items-center justify-between pb-2'>
							<div>
								<CardTitle className='text-sm font-medium'>
									Currency
								</CardTitle>
								<p className='text-xs text-muted-foreground'>
									All amounts in
								</p>
							</div>
							<span className='inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'>
								INR
							</span>
						</CardHeader>
						<CardContent>
							<p className='text-2xl font-bold'>INR</p>
						</CardContent>
					</Card>
				</div>

				{/* Bank details & personal info */}
				<Card>
					<CardHeader className='flex flex-row items-center justify-between'>
						<div>
							<CardTitle className='flex items-center gap-2'>
								<FileText className='h-5 w-5 text-primary' />
								<span>Bank Details & Personal Information</span>
							</CardTitle>
							<p className='text-sm text-muted-foreground'>
								Manage your bank account and personal salary
								details.
							</p>
						</div>
						<Button
							variant='outline'
							size='sm'
							onClick={() => {
								setIsEditingBank((v) => !v);
								setBankMessage(null);
							}}>
							{isEditingBank ? "Cancel" : "Update Bank Details"}
						</Button>
					</CardHeader>
					<CardContent className='space-y-4'>
						{bankMessage && (
							<div className='rounded-md bg-muted p-2 text-xs'>
								{bankMessage}
							</div>
						)}
						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-1'>
								<Label className='text-xs text-muted-foreground'>
									Bank Name
								</Label>
								{isEditingBank ? (
									<input
										className='h-9 w-full rounded-md border border-border bg-background px-3 text-sm'
										value={bankForm.bank_name}
										onChange={(e) =>
											setBankForm({
												...bankForm,
												bank_name: e.target.value,
											})
										}
									/>
								) : (
									<p className='rounded-md border border-border bg-muted/40 px-3 py-2 text-sm'>
										{bankForm.bank_name || "Not set"}
									</p>
								)}
							</div>
							<div className='space-y-1'>
								<Label className='text-xs text-muted-foreground'>
									Account Number
								</Label>
								{isEditingBank ? (
									<input
										className='h-9 w-full rounded-md border border-border bg-background px-3 text-sm'
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
									<p className='rounded-md border border-border bg-muted/40 px-3 py-2 text-sm'>
										{bankForm.bank_account_number ||
											"Not set"}
									</p>
								)}
							</div>
							<div className='space-y-1'>
								<Label className='text-xs text-muted-foreground'>
									IFSC Code
								</Label>
								{isEditingBank ? (
									<input
										className='h-9 w-full rounded-md border border-border bg-background px-3 text-sm'
										value={bankForm.bank_ifsc}
										onChange={(e) =>
											setBankForm({
												...bankForm,
												bank_ifsc: e.target.value,
											})
										}
									/>
								) : (
									<p className='rounded-md border border-border bg-muted/40 px-3 py-2 text-sm'>
										{bankForm.bank_ifsc || "Not set"}
									</p>
								)}
							</div>
							<div className='space-y-1'>
								<Label className='text-xs text-muted-foreground'>
									Location / Branch
								</Label>
								{isEditingBank ? (
									<input
										className='h-9 w-full rounded-md border border-border bg-background px-3 text-sm'
										value={bankForm.bank_location}
										onChange={(e) =>
											setBankForm({
												...bankForm,
												bank_location: e.target.value,
											})
										}
									/>
								) : (
									<p className='rounded-md border border-border bg-muted/40 px-3 py-2 text-sm'>
										{bankForm.bank_location || "Not set"}
									</p>
								)}
							</div>
							<div className='space-y-1'>
								<Label className='text-xs text-muted-foreground'>
									PAN Number
								</Label>
								{isEditingBank ? (
									<input
										className='h-9 w-full rounded-md border border-border bg-background px-3 text-sm'
										value={bankForm.pan_number}
										onChange={(e) =>
											setBankForm({
												...bankForm,
												pan_number: e.target.value,
											})
										}
									/>
								) : (
									<p className='rounded-md border border-border bg-muted/40 px-3 py-2 text-sm'>
										{bankForm.pan_number || "Not set"}
									</p>
								)}
							</div>
							<div className='space-y-1'>
								<Label className='text-xs text-muted-foreground'>
									Aadhar Number
								</Label>
								{isEditingBank ? (
									<input
										className='h-9 w-full rounded-md border border-border bg-background px-3 text-sm'
										value={bankForm.aadhar_number}
										onChange={(e) =>
											setBankForm({
												...bankForm,
												aadhar_number: e.target.value,
											})
										}
									/>
								) : (
									<p className='rounded-md border border-border bg-muted/40 px-3 py-2 text-sm'>
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
									disabled={isSavingBank}>
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
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<DollarSign className='h-5 w-5' />
							Salary Details by Month
						</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className='flex items-center justify-center py-8'>
								<Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
							</div>
						) : sortedMonths.length === 0 ? (
							<p className='text-sm text-muted-foreground py-4'>
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
										const slipData = {
											company: {
												name: companyConfig.name,
												logoUrl: companyConfig.logoUrl,
												address: companyConfig.address,
											},
											employee: {
												name: `${
													employee?.first_name ?? ""
												} ${
													employee?.last_name ?? ""
												}`.trim(),
												dateOfJoining:
													employee?.joining_date
														? String(
																new Date(
																	employee.joining_date
																).getFullYear()
														  )
														: undefined,
												department:
													employee?.designation ??
													undefined,
												address:
													employeeAddress ||
													undefined,
											},
											month: m,
											year: y,
											bank: {
												bankName:
													bankForm.bank_name ||
													undefined,
												accountNo:
													bankForm.bank_account_number ||
													undefined,
												panNo:
													bankForm.pan_number ||
													undefined,
											},
											earnings: (() => {
												const arr = [
													...(salary > 0
														? [
																{
																	component:
																		"Basic",
																	full: salary,
																	actual: salary,
																},
														  ]
														: []),
													...(bonus > 0
														? [
																{
																	component:
																		"Special Allowance",
																	full: bonus,
																	actual: bonus,
																},
														  ]
														: []),
													...(reimbursement > 0
														? [
																{
																	component:
																		"Reimbursement",
																	full: reimbursement,
																	actual: reimbursement,
																},
														  ]
														: []),
												];
												return arr.length > 0
													? arr
													: [
															{
																component:
																	"Basic",
																full: 0,
																actual: 0,
															},
													  ];
											})(),
											deductions: items
												.filter(
													(i) =>
														i.type ===
															"deduction" &&
														Number(i.amount) > 0
												)
												.map((i) => ({
													component:
														i.description ||
														"Deduction",
													amount: Number(i.amount),
												})),
											totalDeductions: deduction,
											netPay:
												salary +
												bonus -
												deduction +
												reimbursement,
										};
										return (
											<div
												key={key}
												className='rounded-lg border border-border p-4 hover:border-primary/30 transition-colors'>
												<div className='flex items-center justify-between mb-4'>
													<div className='flex items-center gap-3'>
														<h4 className='font-medium text-base'>
															{monthName}
														</h4>
														<Badge
															variant={
																isSlipAllocated
																	? "default"
																	: "secondary"
															}
															className='text-xs'>
															{isSlipAllocated
																? "Available"
																: "Pending"}
														</Badge>
													</div>
													{isSlipAllocated && (
														<SalarySlipDownload
															data={slipData}
															trigger={
																<Button
																	variant='outline'
																	size='sm'
																	className='gap-2'>
																	<Download className='h-4 w-4' />
																	Download
																	Slip
																</Button>
															}
														/>
													)}
												</div>
												{!isSlipAllocated && (
													<div className='mb-3 rounded-md bg-muted/40 border border-dashed px-3 py-2'>
														<p className='text-xs text-muted-foreground text-center'>
															Salary slip will be
															available once
															allocated by admin
														</p>
													</div>
												)}
												<div className='space-y-2'>
													{items.map((r) => (
														<div
															key={r.id}
															className='flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors'>
															<div className='flex items-center gap-3'>
																<span className='capitalize text-sm font-medium'>
																	{r.type}
																</span>
																<Badge
																	variant={
																		r.status ===
																		"paid"
																			? "default"
																			: "secondary"
																	}
																	className='text-xs'>
																	{r.status}
																</Badge>
															</div>
															<span
																className={`text-sm font-semibold ${
																	r.type ===
																	"deduction"
																		? "text-destructive"
																		: "text-primary"
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
												<div className='mt-4 pt-4 border-t-2 flex justify-between items-center'>
													<span className='text-sm font-medium text-muted-foreground'>
														Net Salary
													</span>
													<span className='text-lg font-bold text-primary'>
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
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<FileText className='h-5 w-5' />
							Aadhar & PAN
						</CardTitle>
						<p className='text-sm text-muted-foreground'>
							Uploaded documents are shown below. View, replace,
							or delete.
						</p>
					</CardHeader>
					<CardContent className='space-y-6'>
						{uploadError && (
							<div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
								{uploadError}
							</div>
						)}
						<div className='grid gap-6 md:grid-cols-2'>
							{/* Aadhar */}
							<div className='space-y-2'>
								<Label>Aadhar Card</Label>
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
									<div className='rounded-lg border border-border overflow-hidden'>
										<div className='aspect-[3/2] bg-muted flex items-center justify-center min-h-[140px]'>
											{isImageUrl(profile.adhar_url) ? (
												<img
													src={profile.adhar_url}
													alt='Aadhar'
													className='w-full h-full object-contain'
												/>
											) : (
												<div className='flex flex-col items-center gap-2 text-muted-foreground'>
													<FileText className='h-12 w-12' />
													<span className='text-sm'>
														PDF / Document
													</span>
												</div>
											)}
										</div>
										<div className='flex flex-wrap gap-2 p-2 border-t bg-muted/30'>
											<Button
												variant='outline'
												size='sm'
												asChild>
												<a
													href={profile.adhar_url}
													target='_blank'
													rel='noopener noreferrer'>
													<ExternalLink className='mr-2 h-4 w-4' />
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
												}>
												{uploading === "aadhar" ? (
													<Loader2 className='mr-2 h-4 w-4 animate-spin' />
												) : (
													<Upload className='mr-2 h-4 w-4' />
												)}
												Replace
											</Button>
											<Button
												type='button'
												variant='ghost'
												size='sm'
												className='text-destructive hover:text-destructive'
												disabled={!!uploading}
												onClick={() =>
													handleDeleteDocument(
														"aadhar"
													)
												}>
												<Trash2 className='mr-2 h-4 w-4' />
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
										className='w-full py-8 border-dashed'>
										{uploading === "aadhar" ? (
											<Loader2 className='mr-2 h-4 w-4 animate-spin' />
										) : (
											<Upload className='mr-2 h-4 w-4' />
										)}
										Upload Aadhar
									</Button>
								)}
							</div>
							{/* PAN */}
							<div className='space-y-2'>
								<Label>PAN Card</Label>
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
									<div className='rounded-lg border border-border overflow-hidden'>
										<div className='aspect-[3/2] bg-muted flex items-center justify-center min-h-[140px]'>
											{isImageUrl(profile.pan_url) ? (
												<img
													src={profile.pan_url}
													alt='PAN'
													className='w-full h-full object-contain'
												/>
											) : (
												<div className='flex flex-col items-center gap-2 text-muted-foreground'>
													<FileText className='h-12 w-12' />
													<span className='text-sm'>
														PDF / Document
													</span>
												</div>
											)}
										</div>
										<div className='flex flex-wrap gap-2 p-2 border-t bg-muted/30'>
											<Button
												variant='outline'
												size='sm'
												asChild>
												<a
													href={profile.pan_url}
													target='_blank'
													rel='noopener noreferrer'>
													<ExternalLink className='mr-2 h-4 w-4' />
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
												}>
												{uploading === "pan" ? (
													<Loader2 className='mr-2 h-4 w-4 animate-spin' />
												) : (
													<Upload className='mr-2 h-4 w-4' />
												)}
												Replace
											</Button>
											<Button
												type='button'
												variant='ghost'
												size='sm'
												className='text-destructive hover:text-destructive'
												disabled={!!uploading}
												onClick={() =>
													handleDeleteDocument("pan")
												}>
												<Trash2 className='mr-2 h-4 w-4' />
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
										className='w-full py-8 border-dashed'>
										{uploading === "pan" ? (
											<Loader2 className='mr-2 h-4 w-4 animate-spin' />
										) : (
											<Upload className='mr-2 h-4 w-4' />
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
