"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DollarSign,
	Plus,
	Search,
	TrendingUp,
	CreditCard,
	Wallet,
	Receipt,
	FileText,
	ExternalLink,
	Download,
	Trash2,
	TicketCheck,
	CheckCircle2,
	CheckCircle,
} from "lucide-react";
import type { FinanceRecord, Employee } from "@/lib/types";
import { useUser } from "../../../contexts/user-context";
import { toast } from "react-hot-toast";
import { SalarySlipDownload, buildPdf, fetchLogoAsDataUrl, getImageDimensions } from "@/components/salary-slip/salary-slip-download";
import { companyConfig } from "@/lib/constant";
import { getSalarySlipData } from "@/lib/salary-slip-helper";

interface FinanceWithEmployee extends FinanceRecord {
	employee?: Employee;
}

export default function FinancePage() {
	const { employee: currentUser } = useUser();
	const [records, setRecords] = useState<FinanceWithEmployee[]>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isAllocateSlipDialogOpen, setIsAllocateSlipDialogOpen] =
		useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [recordToDelete, setRecordToDelete] = useState<FinanceWithEmployee | null>(null);
	const [selectedEmployeesForSlip, setSelectedEmployeesForSlip] = useState<
		string[]
	>([]);
	const [slipEmployeeSearch, setSlipEmployeeSearch] = useState("");
	const [allocateSlipMonth, setAllocateSlipMonth] = useState(
		new Date().getMonth() + 1
	);
	const [allocateSlipYear, setAllocateSlipYear] = useState(
		new Date().getFullYear()
	);

	const [formData, setFormData] = useState({
		employee_id: "",
		amount: "",
		type: "salary",
		description: "",
		month: new Date().getMonth() + 1,
		year: new Date().getFullYear(),
	});
	const [formError, setFormError] = useState<string | null>(null);
	const [addRecordEmployeeSearch, setAddRecordEmployeeSearch] = useState("");

	const [stats, setStats] = useState({
		totalSalary: 0,
		totalBonus: 0,
		totalDeductions: 0,
		pending: 0,
	});

	useEffect(() => {
		fetchRecords();
		fetchEmployees();
	}, []);

	const fetchRecords = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("finance_records")
			.select(
				"*, employee:employees!finance_records_employee_id_fkey(id, first_name, last_name, avatar_url, designation, email, joining_date, address, bank_name, bank_account_number, pan_number)"
			)
			.order("year", { ascending: false })
			.order("month", { ascending: false })
			.order("created_at", { ascending: false });

		const financeRecords = (data as unknown as FinanceWithEmployee[]) || [];
		setRecords(financeRecords);

		const currentYear = new Date().getFullYear();
		const currentMonth = new Date().getMonth() + 1;
		const thisMonthRecords = financeRecords.filter(
			(r) => r.year === currentYear && r.month === currentMonth
		);

		setStats({
			totalSalary: thisMonthRecords
				.filter((r) => r.type === "salary")
				.reduce((sum, r) => sum + Number(r.amount), 0),
			totalBonus: thisMonthRecords
				.filter((r) => r.type === "bonus")
				.reduce((sum, r) => sum + Number(r.amount), 0),
			totalDeductions: thisMonthRecords
				.filter((r) => r.type === "deduction")
				.reduce((sum, r) => sum + Number(r.amount), 0),
			pending: financeRecords.filter((r) => r.status === "pending")
				.length,
		});

		setIsLoading(false);
	};

	const fetchEmployees = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select(
				"id, first_name, last_name, email, avatar_url, designation, adhar_url, pan_url, bank_name, bank_account_number, bank_ifsc, bank_location, aadhar_number, pan_number, joining_date, address"
			)
			.eq("is_active", true)
			.neq("role", "admin")
			.order("first_name");
		setEmployees((data as Employee[]) || []);
	};


	const filteredEmployeesForDocs = employees.filter((emp) => {
		const matchesSearch =
			emp.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			emp.email?.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesSearch;
	});

	const handleCreateRecord = async () => {
		setFormError(null);
		const supabase = createClient();

		if (formData.type === "salary") {
			const { data: existing } = await supabase
				.from("finance_records")
				.select("id")
				.eq("employee_id", formData.employee_id)
				.eq("month", formData.month)
				.eq("year", formData.year)
				.eq("type", "salary")
				.limit(1);
			if (existing?.length) {
				toast.error(
					"This employee already has a salary allocated for this month."
				);
				setFormError(
					"This employee already has a salary allocated for this month."
				);
				return;
			}
		}

		const { error } = await supabase.from("finance_records").insert({
			employee_id: formData.employee_id,
			amount: parseFloat(formData.amount),
			type: formData.type,
			description: formData.description,
			month: formData.month,
			year: formData.year,
			created_by: currentUser?.id,
		});

		if (!error) {
			await fetchRecords();
			setIsAddDialogOpen(false);
			setFormData({
				employee_id: "",
				amount: "",
				type: "salary",
				description: "",
				month: new Date().getMonth() + 1,
				year: new Date().getFullYear(),
			});
		}
	};

	const handleDeleteRecord = async () => {
		if (!recordToDelete) return;

		const supabase = createClient();

		const { error } = await supabase
			.from("finance_records")
			.delete()
			.eq("id", recordToDelete.id);

		if (error) {
			toast.error("Failed to delete record: " + error.message);
		} else {
			toast.success("Record deleted successfully");
			await fetchRecords();
			setIsDeleteDialogOpen(false);
			setRecordToDelete(null);
		}
	};

	const handleMarkPaid = async (recordId: string) => {
		const supabase = createClient();

		await supabase
			.from("finance_records")
			.update({
				status: "paid",
				paid_at: new Date().toISOString(),
			})
			.eq("id", recordId);

		await fetchRecords();
	};

	const handleAllocateSalarySlips = async () => {
		if (selectedEmployeesForSlip.length === 0) {
			toast.error("Please select at least one employee");
			return;
		}

		const supabase = createClient();

		// Update salary_slip_allocated to true for selected employees' salary records
		// for the specified month and year
		const { error } = await supabase
			.from("finance_records")
			.update({ salary_slip_allocated: true })
			.in("employee_id", selectedEmployeesForSlip)
			.eq("month", allocateSlipMonth)
			.eq("year", allocateSlipYear)
			.eq("type", "salary");

		if (error) {
			toast.error("Failed to allocate salary slips: " + error.message);
			return;
		}

		// Send payslip emails asynchronously to the allocated employees
		toast.loading("Allocating Salary Slips", { id: "payslip-email-status" });
		try {
			const logoUrl = companyConfig.logoUrl ?? "/paysliplogo.png";
			const logoDataUrl = await fetchLogoAsDataUrl(logoUrl);
			let logoW: number | undefined;
			let logoH: number | undefined;
			if (logoDataUrl) {
				try {
					const dim = await getImageDimensions(logoDataUrl);
					logoW = dim.width;
					logoH = dim.height;
				} catch {
					// use default logo size if aspect ratio cannot be computed
				}
			}

			let emailSuccessCount = 0;
			let emailFailCount = 0;

			for (const employeeId of selectedEmployeesForSlip) {
				const emp = employees.find((e) => e.id === employeeId);
				if (!emp || !emp.email) {
					emailFailCount++;
					continue;
				}

				try {
					const slipData = getSalarySlipData(
						emp,
						allocateSlipMonth,
						allocateSlipYear,
						records
					);

					const pdf = buildPdf(slipData, logoDataUrl, logoW, logoH);
					const pdfBase64 = pdf.output("datauristring");

					const monthName = months[allocateSlipMonth - 1] ?? "N/A";
					const res = await fetch("/api/finance/notify", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							employeeEmail: emp.email,
							employeeName: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim(),
							monthName,
							year: allocateSlipYear,
							pdfBase64,
						}),
					});

					const resData = await res.json();
					if (res.ok && !resData.skipped) {
						emailSuccessCount++;
					} else {
						emailFailCount++;
					}
				} catch (err) {
					console.error("Failed to send email to " + emp.email, err);
					emailFailCount++;
				}
			}

			toast.dismiss("payslip-email-status");
			if (emailFailCount === 0) {
				toast.success(
					`Salary slips allocated and emails sent to ${emailSuccessCount} employee(s)`
				);
			} else {
				toast.success(
					`Salary slips allocated. Emails sent: ${emailSuccessCount}, failed/skipped: ${emailFailCount}.`
				);
			}
		} catch (err) {
			console.error("Failed in generating or sending payslip emails", err);
			toast.dismiss("payslip-email-status");
			toast.success(
				`Salary slips allocated for ${selectedEmployeesForSlip.length} employee(s) (email notification failed).`
			);
		}

		setIsAllocateSlipDialogOpen(false);
		setSelectedEmployeesForSlip([]);
		setSlipEmployeeSearch("");
		await fetchRecords();
	};

	// Get employees who have salary records for the selected month/year
	const employeesWithSalaryForPeriod = employees.filter((emp) => {
		return records.some(
			(r) =>
				r.employee_id === emp.id &&
				r.type === "salary" &&
				r.month === allocateSlipMonth &&
				r.year === allocateSlipYear
		);
	});

	const filteredRecords = records.filter((record) => {
		const matchesSearch =
			record.employee?.first_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			record.employee?.last_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase());
		const matchesType = typeFilter === "all" || record.type === typeFilter;
		return matchesSearch && matchesType;
	});

	const getTypeBadge = (type: string) => {
		switch (type) {
			case "salary":
				return <Badge className='bg-primary'>Salary</Badge>;
			case "bonus":
				return (
					<Badge className='bg-success text-success-foreground'>
						Bonus
					</Badge>
				);
			case "deduction":
				return <Badge variant='destructive'>Deduction</Badge>;
			case "reimbursement":
				return <Badge variant='secondary'>Reimbursement</Badge>;
			default:
				return <Badge variant='outline'>{type}</Badge>;
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "paid":
				return (
					<Badge className='bg-success text-success-foreground'>
						Paid
					</Badge>
				);
			case "pending":
				return <Badge variant='secondary'>Pending</Badge>;
			case "cancelled":
				return <Badge variant='destructive'>Cancelled</Badge>;
			default:
				return <Badge variant='outline'>{status}</Badge>;
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "INR",
		}).format(amount);
	};

	const months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	return (
		<div className='flex flex-col min-h-screen bg-transparent text-slate-800 dark:text-slate-200'>
			<DashboardHeader
				title='Finance'
				description='Manage financial records'
			/>

			<div className='flex-1 space-y-6 p-6 pb-20 md:pb-8'>
				{/* Stats */}
				<div className='grid gap-4 grid-cols-2 md:grid-cols-4'>
					<StatCard
						title='Total Salaries'
						value={formatCurrency(stats.totalSalary)}
						icon={<Wallet className='h-5 w-5' />}
						description='This month'
					/>
					<StatCard
						title='Total Bonuses'
						value={formatCurrency(stats.totalBonus)}
						icon={<TrendingUp className='h-5 w-5' />}
						description='This month'
					/>
					<StatCard
						title='Deductions'
						value={formatCurrency(stats.totalDeductions)}
						icon={<CreditCard className='h-5 w-5' />}
						description='This month'
					/>
					<StatCard
						title='Pending Payments'
						value={stats.pending}
						icon={<Receipt className='h-5 w-5' />}
					/>
				</div>

				<Tabs defaultValue="transactions" className="space-y-6">
					<TabsList className="bg-slate-100/85 dark:bg-slate-950/40 p-1 rounded-xl h-auto border border-slate-100 dark:border-slate-800/40">
						<TabsTrigger value="transactions" className="rounded-lg px-6 py-2.5 font-bold text-xs uppercase tracking-wider transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-slate-500 dark:text-slate-400">Transactions</TabsTrigger>
						<TabsTrigger value="documents" className="rounded-lg px-6 py-2.5 font-bold text-xs uppercase tracking-wider transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-slate-500 dark:text-slate-400">Employee Documents</TabsTrigger>
					</TabsList>

					<TabsContent value="transactions" className="space-y-6">
						{/* Filters */}
						<Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)]">
							<CardContent className='flex flex-wrap items-center gap-4 p-4'>
								<div className='relative flex-1 min-w-[200px]'>
									<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
									<Input
										placeholder='Search employees...'
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className='pl-9 bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 focus:border-primary/50 focus:ring-primary/20 text-slate-800 dark:text-slate-200'
									/>
								</div>
								<Select
									value={typeFilter}
									onValueChange={setTypeFilter}>
									<SelectTrigger className='w-[150px] bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 rounded-xl h-10'>
										<SelectValue placeholder='Filter type' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>All Types</SelectItem>
										<SelectItem value='salary'>Salary</SelectItem>
										<SelectItem value='bonus'>Bonus</SelectItem>
										<SelectItem value='deduction'>
											Deduction
										</SelectItem>
										<SelectItem value='reimbursement'>
											Reimbursement
										</SelectItem>
									</SelectContent>
								</Select>
								<Dialog
									open={isAllocateSlipDialogOpen}
									onOpenChange={(open) => {
										setIsAllocateSlipDialogOpen(open);
										if (!open) {
											setSelectedEmployeesForSlip([]);
											setSlipEmployeeSearch("");
										}
									}}>
									<DialogTrigger asChild>
										<Button variant='outline' className='rounded-xl h-10 px-4 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98]'>
											<FileText className='mr-2 h-4 w-4' />
											Allocate Salary Slips
										</Button>
									</DialogTrigger>
									<DialogContent className='max-w-2xl'>
										<DialogHeader>
											<DialogTitle>
												Allocate Salary Slips
											</DialogTitle>
											<DialogDescription>
												Select employees and month/year to
												allocate salary slip download access
											</DialogDescription>
										</DialogHeader>
										<div className='space-y-4 py-4'>
											<div className='grid grid-cols-2 gap-4'>
												<div className='space-y-2'>
													<Label>Month</Label>
													<Select
														value={allocateSlipMonth.toString()}
														onValueChange={(value) =>
															setAllocateSlipMonth(
																parseInt(value)
															)
														}>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{months.map(
																(month, idx) => (
																	<SelectItem
																		key={month}
																		value={(
																			idx + 1
																		).toString()}>
																		{month}
																	</SelectItem>
																)
															)}
														</SelectContent>
													</Select>
												</div>
												<div className='space-y-2'>
													<Label>Year</Label>
													<Input
														type='number'
														value={allocateSlipYear}
														onChange={(e) =>
															setAllocateSlipYear(
																parseInt(e.target.value)
															)
														}
													/>
												</div>
											</div>
											<div className='space-y-2'>
												<Label>
													Select Employees (with salary
													records for this period)
												</Label>
												<div className='rounded-md border border-border bg-muted/30'>
													<div className='flex items-center gap-2 border-b border-border px-3 py-2'>
														<Search className='h-4 w-4 shrink-0 text-muted-foreground' />
														<Input
															placeholder='Search employees...'
															value={slipEmployeeSearch}
															onChange={(e) =>
																setSlipEmployeeSearch(
																	e.target.value
																)
															}
															className='h-9 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0'
														/>
													</div>
													<div className='max-h-64 overflow-y-auto p-1'>
														{employeesWithSalaryForPeriod
															.filter(
																(emp) =>
																	!slipEmployeeSearch.trim() ||
																	`${emp.first_name ??
																		""
																		} ${emp.last_name ??
																		""
																		} ${emp.email ?? ""
																		}`
																		.toLowerCase()
																		.includes(
																			slipEmployeeSearch.toLowerCase()
																		)
															)
															.map((emp) => {
																const isSelected =
																	selectedEmployeesForSlip.includes(
																		emp.id
																	);
																const salaryRecord =
																	records.find(
																		(r) =>
																			r.employee_id ===
																			emp.id &&
																			r.type ===
																			"salary" &&
																			r.month ===
																			allocateSlipMonth &&
																			r.year ===
																			allocateSlipYear
																	);
																const isAllocated =
																	salaryRecord?.salary_slip_allocated;

																return (
																	<button
																		key={emp.id}
																		type='button'
																		onClick={() => {
																			setSelectedEmployeesForSlip(
																				(
																					prev
																				) =>
																					prev.includes(
																						emp.id
																					)
																						? prev.filter(
																							(
																								id
																							) =>
																								id !==
																								emp.id
																						)
																						: [
																							...prev,
																							emp.id,
																						]
																			);
																		}}
																		className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${isSelected
																			? "bg-primary/15 text-primary"
																			: "hover:bg-muted/80"
																			}`}>
																		<span
																			className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected
																				? "border-primary bg-primary"
																				: "border-muted-foreground"
																				}`}>
																			{isSelected && (
																				<span className='h-2 w-2 rounded-full bg-primary-foreground' />
																			)}
																		</span>
																		<span className='truncate'>
																			{
																				emp.first_name
																			}{" "}
																			{
																				emp.last_name
																			}
																		</span>
																		{emp.email && (
																			<span className='truncate text-xs text-muted-foreground'>
																				{
																					emp.email
																				}
																			</span>
																		)}
																		{isAllocated && (
																			<CheckCircle className="ml-auto text-green-500" />
																		)}
																	</button>
																);
															})}
														{employeesWithSalaryForPeriod.filter(
															(emp) =>
																!slipEmployeeSearch.trim() ||
																`${emp.first_name ?? ""
																	} ${emp.last_name ?? ""
																	} ${emp.email ?? ""}`
																	.toLowerCase()
																	.includes(
																		slipEmployeeSearch.toLowerCase()
																	)
														).length === 0 && (
																<p className='p-4 text-center text-sm text-muted-foreground'>
																	No employees with salary
																	records for this period
																</p>
															)}
													</div>
												</div>
												{selectedEmployeesForSlip.length >
													0 && (
														<p className='text-xs text-muted-foreground'>
															Selected:{" "}
															{
																selectedEmployeesForSlip.length
															}{" "}
															employee(s)
														</p>
													)}
											</div>
											<div className='flex justify-end gap-3 pt-4'>
												<Button
													variant='outline'
													onClick={() =>
														setIsAllocateSlipDialogOpen(
															false
														)
													}>
													Cancel
												</Button>
												<Button
													onClick={handleAllocateSalarySlips}
													disabled={
														selectedEmployeesForSlip.length ===
														0
													}>
													Allocate Slips
												</Button>
											</div>
										</div>
									</DialogContent>
								</Dialog>
								<Dialog
									open={isAddDialogOpen}
									onOpenChange={(open) => {
										setIsAddDialogOpen(open);
										if (!open) setAddRecordEmployeeSearch("");
										if (!open) setFormError(null);
									}}>
									<DialogTrigger asChild>
										<Button className='gap-2 rounded-xl h-10 px-4 text-xs font-bold bg-primary text-white hover:bg-primary/95 transition-all active:scale-[0.98]'>
											<Plus className='h-4 w-4' />
											Add Record
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>
												Add Finance Record
											</DialogTitle>
											<DialogDescription>
												Create a new salary, bonus, or deduction
												record
											</DialogDescription>
										</DialogHeader>
										<div className='space-y-4 py-4'>
											<div className='space-y-2'>
												<Label>Employee</Label>
												<div className='rounded-md border border-border bg-muted/30'>
													<div className='flex items-center gap-2 border-b border-border px-3 py-2'>
														<Search className='h-4 w-4 shrink-0 text-muted-foreground' />
														<Input
															placeholder='Search employee...'
															value={
																addRecordEmployeeSearch
															}
															onChange={(e) =>
																setAddRecordEmployeeSearch(
																	e.target.value
																)
															}
															className='h-9 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0'
														/>
													</div>
													<div className='max-h-44 overflow-y-auto p-1'>
														{employees
															.filter(
																(emp) =>
																	!addRecordEmployeeSearch.trim() ||
																	`${emp.first_name ??
																		""
																		} ${emp.last_name ??
																		""
																		} ${emp.email ?? ""
																		}`
																		.toLowerCase()
																		.includes(
																			addRecordEmployeeSearch.toLowerCase()
																		)
															)
															.map((emp) => {
																const selected =
																	formData.employee_id ===
																	emp.id;
																return (
																	<button
																		key={emp.id}
																		type='button'
																		onClick={() => {
																			const next =
																			{
																				...formData,
																				employee_id:
																					emp.id,
																			};
																			const hasExisting =
																				records.some(
																					(
																						r
																					) =>
																						r.employee_id ===
																						emp.id &&
																						r.month ===
																						formData.month &&
																						r.year ===
																						formData.year &&
																						r.type ===
																						"salary"
																				);
																			if (
																				hasExisting &&
																				formData.type ===
																				"salary"
																			)
																				next.type =
																					"bonus";
																			setFormData(
																				next
																			);
																		}}
																		className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${selected
																			? "bg-primary/15 text-primary"
																			: "hover:bg-muted/80"
																			}`}>
																		<span
																			className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected
																				? "border-primary bg-primary"
																				: "border-muted-foreground"
																				}`}>
																			{selected && (
																				<span className='h-2 w-2 rounded-full bg-primary-foreground' />
																			)}
																		</span>
																		<span className='truncate'>
																			{
																				emp.first_name
																			}{" "}
																			{
																				emp.last_name
																			}
																		</span>
																		{emp.email && (
																			<span className='truncate text-xs text-muted-foreground'>
																				{
																					emp.email
																				}
																			</span>
																		)}
																	</button>
																);
															})}
													</div>
												</div>
												{formData.employee_id && (
													<p className='text-xs text-muted-foreground'>
														Selected:{" "}
														{
															employees.find(
																(e) =>
																	e.id ===
																	formData.employee_id
															)?.first_name
														}{" "}
														{
															employees.find(
																(e) =>
																	e.id ===
																	formData.employee_id
															)?.last_name
														}
													</p>
												)}
											</div>
											<div className='grid grid-cols-2 gap-4'>
												<div className='space-y-2'>
													<Label>Type</Label>
													<Select
														value={formData.type}
														onValueChange={(value) =>
															setFormData({
																...formData,
																type: value,
															})
														}>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value='salary'>
																Salary
															</SelectItem>
															<SelectItem value='bonus'>
																Bonus
															</SelectItem>
															<SelectItem value='deduction'>
																Deduction
															</SelectItem>
															<SelectItem value='reimbursement'>
																Reimbursement
															</SelectItem>
														</SelectContent>
													</Select>
												</div>
												<div className='space-y-2'>
													<Label>Amount</Label>
													<Input
														type='number'
														placeholder='0.00'
														value={formData.amount}
														onChange={(e) =>
															setFormData({
																...formData,
																amount: e.target.value,
															})
														}
													/>
												</div>
											</div>
											<div className='grid grid-cols-2 gap-4'>
												<div className='space-y-2'>
													<Label>Month</Label>
													<Select
														value={formData.month.toString()}
														onValueChange={(value) => {
															const next = {
																...formData,
																month: parseInt(value),
															};
															const hasExisting =
																formData.employee_id &&
																records.some(
																	(r) =>
																		r.employee_id ===
																		formData.employee_id &&
																		r.month ===
																		parseInt(
																			value
																		) &&
																		r.year ===
																		formData.year &&
																		r.type ===
																		"salary"
																);
															if (
																hasExisting &&
																formData.type ===
																"salary"
															)
																next.type = "bonus";
															setFormData(next);
														}}>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{months.map(
																(month, idx) => (
																	<SelectItem
																		key={month}
																		value={(
																			idx + 1
																		).toString()}>
																		{month}
																	</SelectItem>
																)
															)}
														</SelectContent>
													</Select>
												</div>
												<div className='space-y-2'>
													<Label>Year</Label>
													<Input
														type='number'
														value={formData.year}
														onChange={(e) => {
															const year = parseInt(
																e.target.value
															);
															const next = {
																...formData,
																year,
															};
															const hasExisting =
																formData.employee_id &&
																records.some(
																	(r) =>
																		r.employee_id ===
																		formData.employee_id &&
																		r.month ===
																		formData.month &&
																		r.year ===
																		year &&
																		r.type ===
																		"salary"
																);
															if (
																hasExisting &&
																formData.type ===
																"salary"
															)
																next.type = "bonus";
															setFormData(next);
														}}
													/>
												</div>
											</div>
											<div className='space-y-2'>
												<Label>Description</Label>
												<Input
													placeholder='Optional description...'
													value={formData.description}
													onChange={(e) =>
														setFormData({
															...formData,
															description: e.target.value,
														})
													}
												/>
											</div>
											{formError && (
												<p className='text-sm text-destructive'>
													{formError}
												</p>
											)}
											<div className='flex justify-end gap-3 pt-4'>
												<Button
													variant='outline'
													onClick={() =>
														setIsAddDialogOpen(false)
													}>
													Cancel
												</Button>
												<Button
													onClick={handleCreateRecord}
													disabled={
														!formData.employee_id ||
														!formData.amount
													}>
													Create Record
												</Button>
											</div>
										</div>
									</DialogContent>
								</Dialog>

								<Dialog
									open={isDeleteDialogOpen}
									onOpenChange={(open) => {
										setIsDeleteDialogOpen(open);
										if (!open) setRecordToDelete(null);
									}}>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>
												Confirm Delete
											</DialogTitle>
											<DialogDescription>
												Are you sure you want to delete this {recordToDelete?.type} record for {recordToDelete?.employee?.first_name} {recordToDelete?.employee?.last_name}? This action cannot be undone.
											</DialogDescription>
										</DialogHeader>
										<div className="flex justify-end gap-3 pt-4">
											<Button
												variant="outline"
												onClick={() => setIsDeleteDialogOpen(false)}>
												Cancel
											</Button>
											<Button
												variant="destructive"
												onClick={handleDeleteRecord}>
												Delete
											</Button>
										</div>
									</DialogContent>
								</Dialog>
							</CardContent>
						</Card>

						{/* Records Table */}
						<Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
							<CardHeader className="border-b border-slate-50 dark:border-slate-800/40 pb-5">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
										<DollarSign className="h-5 w-5" />
									</div>
									<div>
										<CardTitle className="text-lg">Finance Records</CardTitle>
										<p className="text-xs text-muted-foreground mt-1">Review and manage all salary, bonus, and deduction records.</p>
									</div>
								</div>
							</CardHeader>
							<CardContent className="p-0">
								{isLoading ? (
									<div className='flex items-center justify-center py-12'>
										<p className='text-muted-foreground text-sm'>
											Loading...
										</p>
									</div>
								) : filteredRecords.length === 0 ? (
									<div className='flex flex-col items-center justify-center py-12'>
										<p className='text-muted-foreground text-sm'>
											No finance records found
										</p>
									</div>
								) : (
									<div className='w-full overflow-x-auto'>
										<Table>
											<TableHeader>
												<TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
													<TableHead className="font-bold px-6 py-3.5">Employee</TableHead>
													<TableHead className="font-bold px-4 py-3.5">Type</TableHead>
													<TableHead className="font-bold px-4 py-3.5">Amount</TableHead>
													<TableHead className="font-bold px-4 py-3.5">Period</TableHead>
													<TableHead className="font-bold px-4 py-3.5">Description</TableHead>
													<TableHead className="font-bold px-4 py-3.5">Status</TableHead>
													<TableHead className="font-bold px-4 py-3.5">Slip</TableHead>
													<TableHead className="font-bold px-6 py-3.5 text-right">Action</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredRecords.map((record) => {
													const empSalary = record.type === "salary" ? Number(record.amount) : 0;
													const empBonus = records
														.filter(
															(r) =>
																r.employee_id === record.employee_id &&
																r.type === "bonus" &&
																r.month === record.month &&
																r.year === record.year
														)
														.reduce((sum, r) => sum + Number(r.amount), 0);
													const empReimbursement = records
														.filter(
															(r) =>
																r.employee_id === record.employee_id &&
																r.type === "reimbursement" &&
																r.month === record.month &&
																r.year === record.year
														)
														.reduce((sum, r) => sum + Number(r.amount), 0);
													const empDeduction = records
														.filter(
															(r) =>
																r.employee_id === record.employee_id &&
																r.type === "deduction" &&
																r.month === record.month &&
																r.year === record.year
														)
														.reduce((sum, r) => sum + Number(r.amount), 0);

													return (
														<TableRow key={record.id} className='border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-colors'>
															<TableCell className='px-6 py-3.5'>
																<div className='flex items-center gap-3'>
																	<Avatar className='h-8 w-8'>
																		{record.employee?.avatar_url && (
																			<AvatarImage height={32} width={32} className="object-cover"
																				src={record.employee.avatar_url}
																				alt="Profile Pic"
																			/>
																		)}
																		<AvatarFallback className='text-xs'>
																			{
																				record
																					.employee
																					?.first_name?.[0]
																			}
																			{
																				record
																					.employee
																					?.last_name?.[0]
																			}
																		</AvatarFallback>
																	</Avatar>
																	<div>
																		<p className='font-medium text-sm'>
																			{
																				record
																					.employee
																					?.first_name
																			}{" "}
																			{
																				record
																					.employee
																					?.last_name
																			}
																		</p>
																		<p className='text-xs text-muted-foreground'>
																			{
																				record
																					.employee
																					?.designation
																			}
																		</p>
																	</div>
																</div>
															</TableCell>
															<TableCell>
																{getTypeBadge(record.type)}
															</TableCell>
															<TableCell className='font-medium'>
																{formatCurrency(
																	record.amount
																)}
															</TableCell>
															<TableCell className='text-sm'>
																{record.month && record.year
																	? `${months[
																	record.month -
																	1
																	]
																	} ${record.year}`
																	: "-"}
															</TableCell>
															<TableCell className='max-w-[150px] truncate text-sm'>
																{record.description || "-"}
															</TableCell>
															<TableCell>
																{getStatusBadge(
																	record.status
																)}
															</TableCell>
															<TableCell>
																{record.type === "salary" &&
																	record.salary_slip_allocated && (
																		<SalarySlipDownload
																			data={getSalarySlipData(
																				record.employee as any,
																				record.month ?? 1,
																				record.year ?? new Date().getFullYear(),
																				records
																			)}
																			trigger={
																				<Button
																					variant='ghost'
																					size='sm'>
																					<Download className='mr-2 h-4 w-4' />
																					Download
																				</Button>
																			}
																		/>
																	)}
																{record.type === "salary" &&
																	!record.salary_slip_allocated && (
																		<Badge variant='secondary'>
																			Not Allocated
																		</Badge>
																	)}
															</TableCell>
															<TableCell className="text-right">
																<div className="flex items-center justify-end gap-2 text-right">
																	{record.status === "pending" && (
																		<Button
																			size='sm'
																			variant='outline'
																			className='h-8 bg-background hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors text-xs font-semibold rounded-lg'
																			onClick={() =>
																				handleMarkPaid(
																					record.id
																				)
																			}>
																			Mark Paid
																		</Button>
																	)}
																	<Button
																		size='sm'
																		variant='outline'
																		className='h-8 w-8 p-0 bg-background hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors rounded-lg'
																		onClick={() => {
																			setRecordToDelete(record);
																			setIsDeleteDialogOpen(true);
																		}}>
																		<Trash2 className='h-3.5 w-3.5' />
																	</Button>
																</div>
															</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="documents" className="space-y-6">
						{/* Employee Documents & Salary – all employees, documents + salary or docs only */}
						<Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
							<CardHeader className="border-b border-slate-50 dark:border-slate-800/40 pb-5">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
										<FileText className="h-5 w-5" />
									</div>
									<div>
										<CardTitle className="text-lg">Employee Documents & Details</CardTitle>
										<CardDescription className="mt-1">
											View and manage employee identity documents and bank details for payroll processing.
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent className="p-6 bg-slate-50/50 dark:bg-slate-950/20">
								{filteredEmployeesForDocs.length === 0 ? (
									<p className='text-sm text-muted-foreground py-4 text-center'>
										No employees found.
									</p>
								) : (
									<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
										{filteredEmployeesForDocs.map((emp) => {
											const adharUrl = emp.adhar_url;
											const panUrl = emp.pan_url;
											const aadharNo = emp.aadhar_number;
											const panNo = emp.pan_number;

											return (
												<Card key={emp.id} className='overflow-hidden border border-slate-100 dark:border-slate-800/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:border-indigo-500/20 transition-all duration-350 bg-white dark:bg-slate-900'>
													<CardContent className='p-5 space-y-4'>
														{/* Employee Header */}
														<div className='flex items-center gap-3 pb-3 border-b border-border/50'>
															<Avatar className='h-12 w-12 shrink-0'>
																{emp.avatar_url ? (
																	<AvatarImage className="object-cover"
																		src={emp.avatar_url}

																	/>
																) : null}
																<AvatarFallback className='bg-primary text-primary-foreground'>
																	{emp.first_name?.[0]}{emp.last_name?.[0]}
																</AvatarFallback>
															</Avatar>
															<div className='flex-1 min-w-0'>
																<h4 className='font-semibold text-base truncate'>
																	{emp.first_name} {emp.last_name}
																</h4>
																<p className='text-xs text-muted-foreground truncate'>
																	{emp.employee_id || "—"}
																</p>
															</div>
														</div>

														{/* Email */}
														<div className='space-y-1'>
															<p className='text-[10px] uppercase tracking-wide text-muted-foreground font-medium'>Email</p>
															<p className='text-sm font-medium truncate'>{emp.email || "—"}</p>
														</div>

														{/* Documents Section */}
														<div className='space-y-2'>
															<p className='text-[10px] uppercase tracking-wide text-muted-foreground font-medium'>Documents</p>
															<div className='grid grid-cols-2 gap-2'>
																{/* Aadhar */}
																<div className='space-y-1.5'>
																	<p className='text-xs text-muted-foreground'>Aadhar</p>
																	{adharUrl ? (
																		<Button
																			variant='outline'
																			size='sm'
																			className='w-full'
																			asChild>
																			<a
																				href={adharUrl}
																				target='_blank'
																				rel='noopener noreferrer'>
																				<ExternalLink className='mr-1.5 h-3.5 w-3.5' />
																				View
																			</a>
																		</Button>
																	) : (
																		<p className='text-xs text-muted-foreground px-2 py-1.5 bg-muted/30 rounded text-center'>
																			No doc
																		</p>
																	)}
																	<p className='text-xs font-mono truncate'>{aadharNo || "—"}</p>
																</div>

																{/* PAN */}
																<div className='space-y-1.5'>
																	<p className='text-xs text-muted-foreground'>PAN</p>
																	{panUrl ? (
																		<Button
																			variant='outline'
																			size='sm'
																			className='w-full'
																			asChild>
																			<a
																				href={panUrl}
																				target='_blank'
																				rel='noopener noreferrer'>
																				<ExternalLink className='mr-1.5 h-3.5 w-3.5' />
																				View
																			</a>
																		</Button>
																	) : (
																		<p className='text-xs text-muted-foreground px-2 py-1.5 bg-muted/30 rounded text-center'>
																			No doc
																		</p>
																	)}
																	<p className='text-xs font-mono truncate'>{panNo || "—"}</p>
																</div>
															</div>
														</div>

														{/* Bank Details Section */}
														<div className='space-y-1.5 pt-2 border-t border-border/50'>
															<p className='text-[10px] uppercase tracking-wide text-muted-foreground font-medium'>Bank Details</p>
															<div className='space-y-1 text-xs'>
																<div className='flex justify-between'>
																	<span className='text-muted-foreground'>Bank:</span>
																	<span className='font-medium truncate ml-2'>{emp.bank_name || "—"}</span>
																</div>
																<div className='flex justify-between'>
																	<span className='text-muted-foreground'>A/C:</span>
																	<span className='font-mono text-xs truncate ml-2'>{emp.bank_account_number || "—"}</span>
																</div>
																<div className='flex justify-between'>
																	<span className='text-muted-foreground'>IFSC:</span>
																	<span className='font-mono text-xs truncate ml-2'>{emp.bank_ifsc || "—"}</span>
																</div>
																{emp.bank_location && (
																	<div className='flex justify-between'>
																		<span className='text-muted-foreground'>Location:</span>
																		<span className='text-xs truncate ml-2'>{emp.bank_location}</span>
																	</div>
																)}
															</div>
														</div>
													</CardContent>
												</Card>
											);
										})}
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
