"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	ArrowRight,
	Users,
	Clock,
	Shield,
	Zap,
	TrendingUp,
	BarChart2,
	CheckCircle2,
	Building2,
	Star,
	Rocket,
	Award,
	Globe,
	Lock,
	Cloud,
	Briefcase,
	Target,
	PieChart,
	FileText,
	Settings,
	UserCheck,
	DollarSign,
	Sparkles,
	ChevronDown,
	Check,
	Play,
	Plus,
	TrendingDown,
	Info,
	MessageSquare,
	Heart,
	UserPlus,
	MapPin,
	Calendar,
	Share2,
	FileSpreadsheet,
	HelpCircle
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/contexts/user-context";

export default function LandingPage() {
	const { user, employee, isLoading } = useUser();

	// Section Scroll Handler
	const scrollToSection = (id: string) => {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: "smooth" });
		}
	};

	// 1. Navigation / Session Handling
	const dashboardRoute = useMemo(() => {
		if (!user || !employee) return "/auth/login";
		if (employee.role === "admin") return "/admin/dashboard";
		if (employee.role === "hr") return "/hr/dashboard";
		return "/employee/dashboard";
	}, [user, employee]);

	// 2. HERO: Interactive Dashboard Mockup Widget States
	const [heroTab, setHeroTab] = useState<"overview" | "clock" | "feed">("overview");
	const [clockedIn, setClockedIn] = useState(false);
	const [clockTime, setClockTime] = useState("");
	const [attendanceRate, setAttendanceRate] = useState(94);
	const [presentCount, setPresentCount] = useState(45);
	const [feedItems, setFeedItems] = useState([
		{ id: 1, text: "Sarah Chen (Developer) clocked in", time: "09:00 AM", type: "success" },
		{ id: 2, text: "David K. applied for Casual Leave", time: "09:12 AM", type: "pending" },
		{ id: 3, text: "Admin approved April Payroll slips", time: "Yesterday", type: "info" },
	]);

	const handleClockAction = () => {
		if (!clockedIn) {
			const now = new Date();
			const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			setClockedIn(true);
			setClockTime(timeStr);
			setPresentCount(prev => prev + 1);
			setAttendanceRate(96);
			setFeedItems(prev => [
				{ id: Date.now(), text: "You clocked in successfully!", time: timeStr, type: "success" },
				...prev
			]);
		} else {
			setClockedIn(false);
			setClockTime("");
			setPresentCount(prev => prev - 1);
			setAttendanceRate(94);
			setFeedItems(prev => [
				{ id: Date.now(), text: "You clocked out successfully!", time: "Just Now", type: "info" },
				...prev
			]);
		}
	};

	// 3. CORE MODULE EXPLORER (The 8 codebase features)
	const [activeModule, setActiveModule] = useState<
		"directory" | "attendance" | "leave" | "payroll" | "teams" | "social" | "bulk" | "exit"
	>("directory");

	// State for simulated onboarding email input
	const [bulkEmail, setBulkEmail] = useState("");
	const [inviteTokens, setInviteTokens] = useState<string[]>([]);
	const handleGenerateTokens = (e: React.FormEvent) => {
		e.preventDefault();
		if (!bulkEmail) return;
		const rand = Math.floor(1000 + Math.random() * 9000);
		setInviteTokens(prev => [`MAVERIX-INV-${rand}-${bulkEmail.split('@')[0].toUpperCase()}`, ...prev]);
		setBulkEmail("");
	};

	// State for simulated resignation checklist
	const [resignChecked, setResignChecked] = useState({
		laptop: true,
		access: false,
		email: false
	});

	const moduleDetails = {
		directory: {
			title: "Secure Employee Directory & ID Vault",
			tag: "Profiles & Credentials",
			color: "from-blue-600 to-cyan-500",
			badgeColor: "bg-blue-50 text-blue-700 border-blue-100",
			icon: Users,
			desc: "Centralize your organization's core profiles. Track designated roles, bank transfer info, joining parameters, and keep Aadhaar & PAN document uploads securely indexed.",
			bullets: [
				"Role-based permission sets (Admins, HRs, Employees)",
				"Dynamic searches by designation or business departments",
				"Digital lockers for key identity verifications"
			],
			mockUi: (
				<div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-lg relative overflow-hidden">
					{/* Textures */}
					<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] opacity-20 pointer-events-none"></div>

					<div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 relative z-10">
						<div className="flex items-center gap-2">
							<Users className="w-4 h-4 text-indigo-500" />
							<span className="text-xs font-black text-slate-700 uppercase tracking-wider">Employee Workspace</span>
						</div>
						<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">48 Staff</span>
					</div>

					{/* Search */}
					<div className="bg-slate-50/80 rounded-xl px-3 py-2 text-[11px] text-slate-400 mb-4 flex items-center gap-2 border border-slate-100 relative z-10">
						<span>🔍 Filter designation, department...</span>
					</div>

					{/* Simulated list */}
					<div className="space-y-2.5 relative z-10">
						{[
							{ name: "Sarah Chen", role: "Lead Engineer", dept: "Tech", color: "from-indigo-500 to-blue-500", label: "Admin" },
							{ name: "Rahul Verma", role: "HR Specialist", dept: "People", color: "from-purple-500 to-pink-500", label: "HR" },
							{ name: "Emily Watson", role: "UI Designer", dept: "Creative", color: "from-amber-500 to-orange-500", label: "Employee" }
						].map((emp, idx) => (
							<div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100/50 hover:bg-slate-50 hover:border-slate-200 transition-all">
								<div className="flex items-center gap-2.5">
									<div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${emp.color} text-white flex items-center justify-center font-bold text-xs shadow-md`}>
										{emp.name.split(' ').map(n => n[0]).join('')}
									</div>
									<div className="text-left">
										<h4 className="text-xs font-bold text-slate-800">{emp.name}</h4>
										<p className="text-[10px] text-slate-400">{emp.role} • <span className="font-semibold text-slate-500">{emp.dept}</span></p>
									</div>
								</div>
								<span className="text-[8px] uppercase tracking-wider font-extrabold bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md">
									{emp.label}
								</span>
							</div>
						))}
					</div>
				</div>
			)
		},
		attendance: {
			title: "IP-Verified Clock-In & WFH Tracker",
			tag: "Timesheet Compliance",
			color: "from-violet-600 to-indigo-500",
			badgeColor: "bg-violet-50 text-violet-700 border-violet-100",
			icon: Clock,
			desc: "Manage flexible models easily. Employees clock in via a single click with instant IP detection, customizable office/WFH tags, and automated daily timesheet logs.",
			bullets: [
				"IP Address logging to avoid timesheet manipulation",
				"WFH / Office explicit tag choices for hybrid flexibility",
				"Automatic clock-out configurations after shift endings"
			],
			mockUi: (
				<div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-lg relative overflow-hidden">
					<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] opacity-20 pointer-events-none"></div>

					<div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 relative z-10">
						<div className="flex items-center gap-2">
							<Clock className="w-4 h-4 text-violet-500" />
							<span className="text-xs font-black text-slate-700 uppercase tracking-wider">Clock Status</span>
						</div>
						<span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold px-2 py-0.5 rounded-full uppercase">On Time</span>
					</div>

					<div className="bg-slate-50/80 rounded-2xl p-4 text-center border border-slate-100/50 mb-3 relative z-10">
						<div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Device Coordinates</div>
						<div className="text-base font-extrabold text-slate-800 mt-1">192.168.1.48</div>
						<div className="text-[10px] text-indigo-600 font-bold mt-1 bg-indigo-50/50 inline-block px-2.5 py-0.5 rounded-md border border-indigo-100">
							📍 Office Location Verified
						</div>
					</div>

					{/* Office / WFH switcher */}
					<div className="grid grid-cols-2 gap-2 text-xs font-extrabold mb-3 relative z-10">
						<div className="p-2.5 rounded-xl border-2 border-indigo-500 bg-indigo-50/30 text-indigo-700 flex items-center justify-center gap-1.5 cursor-pointer">
							🏢 Office
						</div>
						<div className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-300">
							🏡 WFH
						</div>
					</div>

					<button className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md transition-colors relative z-10">
						Clock In (09:00 AM)
					</button>
				</div>
			)
		},
		leave: {
			title: "Comprehensive Leave Allocation Engine",
			tag: "Absence Auditing",
			color: "from-pink-600 to-rose-500",
			badgeColor: "bg-pink-50 text-pink-700 border-pink-100",
			icon: Calendar,
			desc: "Define custom leave policies (Casual, Sick, Maternity). Employees check real-time balances, submit leave requests, and attach medical certificate documents easily.",
			bullets: [
				"Manager workflows for instant approvals & audit logs",
				"Upload system for medical notes and document verifications",
				"Automatic balance carry-overs based on custom policies"
			],
			mockUi: (
				<div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-lg relative overflow-hidden">
					<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] opacity-20 pointer-events-none"></div>

					<div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 relative z-10">
						<div className="flex items-center gap-2">
							<Calendar className="w-4 h-4 text-pink-500" />
							<span className="text-xs font-black text-slate-700 uppercase tracking-wider">Leave Balances</span>
						</div>
						<span className="text-[10px] text-slate-400 font-bold">CY 2026</span>
					</div>

					<div className="space-y-3 relative z-10">
						{[
							{ label: "Casual Leave", left: 8, total: 12, color: "bg-indigo-500" },
							{ label: "Sick Leave", left: 6, total: 10, color: "bg-pink-500" }
						].map((leave, i) => (
							<div key={i} className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
								<div className="flex justify-between text-xs font-bold mb-1.5">
									<span className="text-slate-700">{leave.label}</span>
									<span className="text-indigo-600">{leave.left} / {leave.total} Left</span>
								</div>
								<div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
									<div className={`${leave.color} h-full`} style={{ width: `${(leave.left / leave.total) * 100}%` }}></div>
								</div>
							</div>
						))}

						{/* Document Upload Status */}
						<div className="p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between text-[10px]">
							<span className="text-slate-400 font-bold">📄 medical_receipt.pdf</span>
							<span className="text-green-600 font-extrabold">Attached</span>
						</div>
					</div>
				</div>
			)
		},
		payroll: {
			title: "Smart Payroll Processing & Salary Slip Compiler",
			tag: "Wages & Auditing",
			color: "from-emerald-600 to-teal-500",
			badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
			icon: DollarSign,
			desc: "Fully automate calculations. Base wages, unpaid absences, custom bonus structures, and late clock-in fines are automatically reconciled into a PDF salary slip.",
			bullets: [
				"Rule compliance: late clock-ins deduct fine percentages",
				"Instant official PDF payslip downloads",
				"Detailed financial statements for company audit filings"
			],
			mockUi: (
				<div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-lg relative overflow-hidden">
					<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] opacity-20 pointer-events-none"></div>

					<div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 relative z-10">
						<div className="flex items-center gap-2">
							<DollarSign className="w-4 h-4 text-emerald-500" />
							<span className="text-xs font-black text-slate-700 uppercase tracking-wider">Compensation Engine</span>
						</div>
						<span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-md">Reconciled</span>
					</div>

					<div className="space-y-2 mb-4 relative z-10">
						{[
							{ label: "Base Salary", val: "$5,500.00" },
							{ label: "Bonus Allocation", val: "+$350.00", style: "text-green-600 font-bold" },
							{ label: "Late Day Fine Deductions", val: "-$50.00", style: "text-rose-500 font-bold" }
						].map((item, idx) => (
							<div key={idx} className="flex justify-between text-xs p-2 bg-slate-50/50 rounded-lg border border-slate-100/50">
								<span className="text-slate-400 font-bold">{item.label}</span>
								<span className={item.style || "text-slate-800 font-bold"}>{item.val}</span>
							</div>
						))}
						<div className="flex justify-between text-xs p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
							<span className="font-extrabold text-indigo-900">Total Net Payout</span>
							<span className="font-black text-indigo-900">$5,800.00</span>
						</div>
					</div>

					<button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition-all relative z-10 shadow-sm flex items-center justify-center gap-1.5">
						<FileText className="w-3.5 h-3.5" /> Compiler Slip PDF
					</button>
				</div>
			)
		},
		teams: {
			title: "Reporting Structures & Dynamic Team Builders",
			tag: "Structure Hierarchy",
			color: "from-amber-600 to-orange-500",
			badgeColor: "bg-amber-50 text-amber-700 border-amber-100",
			icon: Building2,
			desc: "Map your workforce layout. Define departments, build reporting groups, assign team leaders, and keep corporate hierarchy directories organized and synchronized.",
			bullets: [
				"Group delegation (Product Teams, QA Labs, HR Wings)",
				"Dynamic leader assignments and permissions propagation",
				"Instant structural overviews of reporting personnel"
			],
			mockUi: (
				<div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-lg relative overflow-hidden">
					<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] opacity-20 pointer-events-none"></div>

					<div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 relative z-10">
						<div className="flex items-center gap-2">
							<Building2 className="w-4 h-4 text-amber-500" />
							<span className="text-xs font-black text-slate-700 uppercase tracking-wider">Teams Org-Chart</span>
						</div>
						<span className="text-[10px] text-slate-400 font-bold">Engineering</span>
					</div>

					{/* Org structural tree */}
					<div className="space-y-3 text-center relative z-10">
						<div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl inline-block mx-auto min-w-[140px]">
							<span className="text-[8px] uppercase tracking-wider font-extrabold text-amber-600 block">Team Lead</span>
							<span className="text-xs font-bold text-slate-800">Sarah Chen</span>
						</div>

						{/* Connective branch lines */}
						<div className="w-[2px] h-4 bg-slate-200 mx-auto"></div>

						<div className="grid grid-cols-2 gap-2">
							<div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
								<span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 block">Developer</span>
								<span className="text-xs font-bold text-slate-800">David K.</span>
							</div>
							<div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
								<span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 block">Developer</span>
								<span className="text-xs font-bold text-slate-800">Alan Turing</span>
							</div>
						</div>
					</div>
				</div>
			)
		},
		social: {
			title: "Interactive Social Feed & @Mentions",
			tag: "Company Collaboration",
			color: "from-rose-600 to-pink-500",
			badgeColor: "bg-rose-50 text-rose-700 border-rose-100",
			icon: MessageSquare,
			desc: "Keep team spirits high. A collaborative forum feed enables staff to post, share updates, tag colleagues, and automatically receive work anniversary and birthday announcements.",
			bullets: [
				"Interactive post listings with Likes & comments",
				"Anniversary alerts directly at the top of employee screens",
				"Instant announcements pinning for company-wide notifications"
			],
			mockUi: (
				<div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-lg relative overflow-hidden">
					<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] opacity-20 pointer-events-none"></div>

					{/* Top Anniversary Bar */}
					<div className="bg-gradient-to-r from-amber-500 to-pink-500 text-white rounded-xl p-2.5 text-center text-[10px] font-bold mb-4 relative z-10 flex items-center justify-center gap-1.5 shadow-sm">
						🎉 Happy 2-Year Work Anniversary, Sarah Chen! 🌟
					</div>

					<div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 relative z-10 text-left">
						<div className="flex items-center gap-2 mb-2">
							<div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">DK</div>
							<div>
								<h6 className="text-[10px] font-bold text-slate-700 leading-none">David K.</h6>
								<span className="text-[8px] text-slate-400">10 mins ago</span>
							</div>
						</div>
						<p className="text-[10px] text-slate-600 leading-relaxed">
							Thrilled to welcome <span className="text-indigo-600 font-bold">@AlanTuring</span> to our Engineering wing! Can't wait to build together! 🚀
						</p>
						<div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-slate-200/60 text-[9px] text-slate-400 font-bold">
							<span className="flex items-center gap-1 hover:text-rose-500 cursor-pointer transition-colors"><Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> 12 Likes</span>
							<span className="flex items-center gap-1 hover:text-indigo-500 cursor-pointer transition-colors"><MessageSquare className="w-3.5 h-3.5" /> 2 Comments</span>
						</div>
					</div>
				</div>
			)
		},
		bulk: {
			title: "Automated Onboarding & Bulk Inviting",
			tag: "Fast Scaling",
			color: "from-sky-600 to-blue-500",
			badgeColor: "bg-sky-50 text-sky-700 border-sky-100",
			icon: UserPlus,
			desc: "Scale your organization with minimal resistance. Generate bulk invite links or list tokens that allow hundreds of new employee profiles to be generated securely.",
			bullets: [
				"Bulk email onboarding invitations",
				"Instant login redirection and secure workspace recovery tokens",
				"Configurable designated onboarding checkpoints"
			],
			mockUi: (
				<div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-lg relative overflow-hidden">
					<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] opacity-20 pointer-events-none"></div>

					<div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 relative z-10">
						<div className="flex items-center gap-2">
							<UserPlus className="w-4 h-4 text-sky-500" />
							<span className="text-xs font-black text-slate-700 uppercase tracking-wider">Bulk Invite</span>
						</div>
						<span className="text-[10px] text-slate-400 font-semibold">Fast Sync</span>
					</div>

					<form onSubmit={handleGenerateTokens} className="space-y-3 mb-4 relative z-10">
						<div className="flex gap-2">
							<input
								type="email"
								placeholder="Enter staff email..."
								value={bulkEmail}
								onChange={(e) => setBulkEmail(e.target.value)}
								className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-sky-500 focus:bg-white transition-all flex-grow"
							/>
							<button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] px-3.5 py-2 rounded-xl shadow-md transition-colors flex items-center justify-center">
								<Plus className="w-3.5 h-3.5" /> Invite
							</button>
						</div>
					</form>

					<div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1 text-left relative z-10 scrollbar-hide">
						{inviteTokens.length === 0 ? (
							<p className="text-[10px] text-slate-400 italic text-center py-4">Onboard employees instantly by inputting email above.</p>
						) : (
							inviteTokens.map((tok, i) => (
								<div key={i} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-100 rounded-lg text-[9px]">
									<span className="text-slate-700 font-bold truncate max-w-[130px]">{tok}</span>
									<span className="text-indigo-600 font-extrabold uppercase bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">Pending</span>
								</div>
							))
						)}
					</div>
				</div>
			)
		},
		exit: {
			title: "Exit Procedures & Clearance Protocols",
			tag: "Resignations & Offboarding",
			color: "from-slate-700 to-slate-900",
			badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
			icon: Shield,
			desc: "Manage offboarding professionally. The custom resignation log allows employees to log exit reviews, auto-calculates final working dates, and guides HRs through asset clearance handshakes.",
			bullets: [
				"Resignation logs directly on employee dashboards",
				"Clearance checks for corporate assets (Laptops, Access Cards, IDs)",
				"Automatic system disabling once offboarding is complete"
			],
			mockUi: (
				<div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-lg relative overflow-hidden">
					<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] opacity-20 pointer-events-none"></div>

					<div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 relative z-10">
						<div className="flex items-center gap-2">
							<Shield className="w-4 h-4 text-slate-700" />
							<span className="text-xs font-black text-slate-700 uppercase tracking-wider">Exit Clearances</span>
						</div>
						<span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 font-extrabold px-2 py-0.5 rounded-full uppercase">Processing</span>
					</div>

					<div className="space-y-2 text-left relative z-10">
						{[
							{ key: "laptop", label: "💻 Corporate Macbook Return" },
							{ key: "access", label: "🔑 Security Access Keys Return" },
							{ key: "email", label: "📧 Corporate G-Suite Disable" }
						].map((item) => (
							<div
								key={item.key}
								onClick={() => setResignChecked(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof resignChecked] }))}
								className="flex items-center gap-2.5 p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
							>
								<div className={`w-4 h-4 rounded-md border flex items-center justify-center ${resignChecked[item.key as keyof typeof resignChecked] ? "bg-slate-800 border-slate-800 text-white" : "border-slate-300 bg-white"
									}`}>
									{resignChecked[item.key as keyof typeof resignChecked] && <Check className="w-3 h-3" />}
								</div>
								<span className={resignChecked[item.key as keyof typeof resignChecked] ? "line-through text-slate-400" : "text-slate-700"}>
									{item.label}
								</span>
							</div>
						))}
					</div>
				</div>
			)
		}
	};

	// 4. ROI CALCULATOR STATE
	const [teamSize, setTeamSize] = useState(25);
	const calculatedSavings = useMemo(() => {
		const hoursWeekly = Math.round(teamSize * 0.4);
		const cashSaved = teamSize * 15;
		return {
			hoursWeekly,
			cashSaved: cashSaved.toLocaleString()
		};
	}, [teamSize]);

	// 5. FAQ ACCORDION STATES
	const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
	const faqs = [
		{
			q: "Is MaveriX HRM simple to set up for my organization?",
			a: "Yes! Setup takes less than 10 minutes. You can invite your team instantly, allocate leave quotas, configure working hours, and begin tracking time immediately on our modern dashboard."
		},
		{
			q: "How does the self-service portal work for employees?",
			a: "Every staff member gets a customized, clean dashboard to log time, mark WFH days, review monthly leave balances, check announcements, and download salary payslips without contacting HR."
		},
		{
			q: "Can I customize the leave regulations and late arrival policies?",
			a: "Absolutely. Admin panels allow custom leave creation (Casual, Sick, Earned) and granular late policies where base wages are automatically penalized after a set number of late days."
		},
		{
			q: "Is our employee data secure?",
			a: "Security is our highest priority. All data, attachments, and logs are housed in industrial-grade cloud storage backed by secure authentication protocols, meaning only authorized stakeholders gain access."
		},
		{
			q: "Does MaveriX support bulk reports and data export?",
			a: "Yes! Admins and HR specialists can easily generate time tracking reports, employee lists, and monthly financial summaries—all exportable to standard spreadsheet files."
		}
	];

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[#fafbfc] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">

			{/* Modern Background Grids and Blobs */}
			<div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
				{/* Modern dot texture grid */}
				<div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-40"></div>

				{/* Diagonal mesh design highlight lines */}
				<div className="absolute top-[15%] left-0 right-0 h-[1px] bg-slate-200/50 skew-y-[-6deg]"></div>
				<div className="absolute top-[65%] left-0 right-0 h-[1px] bg-slate-200/50 skew-y-[6deg]"></div>

				{/* Large Ambient Mesh Gradients */}
				<div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-purple-300/20 to-indigo-300/20 rounded-full blur-[100px] opacity-70 animate-pulse" style={{ animationDuration: '8s' }}></div>
				<div className="absolute top-[40%] right-[-10%] w-[45%] h-[45%] bg-gradient-to-br from-pink-300/10 to-violet-300/20 rounded-full blur-[120px] opacity-60"></div>
				<div className="absolute bottom-[-10%] left-[15%] w-[40%] h-[40%] bg-gradient-to-tr from-blue-300/10 to-indigo-300/20 rounded-full blur-[100px] opacity-50"></div>
			</div>

			{/* 1. STICKY GLASSMORPHIC NAVIGATION BAR */}
			<header className="sticky top-0 z-50">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
					{/* Logo */}
					<Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
						<Image src="/maverix-logo.png" alt="MaveriX Logo" width={130} height={36} className="h-9 w-auto object-contain" />
					</Link>

					{/* Navigation Links */}
					<nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
						<button onClick={() => scrollToSection("features")} className="hover:text-indigo-600 transition-colors cursor-pointer">Core Modules</button>
						<button onClick={() => scrollToSection("calculator")} className="hover:text-indigo-600 transition-colors cursor-pointer">ROI Calculator</button>
						<button onClick={() => scrollToSection("benefits")} className="hover:text-indigo-600 transition-colors cursor-pointer">Why MaveriX</button>
						<button onClick={() => scrollToSection("faq")} className="hover:text-indigo-600 transition-colors cursor-pointer">FAQs</button>
					</nav>

					{/* Session-Aware CTA Buttons */}
					<div className="flex items-center gap-4">
						{isLoading ? (
							<div className="w-24 h-9 bg-slate-100 rounded-lg animate-pulse"></div>
						) : user ? (
							<Link href={dashboardRoute}>
								<motion.button
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.98 }}
									className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 group cursor-pointer"
								>
									Go to Dashboard
									<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
								</motion.button>
							</Link>
						) : (
							<>
								<Link href="/auth/login" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors px-3 py-2">
									Sign In
								</Link>
								<Link href="/auth/login">
									<motion.button
										whileHover={{ scale: 1.03 }}
										whileTap={{ scale: 0.98 }}
										className="px-5 py-2.5 rounded-xl text-sm font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
									>
										Get Started <Rocket className="w-4 h-4 text-indigo-200" />
									</motion.button>
								</Link>
							</>
						)}
					</div>
				</div>
			</header>

			{/* 2. SPLENDID HERO SECTION */}
			<section className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-20 md:py-24 grid lg:grid-cols-12 gap-12 items-center">

				{/* Floating Accent Icons */}
				<div className="absolute top-1/4 left-5 w-2 h-2 rounded-full bg-violet-400 animate-ping"></div>
				<div className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full bg-pink-400 animate-pulse"></div>

				{/* Copywriting Left Column */}
				<div className="lg:col-span-7 flex flex-col items-start text-left relative z-20">

					{/* Sparkling Badge */}
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4.5 py-1.5 mb-6"
					>
						<Sparkles className="w-4 h-4 text-indigo-600 animate-spin" style={{ animationDuration: '4s' }} />
						<span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
							MaveriX • Smart HRM
						</span>
					</motion.div>

					{/* Title Heading */}
					<motion.h1
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.1 }}
						className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-slate-900"
					>
						Re-invent Workforce Control with{" "}
						<span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
							MaveriX
						</span>
					</motion.h1>

					<motion.p
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl"
					>
						An elegant, fully-featured Human Resource Management (HRM) platform built with fine tactile textures. From real-time timesheets and compliance audits to automated payslips, dynamic teams, and custom social communication streams—all housed inside one secure system.
					</motion.p>

					{/* Action Buttons */}
					<motion.div
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.3 }}
						className="mt-8 flex flex-wrap gap-4 w-full sm:w-auto"
					>
						<Link href="/auth/login" className="w-full sm:w-auto">
							<motion.button
								whileHover={{ scale: 1.04, boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)" }}
								whileTap={{ scale: 0.98 }}
								className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 transition-all cursor-pointer"
							>
								<Rocket className="w-5 h-5 text-indigo-100" />
								Get Started Free
								<ArrowRight className="w-5 h-5 text-white" />
							</motion.button>
						</Link>

						<button
							onClick={() => scrollToSection("features")}
							className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-white text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer"
						>
							Explore Core Modules
						</button>
					</motion.div>

					{/* Simple Trust Metrics */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.5 }}
						className="mt-12 pt-8 border-t border-slate-200/80 w-full grid grid-cols-3 gap-6"
					>
						{[
							{ label: "Admin Speedup", val: "10x Faster" },
							{ label: "Accuracy Rating", val: "99.9%" },
							{ label: "Setup Time", val: "< 10 Mins" }
						].map((item, idx) => (
							<div key={idx}>
								<div className="text-xl font-extrabold text-slate-800">{item.val}</div>
								<div className="text-xs text-slate-500 font-medium mt-0.5">{item.label}</div>
							</div>
						))}
					</motion.div>
				</div>

				{/* Right Column: Simulated Live HRM Sandbox Widget */}
				<div className="lg:col-span-5 relative z-20">

					{/* Glowing decorative shadows */}
					<div className="absolute inset-0 bg-gradient-to-tr from-indigo-400 to-purple-400 rounded-3xl blur-[30px] opacity-10"></div>

					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.8 }}
						className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 relative overflow-hidden"
					>
						{/* Background dot grid pattern for widget texture */}
						<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none"></div>

						{/* Widget Header bar */}
						<div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 relative z-10">
							<div className="flex items-center gap-2">
								<div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
								<span className="text-xs font-bold text-slate-800 tracking-wide uppercase">Live Sandbox Simulator</span>
							</div>
							<div className="flex bg-slate-100 rounded-lg p-1 text-[10px] font-bold text-slate-500">
								{(["overview", "clock", "feed"] as const).map((tab) => (
									<button
										key={tab}
										onClick={() => setHeroTab(tab)}
										className={`px-2.5 py-1 rounded-md transition-all capitalize cursor-pointer ${heroTab === tab ? "bg-white text-indigo-600 shadow-sm" : "hover:text-slate-800"}`}
									>
										{tab}
									</button>
								))}
							</div>
						</div>

						{/* Content views */}
						<div className="min-h-[220px] relative z-10">
							<AnimatePresence mode="wait">

								{/* Overview Tab Content */}
								{heroTab === "overview" && (
									<motion.div
										key="overview"
										initial={{ opacity: 0, y: 5 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0 }}
										className="space-y-4"
									>
										<div className="grid grid-cols-2 gap-3">
											<div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-3.5">
												<div className="flex items-center justify-between">
													<Users className="w-5 h-5 text-indigo-500" />
													<span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">+12%</span>
												</div>
												<div className="text-2xl font-black text-slate-800 mt-2">{presentCount}</div>
												<div className="text-xs text-slate-500 font-medium">Daily Present Staff</div>
											</div>
											<div className="bg-purple-50/50 border border-purple-100/50 rounded-2xl p-3.5">
												<div className="flex items-center justify-between">
													<Clock className="w-5 h-5 text-purple-500" />
													<span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Perfect</span>
												</div>
												<div className="text-2xl font-black text-slate-800 mt-2">{attendanceRate}%</div>
												<div className="text-xs text-slate-500 font-medium">Daily Attendance</div>
											</div>
										</div>

										<div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
											<div>
												<h4 className="text-sm font-bold text-slate-800">Monthly Time Tracker</h4>
												<p className="text-xs text-slate-400 mt-0.5">Automated payroll compliance</p>
											</div>
											<div className="flex items-center gap-3">
												<div className="relative w-12 h-12 flex items-center justify-center">
													<svg className="w-full h-full transform -rotate-90">
														<circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
														<circle cx="24" cy="24" r="20" stroke="#6366f1" strokeWidth="4" fill="transparent" strokeDasharray="125" strokeDashoffset="15" />
													</svg>
													<span className="absolute text-[10px] font-bold text-indigo-600">88%</span>
												</div>
											</div>
										</div>
									</motion.div>
								)}

								{/* Clock Interactive Simulator */}
								{heroTab === "clock" && (
									<motion.div
										key="clock"
										initial={{ opacity: 0, y: 5 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0 }}
										className="flex flex-col items-center justify-center py-4"
									>
										<span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Simulated Employee Device</span>

										<div className="text-2xl font-extrabold text-slate-800 tracking-tight mb-4">
											{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
										</div>

										<motion.button
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
											onClick={handleClockAction}
											className={`px-8 py-3 rounded-full text-sm font-black shadow-md cursor-pointer transition-all flex items-center gap-2 ${clockedIn
												? "bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600"
												: "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700"
												}`}
										>
											{clockedIn ? (
												<>
													<Check className="w-4 h-4" /> Clock Out
												</>
											) : (
												<>
													<Play className="w-4 h-4 fill-current" /> Clock In Now
												</>
											)}
										</motion.button>

										{clockedIn && (
											<p className="text-xs text-green-600 font-bold mt-4 animate-bounce">
												✓ Clocked in at {clockTime}
											</p>
										)}
									</motion.div>
								)}

								{/* Live Feed simulated logs */}
								{heroTab === "feed" && (
									<motion.div
										key="feed"
										initial={{ opacity: 0, y: 5 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0 }}
										className="space-y-3"
									>
										<div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
											<span>Recent HR Events</span>
											<span>Real-time Sync</span>
										</div>
										{feedItems.map((item, idx) => (
											<motion.div
												key={item.id}
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
											>
												<div className="flex items-center gap-2">
													<div className={`w-2 h-2 rounded-full ${item.type === 'success' ? 'bg-green-500' :
														item.type === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'
														}`}></div>
													<span className="font-bold text-slate-700">{item.text}</span>
												</div>
												<span className="text-[10px] text-slate-400 font-semibold">{item.time}</span>
											</motion.div>
										))}
									</motion.div>
								)}

							</AnimatePresence>
						</div>

						{/* Quick badge below mockup */}
						<div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 relative z-10">
							<span className="flex items-center gap-1.5">
								<Shield className="w-3.5 h-3.5 text-indigo-500" /> Fully Secured SSL Encryption
							</span>
							<span className="font-semibold text-indigo-600">Role-Based Access</span>
						</div>
					</motion.div>
				</div>
			</section>

			{/* 3. DYNAMIC 8-CORE CODEBASE MODULE EXPLORER */}
			<section id="features" className="py-24 bg-white relative z-10 border-y border-slate-200/50">

				{/* Texture inside features section */}
				<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-25 pointer-events-none"></div>

				<div className="max-w-7xl mx-auto px-6 relative z-10">

					{/* Section Header */}
					<div className="text-center max-w-3xl mx-auto mb-16">
						<span className="text-xs font-black uppercase tracking-widest text-indigo-600">Core Architecture</span>
						<h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-2 tracking-tight">
							Synchronized with All Core Codebase Modules
						</h2>
						<p className="text-slate-500 mt-4 text-base">
							Explore the real working modules identified directly in the MaveriX workspace. Switch between core sections below to check the high-fidelity mock interfaces.
						</p>
					</div>

					{/* 8-Tab Navigation Grid Layout */}
					<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 bg-slate-100 p-1.5 rounded-2xl max-w-6xl mx-auto mb-12 border border-slate-200/55">
						{[
							{ key: "directory", label: "Profiles", icon: Users },
							{ key: "attendance", label: "Attendance", icon: Clock },
							{ key: "leave", label: "Leaves", icon: Calendar },
							{ key: "payroll", label: "Payroll", icon: DollarSign },
							{ key: "teams", label: "Teams", icon: Building2 },
							{ key: "social", label: "Social Feed", icon: MessageSquare },
							{ key: "bulk", label: "Bulk Invite", icon: UserPlus },
							{ key: "exit", label: "Exit Flow", icon: Shield }
						].map((tab) => {
							const Icon = tab.icon;
							const isActive = activeModule === tab.key;
							return (
								<button
									key={tab.key}
									onClick={() => setActiveModule(tab.key as any)}
									className={`py-3 px-2 rounded-xl text-xs font-extrabold flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer transition-all border ${isActive
										? "bg-white text-indigo-600 shadow-md border-slate-200/20"
										: "text-slate-500 hover:text-slate-800 border-transparent"
										}`}
								>
									<Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
									<span>{tab.label}</span>
								</button>
							);
						})}
					</div>

					{/* 8-Tab Interactive Content Panel */}
					<div className="bg-[#fafbfc] rounded-3xl border border-slate-200/80 p-6 md:p-10 max-w-5xl mx-auto grid md:grid-cols-12 gap-8 items-center relative overflow-hidden shadow-sm">

						{/* Sub background texture for interactive cards */}
						<div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:14px_14px] opacity-15 pointer-events-none"></div>

						<div className="md:col-span-7 space-y-5 text-left relative z-10">
							<span className={`text-xs font-black border rounded-full px-3.5 py-1.5 inline-block uppercase tracking-wider ${moduleDetails[activeModule].badgeColor}`}>
								{moduleDetails[activeModule].tag}
							</span>

							<h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">
								{moduleDetails[activeModule].title}
							</h3>

							<p className="text-slate-600 leading-relaxed text-sm">
								{moduleDetails[activeModule].desc}
							</p>

							{/* Feature Bullets */}
							<ul className="space-y-2.5 pt-2">
								{moduleDetails[activeModule].bullets.map((bullet, idx) => (
									<li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
										<CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
										<span className="font-semibold">{bullet}</span>
									</li>
								))}
							</ul>
						</div>

						{/* Mock UI Showcase Panel */}
						<div className="md:col-span-5 relative z-10">
							<AnimatePresence mode="wait">
								<motion.div
									key={activeModule}
									initial={{ opacity: 0, scale: 0.97 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.97 }}
									transition={{ duration: 0.3 }}
								>
									{moduleDetails[activeModule].mockUi}
								</motion.div>
							</AnimatePresence>
						</div>
					</div>
				</div>
			</section>

			{/* 4. SAVINGS & ROI CALCULATOR SECTION */}
			<section id="calculator" className="py-24 relative z-10 overflow-hidden">
				<div className="max-w-7xl mx-auto px-6">

					<div className="grid lg:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">

						{/* Text & Slider on Left */}
						<div className="lg:col-span-7 text-left space-y-6">
							<span className="text-xs font-black uppercase tracking-widest text-indigo-600">ROI Calculator</span>
							<h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
								Instantly Estimate Your Operational Savings
							</h2>
							<p className="text-slate-500 text-sm">
								See the real quantitative impact of removing spreadsheets. Adjust the interactive team slider below to calculate weekly administrative time and monthly cash savings with MaveriX.
							</p>

							{/* Interactive Range Slider Card */}
							<div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden">
								<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>

								<div className="flex justify-between items-center mb-4 relative z-10">
									<span className="text-sm font-bold text-slate-700">Team Size:</span>
									<span className="text-2xl font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-100">
										{teamSize} Employees
									</span>
								</div>

								<input
									type="range"
									min="5"
									max="200"
									value={teamSize}
									onChange={(e) => setTeamSize(parseInt(e.target.value))}
									className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 relative z-10"
								/>

								<div className="flex justify-between text-xs text-slate-400 mt-2 font-semibold relative z-10">
									<span>5 Staff</span>
									<span>100 Staff</span>
									<span>200+ Staff</span>
								</div>
							</div>
						</div>

						{/* Results Widget Card on Right */}
						<div className="lg:col-span-5 relative">
							{/* Soft backdrop glow */}
							<div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-indigo-500 rounded-3xl blur-[20px] opacity-10"></div>

							<div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-6 relative overflow-hidden">

								{/* Card grid texture */}
								<div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] opacity-35 pointer-events-none"></div>

								<div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4 relative z-10">
									<Award className="w-5 h-5 text-indigo-600" />
									<span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Estimated Monthly Value</span>
								</div>

								<div className="space-y-4 relative z-10">

									{/* Cash Saved Stat */}
									<div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
										<span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600">Administrative Cash Saved</span>
										<div className="text-3xl font-black text-emerald-800 mt-1 flex items-center justify-center">
											<span className="text-xl font-bold mr-0.5">$</span>
											{calculatedSavings.cashSaved}
											<span className="text-xs text-emerald-600 font-medium ml-1">/ month</span>
										</div>
									</div>

									{/* Weekly hours saved */}
									<div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-left">
										<div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
											<Clock className="w-5 h-5" />
										</div>
										<div>
											<div className="text-sm font-extrabold text-slate-800">{calculatedSavings.hoursWeekly} Hours / Week</div>
											<div className="text-xs text-slate-400 font-medium mt-0.5">Admin time saved in timesheet logging</div>
										</div>
									</div>

									{/* Payroll run time */}
									<div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-left">
										<div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
											<DollarSign className="w-5 h-5" />
										</div>
										<div>
											<div className="text-sm font-extrabold text-slate-800">{teamSize > 40 ? "5 Days" : "2 Hours"} Process Time</div>
											<div className="text-xs text-slate-400 font-medium mt-0.5">Run salary slips & payslips instantly</div>
										</div>
									</div>

								</div>

								{/* Disclaimer / info pill */}
								<div className="mt-5 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1.5 relative z-10">
									<Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
									Calculated assuming 1 hour saved per employee per week.
								</div>
							</div>
						</div>

					</div>
				</div>
			</section>

			{/* 5. BENEFITS SECTION (Why Choose MaveriX) */}
			<section id="benefits" className="py-24 bg-slate-900 text-white relative z-10 rounded-[40px] md:rounded-[60px] mx-4 md:mx-10 overflow-hidden shadow-2xl">

				{/* Top-down ellipse ambient gradient */}
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,transparent_80%)]"></div>

				{/* Grid overlay for texture inside benefits */}
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:30px_30px] opacity-70"></div>

				<div className="max-w-7xl mx-auto px-6 relative z-10">

					{/* Benefits Header */}
					<div className="text-center max-w-3xl mx-auto mb-16">
						<span className="text-xs font-black uppercase tracking-widest text-indigo-400">Why MaveriX HRM?</span>
						<h2 className="text-3xl md:text-5xl font-black text-white mt-2 tracking-tight">
							Designed Specially for Scaling Business Models
						</h2>
						<p className="text-slate-400 mt-4 text-base">
							Streamline organizational pipelines, reduce HR load, and guarantee accurate compliance audits with modern cloud workflows.
						</p>
					</div>

					{/* Benefit grid */}
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
						{[
							{
								icon: Users,
								title: "Self-Service Employee Portal",
								desc: "Give your team direct ownership of their schedules. Employees submit leaves, toggle WFH statuses, and access salary slips dynamically without HR intervention.",
								color: "text-blue-400",
								bg: "bg-blue-950/40 border-blue-900/50"
							},
							{
								icon: Clock,
								title: "IP-Verified Clocking",
								desc: "Gain precise daily attendance visibility with smart IP-locked check-in features, preventing timesheet manipulation and ensuring transparent logging.",
								color: "text-violet-400",
								bg: "bg-violet-950/40 border-violet-900/50"
							},
							{
								icon: Shield,
								title: "Role-Based Encrypted Data",
								desc: "Protect sensitive corporate assets. Encrypted access protocols ensure financial statements and contracts remain locked to authorized admin panels.",
								color: "text-emerald-400",
								bg: "bg-emerald-950/40 border-emerald-900/50"
							},
							{
								icon: Zap,
								title: "Smart Automations",
								desc: "Minimize manual calculations. MaveriX auto-penalizes wages based on attendance policies, calculating tax-deducted salaries effortlessly.",
								color: "text-amber-400",
								bg: "bg-amber-950/40 border-amber-900/50"
							},
							{
								icon: Cloud,
								title: "Cloud Hosted & 24/7",
								desc: "Track attendance from any device, anywhere. Rest easy with ISO compliant databases ensuring 99.9% uptime, backup redundancy, and fast loading.",
								color: "text-sky-400",
								bg: "bg-sky-950/40 border-sky-900/50"
							},
							{
								icon: Target,
								title: "Intuitive UX & Light Theme",
								desc: "An beautiful dashboard that requires zero training. Delight managers and staff alike with micro-animated dashboards designed to look professional.",
								color: "text-pink-400",
								bg: "bg-pink-950/40 border-pink-900/50"
							}
						].map((item, idx) => {
							const Icon = item.icon;
							return (
								<motion.div
									key={idx}
									whileHover={{ y: -5, borderColor: "rgba(129, 140, 248, 0.4)" }}
									className={`p-6 rounded-3xl border ${item.bg} text-left transition-all relative overflow-hidden group`}
								>
									<div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-5 ${item.color} group-hover:scale-110 transition-transform`}>
										<Icon className="w-5 h-5" />
									</div>
									<h4 className="text-lg font-bold text-white mb-2">{item.title}</h4>
									<p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
								</motion.div>
							);
						})}
					</div>
				</div>
			</section>

			{/* 6. INTERACTIVE FAQ ACCORDION SECTION */}
			<section id="faq" className="py-24 relative z-10">
				<div className="max-w-4xl mx-auto px-6">

					{/* FAQ Header */}
					<div className="text-center mb-16">
						<span className="text-xs font-black uppercase tracking-widest text-indigo-600">Frequently Asked Questions</span>
						<h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-2 tracking-tight">
							Got Questions? We’ve Got Answers
						</h2>
					</div>

					{/* Accordion Lists */}
					<div className="space-y-4">
						{faqs.map((faq, idx) => (
							<div
								key={idx}
								className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-300"
							>
								{/* Accordion Header Trigger */}
								<button
									onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
									className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
								>
									<span className="text-sm md:text-base leading-snug">{faq.q}</span>
									<ChevronDown
										className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ml-3 ${openFaqIndex === idx ? "rotate-180 text-indigo-500" : ""
											}`}
									/>
								</button>

								{/* Accordion Body Content */}
								<AnimatePresence initial={false}>
									{openFaqIndex === idx && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: "auto", opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.25 }}
										>
											<div className="px-6 pb-6 pt-1 border-t border-slate-50 text-xs md:text-sm text-slate-500 leading-relaxed text-left">
												{faq.a}
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* 7. PREMIUM FINAL CTA SECTION */}
			<section className="relative px-6 py-20 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white overflow-hidden text-center">

				{/* Radial line overlay for CTA texture */}
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:24px_24px] opacity-70"></div>

				{/* Glowing blobs inside CTA */}
				<div className="absolute top-[-20%] right-[-10%] w-[50%] h-[60%] bg-purple-500/20 rounded-full blur-[80px]"></div>
				<div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[60%] bg-indigo-500/20 rounded-full blur-[80px]"></div>

				<div className="max-w-4xl mx-auto relative z-10 space-y-6">

					{/* Glowing target badge */}
					<div className="flex justify-center">
						<div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 inline-flex items-center gap-3 border border-white/15">
							<Rocket className="w-5 h-5 text-indigo-300 animate-bounce" />
							<span className="text-xs font-bold tracking-wider uppercase text-indigo-200">Scale Safely & Seamlessly</span>
						</div>
					</div>

					<h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
						Ready to Elevate Your HR Workflows?
					</h2>

					<p className="text-slate-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
						Join companies that manage hybrid staff, timesheet attendance, and employee data with MaveriX. Set up in less than 10 minutes.
					</p>

					{/* CTA Button */}
					<div className="pt-4 flex justify-center">
						<Link href="/auth/login">
							<motion.button
								whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)" }}
								whileTap={{ scale: 0.98 }}
								className="px-8 py-4 rounded-xl text-base font-extrabold bg-white text-indigo-900 flex items-center gap-2 shadow-2xl shadow-indigo-950/50 hover:bg-slate-50 transition-colors cursor-pointer"
							>
								Start Using MaveriX Today
								<ArrowRight className="w-5 h-5 text-indigo-900" />
							</motion.button>
						</Link>
					</div>

					{/* Small bottom highlights */}
					<div className="pt-6 flex flex-wrap justify-center gap-6 text-xs text-slate-400 font-semibold">
						<span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> ISO Secure Cloud</span>
						<span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No credit card required</span>
						<span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Dynamic light theme</span>
					</div>
				</div>
			</section>

			{/* 8. ELONGATED FOOTER */}
			<footer className="bg-slate-950 text-slate-500 py-12 relative z-10 border-t border-slate-900">
				<div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8 mb-8 text-left">
					<div className="md:col-span-2 space-y-4">
						<Image src="/maverix-whitelogo.png" alt="MaveriX White Logo" width={120} height={32} className="h-8 w-auto object-contain" />
						<p className="text-xs text-slate-400 leading-relaxed max-w-sm">
							An intelligent Human Resource Management (HRM) platform built for modern scaling teams. Automate attendance logs, salary calculation, document vaults, and leave balances in a secure light theme.
						</p>
					</div>
					<div>
						<h5 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Product</h5>
						<ul className="space-y-2 text-xs font-semibold">
							<li><button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors cursor-pointer">Live Features</button></li>
							<li><button onClick={() => scrollToSection("calculator")} className="hover:text-white transition-colors cursor-pointer">Savings Calculator</button></li>
							<li><button onClick={() => scrollToSection("benefits")} className="hover:text-white transition-colors cursor-pointer">Why MaveriX</button></li>
						</ul>
					</div>
					<div>
						<h5 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Developer Details</h5>
						<ul className="space-y-2 text-xs font-semibold">
							<li><a href="https://iconicchandu.online/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Iconic Chandu</a></li>
							<li><Link href="/auth/login" className="hover:text-white transition-colors">Admin Dashboard</Link></li>
							<li><Link href="/auth/login" className="hover:text-white transition-colors">Employee Portal</Link></li>
						</ul>
					</div>
				</div>

				{/* Copywrite and developer credit bar */}
				<div className="max-w-7xl mx-auto px-6 border-t border-slate-900 pt-8 text-center flex flex-col sm:flex-row items-center justify-between text-xs font-semibold font-sans">
					<p>© {new Date().getFullYear()} MaveriX - Smart HRM. All Rights Reserved.</p>
					<p className="mt-2 sm:mt-0">
						Made with ❤️ by{" "}
						<a
							href="https://iconicchandu.online/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-white hover:text-slate-300 transition-colors"
						>
							Iconic Chandu
						</a>
					</p>
				</div>
			</footer>

		</div>
	);
}
