"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	Search,
	Loader2,
	Calendar,
	ChevronDown,
	Users,
	Bell,
	Mail,
	Phone,
	IdCard,
	Building,
	User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "../../contexts/user-context";
import type { Employee } from "@/lib/types";
import Image from "next/image";

interface DashboardHeaderProps {
	title: string;
	description?: string;
	searchPlaceholder?: string;
	actions?: React.ReactNode;
}

export function DashboardHeader({
	title,
	description,
	searchPlaceholder = "Search employees...",
	actions,
}: DashboardHeaderProps) {
	const { employee } = useUser();
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<Employee[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
		null
	);
	const searchRef = useRef<HTMLDivElement>(null);
	const searchMobileRef = useRef<HTMLDivElement>(null);

	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good morning";
		if (hour < 18) return "Good afternoon";
		return "Good evening";
	};

	const searchEmployees = useCallback(async (q: string) => {
		const trimmed = q.trim();
		if (!trimmed || trimmed.length < 2) {
			setSearchResults([]);
			return;
		}
		setIsSearching(true);
		const supabase = createClient();
		const term = `%${trimmed}%`;
		const { data } = await supabase
			.from("employees")
			.select(
				"id, first_name, last_name, email, phone, designation, department, employee_id, role, avatar_url, date_of_birth, joining_date, address"
			)
			.eq("is_active", true)
			.neq("role", "admin")
			.or(
				`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`
			)
			.limit(8);
		setSearchResults((data as Employee[]) || []);
		setIsSearching(false);
	}, []);

	useEffect(() => {
		const t = setTimeout(() => searchEmployees(searchQuery), 300);
		return () => clearTimeout(t);
	}, [searchQuery, searchEmployees]);

	useEffect(() => {
		setIsDropdownOpen(searchQuery.trim().length >= 2);
	}, [searchQuery]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (searchRef.current && searchRef.current.contains(target)) return;
			if (searchMobileRef.current && searchMobileRef.current.contains(target)) return;
			setIsDropdownOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelectEmployee = (emp: Employee) => {
		setSearchQuery("");
		setIsDropdownOpen(false);
		setSearchResults([]);
		setSelectedEmployee(emp);
	};

	const initials = employee
		? `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""}`.toUpperCase()
		: "A";

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	return (
		<>
			<header 
				className="sticky z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-100 bg-white/95 dark:bg-slate-900/95 dark:border-slate-800/40 px-4 md:px-6 backdrop-blur shadow-[0_2px_12px_rgba(0,0,0,0.015)]"
				style={{
					top: "var(--anniversary-banner-height, 0px)"
				}}
			>
				<div className="flex min-w-0 flex-1 justify-between items-center gap-3">
					{/* Logo on mobile (sidebar hidden); matches sidebar branding */}
					<div className="flex shrink-0 items-center gap-2 md:hidden">
						<Image src="/maverix-logo.png" alt="MaveriX - Smart HRM" width={100} height={100} />
					</div>
					<div className="min-w-0">
						{title && (
							<h1 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white truncate">
								{title}
							</h1>
						)}
						{title && description && (
							<p className="text-[10px] text-slate-400 font-bold mt-0.5">
								{description}
							</p>
						)}
						{title && !description && employee && (
							<p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
								{getGreeting()}, {employee.first_name}
							</p>
						)}
					</div>
				</div>

				<div className="flex items-center gap-4">
					{/* Desktop Search */}
					<div className="relative hidden lg:block" ref={searchRef}>
						<Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
						<Input
							placeholder={searchPlaceholder}
							className="w-64 bg-slate-50 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800/40 rounded-xl pl-9 h-9 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:bg-white transition-all"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onFocus={() => {
								if (searchQuery.trim().length >= 2)
									setIsDropdownOpen(true);
							}}
						/>
						{isDropdownOpen && (
							<div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-slate-100 bg-white shadow-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
								{isSearching ? (
									<div className="flex items-center gap-2 p-4 text-xs text-slate-500">
										<Loader2 className="h-4 w-4 animate-spin" />
										Searching...
									</div>
								) : searchResults.length === 0 ? (
									<div className="p-4 text-xs text-slate-500">
										No employees found
									</div>
								) : (
									<div className="max-h-64 overflow-y-auto py-1">
										{searchResults.map((emp) => {
											const name =
												`${emp.first_name || ""} ${
													emp.last_name || ""
												}`.trim() || emp.email;
											return (
												<button
													key={emp.id}
													type="button"
													className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-850/60"
													onClick={() =>
														handleSelectEmployee(
															emp
														)
													}>
													<Avatar className="h-8 w-8">
														{emp.avatar_url ? (
															<AvatarImage src={emp.avatar_url} alt={name} />
														) : null}
														<AvatarFallback className="text-[10px]">
															{(emp
																.first_name?.[0] ||
																"") +
																(emp
																	.last_name?.[0] ||
																	"") || "?"}
														</AvatarFallback>
													</Avatar>
													<div className="min-w-0 flex-1">
														<p className="truncate font-bold text-slate-800 dark:text-slate-200">
															{name}
														</p>
														<p className="truncate text-[10px] text-slate-400 font-medium">
															{emp.designation ||
																emp.email}
														</p>
													</div>
												</button>
											);
										})}
									</div>
								)}
							</div>
						)}
					</div>

					{/* Date Dropdown */}
					<div className="hidden md:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition-colors">
						<Calendar className="w-3.5 h-3.5 text-slate-400" />
						<span>{new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
						<ChevronDown className="w-3 h-3 text-slate-400" />
					</div>

					{/* Vertical Line */}
					<div className="w-[1px] h-6 bg-slate-100 dark:bg-slate-800"></div>

					{/* User Card */}
					<div className="flex items-center gap-2.5 pl-1">
						<Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800 shadow-sm">
							{employee?.avatar_url && (
								<AvatarImage src={employee.avatar_url} className="object-cover" />
							)}
							<AvatarFallback className="bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-extrabold text-xs">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div className="hidden sm:flex flex-col items-start text-left min-w-0">
							<span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-none">
								{employee?.first_name} {employee?.last_name}
							</span>
							<span className="text-[9px] text-slate-400 font-black uppercase tracking-wider mt-0.5">
								{employee?.role}
							</span>
						</div>
					</div>

					{actions}
				</div>
			</header>

			{/* Mobile Search input wrapper */}
			<div className="px-4 pt-3 md:hidden" ref={searchMobileRef}>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
					<Input
						placeholder={searchPlaceholder}
						className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-xl pl-9 h-9 text-xs text-slate-700 dark:text-slate-250 placeholder-slate-400 focus:bg-white transition-all"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onFocus={() => {
							if (searchQuery.trim().length >= 2) setIsDropdownOpen(true);
						}}
					/>
					{isDropdownOpen && (
						<div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-slate-100 bg-white shadow-lg overflow-hidden dark:bg-slate-900 dark:border-slate-800">
							{isSearching ? (
								<div className="flex items-center gap-2 p-4 text-xs text-slate-500">
									<Loader2 className="h-4 w-4 animate-spin" />
									Searching...
								</div>
							) : searchResults.length === 0 ? (
								<div className="p-4 text-xs text-slate-500">
									No employees found
								</div>
							) : (
								<div className="max-h-64 overflow-y-auto py-1">
									{searchResults.map((emp) => {
										const name =
											`${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.email;
										return (
											<button
												key={emp.id}
												type="button"
												className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-850/60"
												onClick={() => handleSelectEmployee(emp)}
											>
												<Avatar className="h-8 w-8">
													{emp.avatar_url ? <AvatarImage src={emp.avatar_url} alt={name} /> : null}
													<AvatarFallback className="text-[10px]">
														{(emp.first_name?.[0] || "") + (emp.last_name?.[0] || "") || "?"}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0 flex-1">
													<p className="truncate font-bold text-slate-800 dark:text-slate-200">{name}</p>
													<p className="truncate text-[10px] text-slate-400 font-medium">
														{emp.designation || emp.email}
													</p>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Redesigned Premium Employee Detail Dialog */}
			<Dialog
				open={!!selectedEmployee}
				onOpenChange={(open) => !open && setSelectedEmployee(null)}
			>
				<DialogContent className="max-w-[420px] p-0 overflow-hidden max-h-[95vh] rounded-2xl border-none shadow-2xl bg-white dark:bg-slate-900">
					<DialogHeader className="sr-only">
						<DialogTitle>Employee Details</DialogTitle>
					</DialogHeader>
					{selectedEmployee && (
						<>
							<div className="relative h-32 bg-gradient-to-tr from-slate-900 via-primary to-indigo-950">
								{/* Premium decorative shapes */}
								<div className="absolute inset-0 overflow-hidden">
									<div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl -mr-8 -mt-8" />
									<div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/20 rounded-full blur-lg -ml-8 -mb-8" />
								</div>
								<div className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-10">
									<Avatar className="h-28 w-28 ring-4 ring-white dark:ring-slate-900 shadow-xl transition-transform duration-300 hover:scale-105">
										{selectedEmployee.avatar_url ? (
											<AvatarImage
												src={selectedEmployee.avatar_url}
												alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
												className="object-cover"
											/>
										) : null}
										<AvatarFallback className="text-3xl bg-slate-100 dark:bg-slate-800 font-semibold text-primary">
											{(selectedEmployee.first_name?.[0] || "") +
												(selectedEmployee.last_name?.[0] || "") || "?"}
										</AvatarFallback>
									</Avatar>
								</div>
							</div>
							<div className="pt-16 pb-6 px-6">
								<div className="text-center mb-6">
									<h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
										{selectedEmployee.first_name} {selectedEmployee.last_name}
									</h3>
									<div className="flex flex-wrap items-center justify-center gap-2 mt-2">
										<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
											<User className="w-3 h-3" />
											{selectedEmployee.designation || "No Designation"}
										</span>
										{selectedEmployee.department && (
											<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 capitalize">
												<Building className="w-3 h-3" />
												{selectedEmployee.department}
											</span>
										)}
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3 mb-6">
									{/* Employee ID */}
									<div className="flex flex-col p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800/40 dark:bg-slate-950/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-950">
										<div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
											<IdCard className="w-3.5 h-3.5 shrink-0 text-primary/70 dark:text-primary-foreground/75" />
											<span className="text-[10px] font-bold uppercase tracking-wider">Emp ID</span>
										</div>
										<p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
											{selectedEmployee.employee_id || "N/A"}
										</p>
									</div>

									{/* DOB */}
									<div className="flex flex-col p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800/40 dark:bg-slate-950/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-950">
										<div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
											<Calendar className="w-3.5 h-3.5 shrink-0 text-primary/70 dark:text-primary-foreground/75" />
											<span className="text-[10px] font-bold uppercase tracking-wider">DOB</span>
										</div>
										<p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
											{formatDate(selectedEmployee.date_of_birth)}
										</p>
									</div>

									{/* Phone */}
									<div className="flex flex-col p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800/40 dark:bg-slate-950/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-950 col-span-1">
										<div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
											<Phone className="w-3.5 h-3.5 shrink-0 text-primary/70 dark:text-primary-foreground/75" />
											<span className="text-[10px] font-bold uppercase tracking-wider">Phone</span>
										</div>
										<p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={selectedEmployee.phone || ""}>
											{selectedEmployee.phone ? (
												<a href={`tel:${selectedEmployee.phone}`} className="hover:text-primary hover:underline transition-colors">
													{selectedEmployee.phone}
												</a>
											) : (
												"N/A"
											)}
										</p>
									</div>

									{/* Email */}
									<div className="flex flex-col p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800/40 dark:bg-slate-950/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-950 col-span-1">
										<div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
											<Mail className="w-3.5 h-3.5 shrink-0 text-primary/70 dark:text-primary-foreground/75" />
											<span className="text-[10px] font-bold uppercase tracking-wider">Email</span>
										</div>
										<p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={selectedEmployee.email}>
											<a href={`mailto:${selectedEmployee.email}`} className="hover:text-primary hover:underline transition-colors">
												{selectedEmployee.email}
											</a>
										</p>
									</div>
								</div>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
