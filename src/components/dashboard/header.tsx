"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<Employee[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
		null
	);
	const searchRef = useRef<HTMLDivElement>(null);

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
				"id, first_name, last_name, email, designation, department, employee_id"
			)
			.eq("is_active", true)
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
			if (
				searchRef.current &&
				!searchRef.current.contains(e.target as Node)
			) {
				setIsDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelectEmployee = (emp: Employee) => {
		setSearchQuery("");
		setIsDropdownOpen(false);
		setSearchResults([]);

		const fullName = `${emp.first_name || ""} ${
			emp.last_name || ""
		}`.trim();

		if (employee?.role === "admin") {
			router.push(`/admin/employees?q=${encodeURIComponent(fullName)}`);
		} else if (employee?.role === "hr") {
			router.push(`/hr/employees?q=${encodeURIComponent(fullName)}`);
		} else {
			setSelectedEmployee(emp);
		}
	};

	return (
		<>
			<header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/80 bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
				<div className='flex min-w-0 flex-1 justify-between items-center gap-3'>
					{/* Logo on mobile (sidebar hidden); matches sidebar branding */}
					<div className='flex shrink-0 items-center gap-2 md:hidden'>
						<Image src="/maverix-logo.png" alt="MaveriX - Smart HRM" width={100} height={100} />
					</div>
					<div className='min-w-0'>
						<h1 className='text-lg font-semibold text-foreground truncate md:text-xl'>
							{title}
						</h1>
						{description && (
							<p className='text-sm text-muted-foreground'>
								{description}
							</p>
						)}
						{!description && employee && (
							<p className='text-xs text-muted-foreground truncate md:text-sm'>
								{getGreeting()}, {employee.first_name}
							</p>
						)}
					</div>
				</div>
				<div className='flex items-center gap-4'>
					<div className='relative hidden md:block' ref={searchRef}>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							placeholder={searchPlaceholder}
							className='w-64 bg-muted/50 pl-9'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onFocus={() => {
								if (searchQuery.trim().length >= 2)
									setIsDropdownOpen(true);
							}}
						/>
						{isDropdownOpen && (
							<div className='absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-popover shadow-lg'>
								{isSearching ? (
									<div className='flex items-center gap-2 p-4 text-sm text-muted-foreground'>
										<Loader2 className='h-4 w-4 animate-spin' />
										Searching...
									</div>
								) : searchResults.length === 0 ? (
									<div className='p-4 text-sm text-muted-foreground'>
										No employees found
									</div>
								) : (
									<div className='max-h-64 overflow-y-auto py-1'>
										{searchResults.map((emp) => {
											const name =
												`${emp.first_name || ""} ${
													emp.last_name || ""
												}`.trim() || emp.email;
											return (
												<button
													key={emp.id}
													type='button'
													className='flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/80'
													onClick={() =>
														handleSelectEmployee(
															emp
														)
													}>
													<Avatar className='h-8 w-8'>
														<AvatarFallback className='text-xs'>
															{(emp
																.first_name?.[0] ||
																"") +
																(emp
																	.last_name?.[0] ||
																	"") || "?"}
														</AvatarFallback>
													</Avatar>
													<div className='min-w-0 flex-1'>
														<p className='truncate font-medium'>
															{name}
														</p>
														<p className='truncate text-xs text-muted-foreground'>
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
					{actions}
				</div>
			</header>

			<Dialog
				open={!!selectedEmployee}
				onOpenChange={(open) => !open && setSelectedEmployee(null)}>
				<DialogContent className='max-w-sm'>
					<DialogHeader>
						<DialogTitle>Employee</DialogTitle>
					</DialogHeader>
					{selectedEmployee && (
						<div className='flex flex-col items-center gap-3 pt-2'>
							<Avatar className='h-16 w-16'>
								<AvatarFallback className='text-lg'>
									{(selectedEmployee.first_name?.[0] || "") +
										(selectedEmployee.last_name?.[0] ||
											"") || "?"}
								</AvatarFallback>
							</Avatar>
							<div className='text-center'>
								<p className='font-semibold'>
									{selectedEmployee.first_name}{" "}
									{selectedEmployee.last_name}
								</p>
								<p className='text-sm text-muted-foreground'>
									{selectedEmployee.designation || "—"}
								</p>
								<p className='text-sm text-muted-foreground'>
									{selectedEmployee.email}
								</p>
								{selectedEmployee.employee_id && (
									<p className='text-xs text-muted-foreground mt-1'>
										{selectedEmployee.employee_id}
									</p>
								)}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
