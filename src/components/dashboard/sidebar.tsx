"use client";

import React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "../../contexts/user-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
	LayoutDashboard,
	Users,
	Clock,
	Calendar,
	DollarSign,
	UserMinus,
	LogOut,
	UsersRound,
	User,
	Rss,
	Megaphone,
	Settings,
	UserPlus,
} from "lucide-react";
import Image from "next/image";
interface NavItem {
	label: string;
	href: string;
	icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
	{
		label: "Dashboard",
		href: "/admin/dashboard",
		icon: <LayoutDashboard className='h-5 w-5' />,
	},
	{
		label: "Feed",
		href: "/admin/feed",
		icon: <Rss className='h-5 w-5' />,
	},
	{
		label: "Announcements",
		href: "/admin/announcements",
		icon: <Megaphone className='h-5 w-5' />,
	},
	{
		label: "Employees",
		href: "/admin/employees",
		icon: <Users className='h-5 w-5' />,
	},
	{
		label: "Joining",
		href: "/admin/joining",
		icon: <UserPlus className='h-5 w-5' />,
	},
	{
		label: "Teams",
		href: "/admin/teams",
		icon: <UsersRound className='h-5 w-5' />,
	},
	{
		label: "Attendance",
		href: "/admin/attendance",
		icon: <Clock className='h-5 w-5' />,
	},
	{
		label: "Leave Management",
		href: "/admin/leave",
		icon: <Calendar className='h-5 w-5' />,
	},
	{
		label: "Finance",
		href: "/admin/finance",
		icon: <DollarSign className='h-5 w-5' />,
	},
	{
		label: "Resignations",
		href: "/admin/resignations",
		icon: <UserMinus className='h-5 w-5' />,
	},
	{
		label: "Settings",
		href: "/admin/settings",
		icon: <Settings className='h-5 w-5' />,
	},
	{
		label: "Profile",
		href: "/admin/profile",
		icon: <User className='h-5 w-5' />,
	},
];

// HR: Personalize (HR is also an employee - manage own profile, leaves, attendance, salary)
const hrPersonalizeItems: NavItem[] = [
	{
		label: "Profile",
		href: "/hr/profile",
		icon: <User className='h-5 w-5' />,
	},
	{
		label: "Leave Request",
		href: "/hr/my-leave",
		icon: <Calendar className='h-5 w-5' />,
	},
	{
		label: "Attendance",
		href: "/hr/my-attendance",
		icon: <Clock className='h-5 w-5' />,
	},
	{
		label: "Finance",
		href: "/hr/my-finance",
		icon: <DollarSign className='h-5 w-5' />,
	},
];

// HR: Management (org-level)
const hrManagementItems: NavItem[] = [
	{
		label: "Dashboard",
		href: "/hr/dashboard",
		icon: <LayoutDashboard className='h-5 w-5' />,
	},
	{
		label: "Feed",
		href: "/hr/feed",
		icon: <Rss className='h-5 w-5' />,
	},
	{
		label: "Announcements",
		href: "/hr/announcements",
		icon: <Megaphone className='h-5 w-5' />,
	},
	{
		label: "Employees",
		href: "/hr/employees",
		icon: <Users className='h-5 w-5' />,
	},
	{
		label: "Joining",
		href: "/hr/joining",
		icon: <UserPlus className='h-5 w-5' />,
	},
	{
		label: "Teams",
		href: "/hr/teams",
		icon: <UsersRound className='h-5 w-5' />,
	},
	{
		label: "Attendance",
		href: "/hr/attendance",
		icon: <Clock className='h-5 w-5' />,
	},
	{
		label: "Leave Management",
		href: "/hr/leave",
		icon: <Calendar className='h-5 w-5' />,
	},
	{
		label: "Finance",
		href: "/hr/finance",
		icon: <DollarSign className='h-5 w-5' />,
	},
	{
		label: "Resignations",
		href: "/hr/resignations",
		icon: <UserMinus className='h-5 w-5' />,
	},
	{
		label: "Settings",
		href: "/hr/settings",
		icon: <Settings className='h-5 w-5' />,
	},
];

const employeeNavItems: NavItem[] = [
	{
		label: "Dashboard",
		href: "/employee/dashboard",
		icon: <LayoutDashboard className='h-5 w-5' />,
	},
	{
		label: "Feed",
		href: "/employee/feed",
		icon: <Rss className='h-5 w-5' />,
	},
	{
		label: "My Attendance",
		href: "/employee/attendance",
		icon: <Clock className='h-5 w-5' />,
	},
	{
		label: "Leave Requests",
		href: "/employee/leave",
		icon: <Calendar className='h-5 w-5' />,
	},
	{
		label: "Finance",
		href: "/employee/finance",
		icon: <DollarSign className='h-5 w-5' />,
	},
	{
		label: "Resignation",
		href: "/employee/resignation",
		icon: <UserMinus className='h-5 w-5' />,
	},
	{
		label: "Profile",
		href: "/employee/profile",
		icon: <User className='h-5 w-5' />,
	},
];

/** All nav items for mobile (same as sidebar): 5 visible in frame, rest scroll right */
function getMobileNavItems(role: string | undefined): NavItem[] {
	if (role === "admin") return adminNavItems;
	if (role === "hr") return [...hrManagementItems, ...hrPersonalizeItems];
	if (role === "employee") return employeeNavItems;
	return [];
}

function NavLink({
	item,
	isActive,
	className,
}: {
	item: NavItem;
	isActive: boolean;
	className?: string;
}) {
	return (
		<Link
			href={item.href}
			className={cn(
				"flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-all relative",
				isActive
					? "bg-blue-50/70 text-blue-600 border-l-4 border-blue-600 rounded-r-xl"
					: "text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl",
				className
			)}>
			<span className={cn(isActive ? "text-blue-600" : "text-slate-400")}>{item.icon}</span>
			{item.label}
		</Link>
	);
}

export function MobileBottomNav() {
	const pathname = usePathname();
	const { employee, signOut } = useUser();
	const items = getMobileNavItems(employee?.role);

	if (items.length === 0) return null;

	return (
		<nav className='fixed bottom-8 left-5 right-5 z-40 max-w-lg mx-auto rounded-full border border-slate-100/80 bg-white/20 dark:bg-slate-900/90 backdrop-blur-sm dark:border-slate-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:hidden'>
			{/* Scrollable icon list */}
			<div className='flex items-center justify-between gap-1 overflow-x-auto overflow-y-hidden scrollbar-hide px-3 py-2 w-full'>
				{items.map((item) => {
					const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex shrink-0 w-18 h-11 items-center justify-center rounded-full transition-all duration-200",
								isActive
									? "bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
									: "text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
							)}>
							{item.icon}
						</Link>
					);
				})}
				<button
					onClick={signOut}
					className="flex shrink-0 w-11 h-11 items-center justify-center rounded-full transition-all duration-200 text-slate-400 hover:text-red-500 hover:bg-rose-50 dark:hover:bg-rose-950/20">
					<LogOut className='h-5 w-5' />
				</button>
			</div>
		</nav>
	);
}

export function DashboardSidebar() {
	const pathname = usePathname();
	const { employee, signOut } = useUser();

	const getNavItems = () => {
		if (employee?.role === "admin") return adminNavItems;
		if (employee?.role === "hr") return null; // HR uses sections
		return employeeNavItems;
	};

	const navItems = getNavItems();
	const initials = employee
		? `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""
			}`.toUpperCase()
		: "U";

	return (
		<aside 
			className='fixed left-0 z-40 hidden w-64 flex-col bg-white text-slate-800 border-r border-slate-100 md:flex shadow-[4px_0_24px_rgba(0,0,0,0.01)]'
			style={{
				top: "var(--anniversary-banner-height, 0px)",
				height: "calc(100vh - var(--anniversary-banner-height, 0px))"
			}}
		>
			{/* Logo */}
			<div className='flex items-center justify-between h-16 border-b border-slate-100 px-5'>
				<div className="flex items-center gap-2">
					<Image src="/maverix-logo.png" alt="MaveriX Logo" width={100} height={26} className="h-6 w-auto object-contain" />
				</div>
				<div>
					{employee?.role === "admin" && (
						<span className='text-[8px] bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full font-black uppercase tracking-wider'>Admin</span>
					)}
					{employee?.role === "hr" && (
						<span className='text-[8px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-black uppercase tracking-wider'>HR</span>
					)}
					{employee?.role === "employee" && (
						<span className='text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-black uppercase tracking-wider'>Staff</span>
					)}
				</div>
			</div>

			{/* Navigation */}
			<nav className='flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4 scrollbar-hide'>
				{employee?.role === "hr" ? (
					<>
						{hrManagementItems.map((item) => (
							<NavLink
								key={item.href}
								item={item}
								isActive={
									pathname === item.href ||
									pathname.startsWith(item.href + "/")
								}
							/>
						))}
						<div className='mb-1.5 mt-4 px-4 py-1 text-left'>
							<p className='text-[9px] font-black uppercase tracking-widest text-slate-400'>
								Personalize
							</p>
						</div>
						{hrPersonalizeItems.map((item) => (
							<NavLink
								key={item.href}
								item={item}
								isActive={
									pathname === item.href ||
									pathname.startsWith(item.href + "/")
								}
							/>
						))}
					</>
				) : (
					navItems?.map((item) => (
						<NavLink
							key={item.href}
							item={item}
							isActive={
								pathname === item.href ||
								pathname.startsWith(item.href + "/")
							}
						/>
					)) ?? null
				)}
			</nav>

			{/* User Menu */}
			<div className='flex items-center gap-2 border-t border-slate-100 p-3 bg-slate-50/50'>
				<div className='flex flex-1 items-center justify-start gap-2.5 px-1 py-1.5 text-slate-700 rounded-lg'>
					<Avatar className='h-8 w-8 border border-slate-200 shadow-sm'>
						{employee?.avatar_url ? (
							<AvatarImage
								className='object-cover'
								src={employee.avatar_url}
								alt={`${employee.first_name} ${employee.last_name}`}
							/>
						) : null}
						<AvatarFallback className='bg-blue-50 text-blue-600 font-extrabold text-xs'>
							{initials}
						</AvatarFallback>
					</Avatar>
					<div className='flex flex-1 flex-col items-start text-left min-w-0'>
						<span className='text-xs font-black text-slate-800 truncate w-full'>
							{employee?.first_name} {employee?.last_name}
						</span>
						<span className='text-[10px] capitalize text-slate-400 font-bold truncate w-full'>
							{employee?.role === "employee"
								? employee?.designation || "—"
								: employee?.role}
						</span>
					</div>
				</div>
				<Button
					variant='ghost'
					size='sm'
					className='cursor-pointer p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all'
					onClick={signOut}>
					<LogOut className='h-4 w-4' />
				</Button>
			</div>
		</aside>
	);
}
