"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
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
				<DialogContent className="max-w-[400px] p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
					<DialogHeader className="sr-only">
						<DialogTitle>Employee Details</DialogTitle>
					</DialogHeader>
					{selectedEmployee && (
						<>
							<div className="relative h-28 bg-gradient-to-r from-primary/80 to-primary">
								<div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
									<Avatar className="h-24 w-24 ring-4 ring-background">
										{selectedEmployee.avatar_url ? (
											<AvatarImage
												src={selectedEmployee.avatar_url}
												alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
												className="object-cover"
											/>
										) : null}
										<AvatarFallback className="text-2xl bg-muted">
											{(selectedEmployee.first_name?.[0] || "") +
												(selectedEmployee.last_name?.[0] || "") || "?"}
										</AvatarFallback>
									</Avatar>
								</div>
							</div>
							<div className="pt-14 pb-6 px-6">
								<div className="text-center mb-6">
									<h3 className="text-xl font-semibold text-foreground">
										{selectedEmployee.first_name} {selectedEmployee.last_name}
									</h3>
									<p className="text-sm text-muted-foreground mt-1 capitalize">
										{selectedEmployee.designation || "No designation"}
									</p>
								</div>
								<div className="space-y-3 text-sm">
									<div>
										<p className="text-xs text-muted-foreground uppercase tracking-wide">
											Email
										</p>
										<p className="font-medium truncate">{selectedEmployee.email}</p>
									</div>
									{selectedEmployee.phone && (
										<div>
											<p className="text-xs text-muted-foreground uppercase tracking-wide">
												Phone
											</p>
											<p className="font-medium">{selectedEmployee.phone}</p>
										</div>
									)}
									{selectedEmployee.department && (
										<div>
											<p className="text-xs text-muted-foreground uppercase tracking-wide">
												Department
											</p>
											<p className="font-medium">{selectedEmployee.department}</p>
										</div>
									)}
								</div>
								<button
									type="button"
									onClick={() => {
										const q =
											`${selectedEmployee.first_name} ${selectedEmployee.last_name}`.trim();
										setSelectedEmployee(null);
										router.push(
											`/admin/employees?q=${encodeURIComponent(q)}`
										);
									}}
									className="mt-6 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
								>
									Open in Employees
								</button>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
