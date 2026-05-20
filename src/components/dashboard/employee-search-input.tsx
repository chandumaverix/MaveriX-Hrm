"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Mail, Phone, Calendar, IdCard, Building, ArrowUpRight, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EmployeeSearchInputProps {
	placeholder?: string;
	variant?: "pill" | "default";
	className?: string;
}

const formatDate = (dateStr?: string | null) => {
	if (!dateStr) return "N/A";
	try {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return dateStr;
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return dateStr;
	}
};

export function EmployeeSearchInput({
	placeholder = "Search employees...",
	variant = "default",
	className,
}: EmployeeSearchInputProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<Employee[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
		null
	);
	const searchRef = useRef<HTMLDivElement>(null);

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
				`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},employee_id.ilike.${term}`
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
			if (searchRef.current?.contains(e.target as Node)) return;
			setIsDropdownOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelectEmployee = (emp: Employee) => {
		setSearchQuery("");
		setIsDropdownOpen(false);
		setSearchResults([]);
		setSelectedEmployee(emp);
	};

	const goToAllResults = () => {
		const q = searchQuery.trim();
		if (!q) return;
		setSearchQuery("");
		setIsDropdownOpen(false);
		router.push(`/admin/employees?q=${encodeURIComponent(q)}`);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Escape") {
			setIsDropdownOpen(false);
			return;
		}
		if (e.key === "Enter" && searchQuery.trim().length >= 2) {
			e.preventDefault();
			if (searchResults.length > 0) {
				handleSelectEmployee(searchResults[0]);
			} else {
				goToAllResults();
			}
		}
	};

	const isPill = variant === "pill";

	return (
		<>
			<div ref={searchRef} className={cn("relative", className)}>
				<div
					className={cn(
						"flex items-center gap-2 transition-all",
						isPill
							? "bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 focus-within:border-blue-400 focus-within:bg-white"
							: "bg-muted/50 rounded-md px-3 py-2"
					)}
				>
					<Search
						className={cn(
							"shrink-0",
							isPill ? "w-4 h-4 text-slate-400" : "w-4 h-4 text-muted-foreground"
						)}
					/>
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onFocus={() => {
							if (searchQuery.trim().length >= 2) setIsDropdownOpen(true);
						}}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						aria-label={placeholder}
						aria-expanded={isDropdownOpen}
						aria-autocomplete="list"
						className={cn(
							"bg-transparent border-none outline-none w-full",
							isPill
								? "text-xs text-slate-700 placeholder-slate-400"
								: "text-sm text-foreground placeholder:text-muted-foreground"
						)}
					/>
				</div>

				{isDropdownOpen && (
					<div
						className={cn(
							"absolute left-0 top-full z-50 mt-1 rounded-xl border bg-white shadow-lg overflow-hidden",
							isPill ? "w-full border-slate-100" : "w-full border-border"
						)}
					>
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
										`${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
										emp.email;
									return (
										<button
											key={emp.id}
											type="button"
											className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs hover:bg-slate-50"
											onClick={() => handleSelectEmployee(emp)}
										>
											<Avatar className="h-8 w-8">
												{emp.avatar_url ? (
													<AvatarImage src={emp.avatar_url} alt={name} />
												) : null}
												<AvatarFallback className="text-[10px]">
													{(emp.first_name?.[0] || "") +
														(emp.last_name?.[0] || "") || "?"}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="truncate font-bold text-slate-800">
													{name}
												</p>
												<p className="truncate text-[10px] text-slate-400 font-medium">
													{emp.designation || emp.email}
												</p>
											</div>
										</button>
									);
								})}
							</div>
						)}
						{searchQuery.trim().length >= 2 && (
							<button
								type="button"
								onClick={goToAllResults}
								className="w-full border-t border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-blue-600 hover:bg-slate-50"
							>
								View all on Employees page
							</button>
						)}
					</div>
				)}
			</div>

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
