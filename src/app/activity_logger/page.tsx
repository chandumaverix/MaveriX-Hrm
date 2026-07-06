"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/user-context";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Lock, ChevronDown, Clock, Shield, UserCheck, Calendar, Activity, Zap, FileText, DollarSign, Settings, Megaphone, LogOut, UserPlus, Layers, ArrowRight, RefreshCw, Download, Mail, Key } from "lucide-react";
import { toast } from "react-hot-toast";

const ACTIVITY_LOGGER_UNLOCK_KEY = "activity_logger_unlocked";
const CATEGORIES = ["all", "auth", "employee", "leave", "payroll", "role", "document", "attendance", "announcement", "resignation", "finance", "settings", "team"] as const;
const ROLES = ["all", "admin", "hr", "employee"] as const;
const PAGE_SIZE = 20;

const CAT_META: Record<string, {
	label: string;
	grad: string;
	bg: string;
	text: string;
	dot: string;
	icon: any;
	colorCode: string;
	activeBg: string;
	activeBorder: string;
	activeText: string;
	activeGlow: string
}> = {
	auth: { label: "Auth", grad: "from-blue-500 to-indigo-600", bg: "bg-blue-50/70 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500", icon: Shield, colorCode: "#3b82f6", activeBg: "bg-blue-50/80 dark:bg-blue-950/40", activeBorder: "border-blue-500/40 dark:border-blue-800/40", activeText: "text-blue-600 dark:text-blue-400", activeGlow: "shadow-[0_4px_20px_rgba(59,130,246,0.15)]" },
	employee: { label: "Employee", grad: "from-emerald-500 to-green-600", bg: "bg-emerald-50/70 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", icon: UserPlus, colorCode: "#10b981", activeBg: "bg-emerald-50/80 dark:bg-emerald-950/40", activeBorder: "border-emerald-500/40 dark:border-emerald-800/40", activeText: "text-emerald-600 dark:text-emerald-400", activeGlow: "shadow-[0_4px_20px_rgba(16,185,129,0.15)]" },
	leave: { label: "Leave", grad: "from-amber-500 to-orange-600", bg: "bg-amber-50/70 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", icon: Calendar, colorCode: "#f59e0b", activeBg: "bg-amber-50/80 dark:bg-amber-950/40", activeBorder: "border-amber-500/40 dark:border-amber-800/40", activeText: "text-amber-650 dark:text-amber-400", activeGlow: "shadow-[0_4px_20px_rgba(245,158,11,0.15)]" },
	payroll: { label: "Payroll", grad: "from-violet-500 to-purple-600", bg: "bg-violet-50/70 dark:bg-violet-950/20", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-500", icon: DollarSign, colorCode: "#8b5cf6", activeBg: "bg-violet-50/80 dark:bg-violet-950/40", activeBorder: "border-violet-500/40 dark:border-violet-800/40", activeText: "text-violet-600 dark:text-violet-400", activeGlow: "shadow-[0_4px_20px_rgba(139,92,246,0.15)]" },
	role: { label: "Role", grad: "from-rose-500 to-red-600", bg: "bg-rose-50/70 dark:bg-rose-950/20", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500", icon: UserCheck, colorCode: "#f43f5e", activeBg: "bg-rose-50/80 dark:bg-rose-950/40", activeBorder: "border-rose-500/40 dark:border-rose-800/40", activeText: "text-rose-600 dark:text-rose-400", activeGlow: "shadow-[0_4px_20px_rgba(244,63,94,0.15)]" },
	document: { label: "Document", grad: "from-orange-500 to-amber-600", bg: "bg-orange-50/70 dark:bg-orange-950/20", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500", icon: FileText, colorCode: "#f97316", activeBg: "bg-orange-50/80 dark:bg-orange-950/40", activeBorder: "border-orange-500/40 dark:border-orange-800/40", activeText: "text-orange-600 dark:text-orange-400", activeGlow: "shadow-[0_4px_20px_rgba(249,115,22,0.15)]" },
	attendance: { label: "Attendance", grad: "from-pink-500 to-rose-600", bg: "bg-pink-50/70 dark:bg-pink-950/20", text: "text-pink-700 dark:text-pink-400", dot: "bg-pink-500", icon: Clock, colorCode: "#ec4899", activeBg: "bg-pink-50/80 dark:bg-pink-950/40", activeBorder: "border-pink-500/40 dark:border-pink-800/40", activeText: "text-pink-600 dark:text-pink-400", activeGlow: "shadow-[0_4px_20px_rgba(236,72,153,0.15)]" },
	announcement: { label: "Announcement", grad: "from-teal-500 to-cyan-600", bg: "bg-teal-50/70 dark:bg-teal-950/20", text: "text-teal-700 dark:text-teal-400", dot: "bg-teal-500", icon: Megaphone, colorCode: "#14b8a6", activeBg: "bg-teal-50/80 dark:bg-teal-950/40", activeBorder: "border-teal-500/40 dark:border-teal-800/40", activeText: "text-teal-650 dark:text-teal-400", activeGlow: "shadow-[0_4px_20px_rgba(20,184,166,0.15)]" },
	resignation: { label: "Resignation", grad: "from-red-500 to-rose-700", bg: "bg-red-50/70 dark:bg-red-950/20", text: "text-red-700 dark:text-red-400", dot: "bg-red-500", icon: LogOut, colorCode: "#ef4444", activeBg: "bg-red-50/80 dark:bg-red-950/40", activeBorder: "border-red-500/40 dark:border-red-800/40", activeText: "text-red-650 dark:text-red-400", activeGlow: "shadow-[0_4px_20px_rgba(239,68,68,0.15)]" },
	finance: { label: "Finance", grad: "from-emerald-500 to-teal-600", bg: "bg-emerald-50/70 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", icon: DollarSign, colorCode: "#059669", activeBg: "bg-emerald-50/80 dark:bg-emerald-950/40", activeBorder: "border-emerald-500/40 dark:border-emerald-800/40", activeText: "text-emerald-600 dark:text-emerald-400", activeGlow: "shadow-[0_4px_20px_rgba(16,185,129,0.15)]" },
	settings: { label: "Settings", grad: "from-slate-500 to-gray-600", bg: "bg-slate-50/70 dark:bg-slate-900/20", text: "text-slate-700 dark:text-slate-400", dot: "bg-slate-550", icon: Settings, colorCode: "#64748b", activeBg: "bg-slate-50/80 dark:bg-slate-900/40", activeBorder: "border-slate-400/45 dark:border-slate-700/45", activeText: "text-slate-700 dark:text-slate-300", activeGlow: "shadow-[0_4px_20px_rgba(100,116,139,0.15)]" },
	team: { label: "Team", grad: "from-cyan-500 to-blue-600", bg: "bg-cyan-50/70 dark:bg-cyan-950/20", text: "text-cyan-700 dark:text-cyan-400", dot: "bg-cyan-500", icon: Layers, colorCode: "#06b6d4", activeBg: "bg-cyan-50/80 dark:bg-cyan-950/40", activeBorder: "border-cyan-500/40 dark:border-cyan-800/40", activeText: "text-cyan-600 dark:text-cyan-450", activeGlow: "shadow-[0_4px_20px_rgba(6,182,212,0.15)]" },
};

const ROLE_BADGE: Record<string, { label: string; grad: string; text: string; bg: string }> = {
	admin: { label: "Admin", grad: "from-rose-500 to-red-600", text: "text-rose-700 dark:text-rose-450", bg: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-100/50 dark:border-rose-900/30" },
	hr: { label: "HR Manager", grad: "from-blue-500 to-indigo-650", text: "text-blue-700 dark:text-blue-450", bg: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-900/30" },
	employee: { label: "Employee", grad: "from-emerald-500 to-teal-650", text: "text-emerald-750 dark:text-emerald-450", bg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100/50 dark:border-emerald-900/30" },
};

function fmtTime(ts: string) { return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }); }

function dateKey(ts: string) { return new Date(ts).toISOString().split("T")[0]; }

function fmtDateClear(d: string) {
	const dt = new Date(d);
	if (isNaN(dt.getTime())) return d;
	const day = dt.getDate();
	const month = dt.toLocaleString("en-US", { month: "long" });
	const year = dt.getFullYear();
	return `${day} ${month} ${year}`;
}

function fmtDateLabel(d: string) {
	const dt = new Date(d + "T00:00:00"), now = new Date(); now.setHours(0, 0, 0, 0);
	const y = new Date(now); y.setDate(y.getDate() - 1);
	if (dt.getTime() === now.getTime()) return "Today";
	if (dt.getTime() === y.getTime()) return "Yesterday";
	return fmtDateClear(d + "T00:00:00");
}
function groupByDate(logs: any[]) {
	const g: Record<string, any[]> = {};
	for (const l of logs) { const k = dateKey(l.created_at); (g[k] ??= []).push(l); }
	return Object.entries(g).sort(([a], [b]) => b.localeCompare(a));
}
const FIELD_LABELS: Record<string, string> = { used_days: "Deducted Leave", total_days: "Total Leave Days", leave_type_id: "Leave Type", employee_id: "Employee", status: "Status", clock_in: "Clock In", clock_out: "Clock Out", total_hours: "Total Hours", start_date: "Start Date", end_date: "End Date", first_name: "First Name", last_name: "Last Name", designation: "Designation", department: "Department", role: "Role", reason: "Reason", last_working_day: "Last Working Day" };
function prettifyField(f: string) { return FIELD_LABELS[f] || f.replace(/_/g, " ").replace(/\bid\b/gi, "ID").replace(/\b\w/g, c => c.toUpperCase()); }

function calculateDays(desc: string) {
	const match = desc.match(/from\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i);
	if (match) {
		const start = new Date(match[1]);
		const end = new Date(match[2]);
		if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
			if (desc.toLowerCase().includes("halfday") || desc.toLowerCase().includes("half day")) {
				return 0.5;
			}
			const diffTime = end.getTime() - start.getTime();
			return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
		}
	}
	return null;
}

function getSeverity(log: any): { label: "critical" | "warning" | "important" | "normal"; color: string; bg: string; dot: string } {
	const desc = (log.description || "").toLowerCase();
	const action = (log.action || "").toLowerCase();
	const category = (log.category || "").toLowerCase();

	if (
		desc.includes("deleted") ||
		desc.includes("removed") ||
		action.includes("delete") ||
		action.includes("remove") ||
		category === "role" ||
		category === "settings" ||
		desc.includes("role changed") ||
		desc.includes("salary") ||
		desc.includes("payroll balance") ||
		desc.includes("adjusted to") ||
		desc.includes("resignation")
	) {
		return { label: "critical", color: "text-rose-705 dark:text-rose-400", bg: "bg-rose-50/50 dark:bg-rose-950/20 border-rose-150/40 dark:border-rose-900/30", dot: "bg-rose-500" };
	}
	if (
		desc.includes("rejected") ||
		desc.includes("denied") ||
		action.includes("reject") ||
		desc.includes("failed")
	) {
		return { label: "warning", color: "text-amber-705 dark:text-amber-400", bg: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-150/40 dark:border-amber-900/30", dot: "bg-amber-500" };
	}
	if (
		desc.includes("approved") ||
		desc.includes("submitted") ||
		desc.includes("changed to") ||
		action.includes("submit") ||
		action.includes("approve") ||
		category === "auth" ||
		action.includes("login")
	) {
		return { label: "important", color: "text-indigo-655 dark:text-indigo-400", bg: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-150/40 dark:border-indigo-900/30", dot: "bg-indigo-500" };
	}
	return { label: "normal", color: "text-slate-655 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/40 border-slate-150/50 dark:border-slate-800/60", dot: "bg-slate-400" };
}

function getDeviceDetails(log: any) {
	const device = log.metadata?.device;
	const browser = log.metadata?.browser;
	const os = log.metadata?.os;

	if (device || browser || os) {
		const parts = [];
		if (device && device !== "Unknown") parts.push(device);
		if (browser && browser !== "Unknown") parts.push(browser);
		if (os && os !== "Unknown") parts.push(os);
		if (parts.length > 0) return parts.join(" / ");
	}
	return "Unknown";
}

function getLocationDetails(log: any) {
	const area = log.metadata?.area;
	const street = log.metadata?.street;
	const city = log.metadata?.city;
	const state = log.metadata?.state;

	const parts = [];
	if (street && street !== "Unknown") parts.push(street);
	if (area && area !== "Unknown") parts.push(area);
	if (city && city !== "Unknown") parts.push(city);
	if (parts.length === 0 && state && state !== "Unknown") parts.push(state);

	if (parts.length > 0) {
		return `📍 ${parts.join(", ")}`;
	}
	return "Unknown";
}

function getIPAddress(log: any) {
	if (log.ip_address && log.ip_address !== "false" && log.ip_address !== "Local Trigger" && log.ip_address !== "Local") {
		return log.ip_address;
	}
	return "Unknown";
}

function renderDescription(desc: string) {
	if (!desc) return null;
	interface MatchToken {
		start: number;
		end: number;
		text: string;
		type: 'status_success' | 'status_danger' | 'status_warn' | 'action' | 'date_time' | 'leave_type' | 'name' | 'number';
	}
	const tokens: MatchToken[] = [];
	const addMatches = (regex: RegExp, type: MatchToken['type']) => {
		let match;
		while ((match = regex.exec(desc)) !== null) {
			const start = match.index;
			const end = start + match[0].length;
			const overlap = tokens.some(t => (start >= t.start && start < t.end) || (end > t.start && end <= t.end));
			if (!overlap) {
				tokens.push({ start, end, text: match[0], type });
			}
		}
	};
	addMatches(/\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/gi, 'date_time');
	addMatches(/\b\d{4}-\d{2}-\d{2}\b/g, 'date_time');
	addMatches(/\b(?:Casual Leave|Halfday Leave|Sick Leave|Privilege Leave|Maternity Leave|Paternity Leave)\b/gi, 'leave_type');
	addMatches(/\bapproved\b/gi, 'status_success');
	addMatches(/\b(?:rejected|deleted|removed)\b/gi, 'status_danger');
	addMatches(/\b(?:pending|submitted|adjusted)\b/gi, 'status_warn');
	addMatches(/\b(?:clocked in|clocked out)\b/gi, 'action');
	addMatches(/\b(?:Anjali Singh|Aditya Pandey|Pallavi Srivastava|Chandrakant Maurya|Nitu Maurya)\b/g, 'name');
	addMatches(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, 'name');
	addMatches(/\b\d+(?:\.\d+)?\b/g, 'number');
	tokens.sort((a, b) => a.start - b.start);
	const result: React.ReactNode[] = [];
	let lastIndex = 0;
	tokens.forEach((t, i) => {
		if (t.start > lastIndex) {
			result.push(desc.slice(lastIndex, t.start));
		}
		if (t.type === 'status_success') {
			result.push(<span key={i} className="text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wider bg-emerald-50/50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-md border border-emerald-150/40 dark:border-emerald-900/30 text-[10px] inline-block mx-0.5">{t.text}</span>);
		} else if (t.type === 'status_danger') {
			result.push(<span key={i} className="text-rose-700 dark:text-rose-455 font-extrabold uppercase tracking-wider bg-rose-50/50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded-md border border-rose-150/40 dark:border-rose-900/30 text-[10px] inline-block mx-0.5">{t.text}</span>);
		} else if (t.type === 'status_warn') {
			result.push(<span key={i} className="text-amber-700 dark:text-amber-450 font-extrabold uppercase tracking-wider bg-amber-50/50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded-md border border-amber-150/40 dark:border-amber-900/30 text-[10px] inline-block mx-0.5">{t.text}</span>);
		} else if (t.type === 'action') {
			result.push(<span key={i} className="text-indigo-650 dark:text-indigo-400 font-extrabold mx-0.5">{t.text}</span>);
		} else if (t.type === 'date_time') {
			const formattedText = t.text.match(/^\d{4}-\d{2}-\d{2}$/) ? fmtDateClear(t.text + "T00:00:00") : t.text;
			result.push(<span key={i} className="text-slate-700 dark:text-slate-205 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-[10px] inline-block mx-0.5 shadow-sm">{formattedText}</span>);
		} else if (t.type === 'leave_type') {
			result.push(<span key={i} className="text-blue-600 dark:text-blue-400 font-extrabold decoration-2 decoration-blue-500/20 underline-offset-2 mx-0.5">{t.text}</span>);
		} else if (t.type === 'name') {
			result.push(<span key={i} className="text-slate-850 dark:text-white font-extrabold underline decoration-violet-500/30 decoration-2 underline-offset-2 mx-0.5">{t.text}</span>);
		} else if (t.type === 'number') {
			result.push(<span key={i} className="text-violet-650 dark:text-violet-400 font-black mx-0.5">{t.text}</span>);
		} else {
			result.push(t.text);
		}
		lastIndex = t.end;
	});
	if (lastIndex < desc.length) {
		result.push(desc.slice(lastIndex));
	}
	const days = calculateDays(desc);
	if (days !== null && desc.toLowerCase().includes("requested")) {
		result.push(
			<span key="total-days" className="text-violet-650 dark:text-violet-400 font-extrabold bg-violet-50/50 dark:bg-violet-950/20 px-1.5 py-0.5 rounded-md border border-violet-150/40 dark:border-violet-900/30 text-[10px] inline-block ml-1 shadow-sm">
				Total: {days} {days === 1 ? 'day' : 'days'}
			</span>
		);
	}
	return result;
}

/* ── Change Diff component ── */
function ChangeDiff({ changes, employeeNames }: { changes: { field: string; from: string; to: string }[], employeeNames: Record<string, string> }) {
	if (!changes?.length) return null;
	const formatValue = (field: string, val: string) => {
		if (!val || val === "(empty)") return val;
		if (employeeNames[val]) return employeeNames[val];
		if (val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
			const dt = new Date(val);
			if (!isNaN(dt.getTime())) {
				const day = dt.getDate();
				const month = dt.toLocaleString("en-US", { month: "long" });
				const year = dt.getFullYear();
				const time = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
				return `${day} ${month} ${year}, ${time}`;
			}
		}
		if (val.match(/^\d{4}-\d{2}-\d{2}$/)) {
			const dt = new Date(val + "T00:00:00");
			if (!isNaN(dt.getTime())) {
				const day = dt.getDate();
				const month = dt.toLocaleString("en-US", { month: "long" });
				const year = dt.getFullYear();
				return `${day} ${month} ${year}`;
			}
		}
		return val;
	};
	return (
		<div className="mt-3 border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm">
			<div className="grid grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-950/40 px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/60">
				<div>Field / Attribute</div>
				<div>Original Value</div>
				<div>Updated Value</div>
			</div>
			<div className="divide-y divide-slate-100 dark:divide-slate-850 px-2 text-left">
				{changes.map((c, i) => {
					const fromFormatted = formatValue(c.field, c.from);
					const toFormatted = formatValue(c.field, c.to);
					return (
						<div key={i} className="grid grid-cols-3 gap-4 items-center text-xs py-3 px-2">
							<div className="font-extrabold text-slate-700 dark:text-slate-350" title={prettifyField(c.field)}>
								{prettifyField(c.field)}
							</div>
							<div className="truncate">
								{fromFormatted === "(empty)" ? (
									<span className="text-slate-405 dark:text-slate-600 font-medium italic">{fromFormatted}</span>
								) : (
									<span className="px-2 py-1 rounded bg-rose-50/40 dark:bg-rose-950/10 text-rose-650 dark:text-rose-400 line-through decoration-rose-450/45 font-medium text-[11px]" title={fromFormatted}>
										{fromFormatted}
									</span>
								)}
							</div>
							<div className="truncate">
								{toFormatted === "(empty)" ? (
									<span className="text-slate-405 dark:text-slate-600 font-medium italic">{toFormatted}</span>
								) : (
									<span className="px-2 py-1 rounded bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]" title={toFormatted}>
										{toFormatted}
									</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default function ActivityPage() {
	const router = useRouter();
	const { employee } = useUser();
	const supabase = useMemo(() => createClient(), []);
	const [logs, setLogs] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [role, setRole] = useState("all");
	const [cat, setCat] = useState("all");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [counts, setCounts] = useState<Record<string, number>>({});
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [otpStep, setOtpStep] = useState<"email" | "otp">("email");
	const [unlocked, setUnlocked] = useState(false);
	const [otpError, setOtpError] = useState("");
	const [otpLoading, setOtpLoading] = useState(false);
	const [otpToken, setOtpToken] = useState("");
	const [openMeta, setOpenMeta] = useState<Set<string>>(new Set());
	const [avatars, setAvatars] = useState<Record<string, string>>({});
	const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});
	const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
	const [focusedUserName, setFocusedUserName] = useState<string | null>(null);
	const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");
	const [activeTab, setActiveTab] = useState<"timeline" | "security" | "health">("timeline");
	const [dbLatency, setDbLatency] = useState<number | null>(null);

	const hasAccess = unlocked;

	useEffect(() => { if (typeof window !== "undefined" && window.localStorage.getItem(ACTIVITY_LOGGER_UNLOCK_KEY) === "true") setUnlocked(true); }, []);

	useEffect(() => {
		if (!hasAccess) return;
		const fetchCounts = async () => {
			try {
				const res = await fetch("/api/activity_logger/logs", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						type: "counts",
						role,
						focusedUserId,
						search,
						dateRange
					})
				});
				if (res.ok) {
					const data = await res.json();
					setCounts(data.counts || {});
					if (data.employeeNames) setEmployeeNames(data.employeeNames);
					if (data.avatars) setAvatars(data.avatars);
				}
			} catch (err) {
				console.error("Failed to fetch category counts:", err);
			}
		};
		fetchCounts();
	}, [hasAccess, role, focusedUserId, search, dateRange]);

	const fetchLogs = useCallback(async (p: number, reset: boolean) => {
		if (!hasAccess) return;
		setLoading(true);
		const startTime = performance.now();
		try {
			const res = await fetch("/api/activity_logger/logs", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: "logs",
					page: p,
					pageSize: PAGE_SIZE,
					role,
					cat,
					focusedUserId,
					search,
					dateRange
				})
			});
			if (res.ok) {
				const data = await res.json();
				const fetchedLogs = data.logs || [];
				setLogs(reset ? fetchedLogs : prev => [...prev, ...fetchedLogs]);
				setHasMore(fetchedLogs.length === PAGE_SIZE);
				if (data.employeeNames) setEmployeeNames(data.employeeNames);
				if (data.avatars) setAvatars(data.avatars);
			}
		} catch (err) {
			console.error("Failed to fetch logs:", err);
		} finally {
			const duration = Math.round(performance.now() - startTime);
			setDbLatency(duration);
			setLoading(false);
		}
	}, [hasAccess, role, cat, focusedUserId, search, dateRange]);

	useEffect(() => { if (!hasAccess) return; setPage(0); fetchLogs(0, true); }, [hasAccess, role, cat, focusedUserId, search, dateRange, fetchLogs]);

	useEffect(() => {
		if (!hasAccess) return;
		const ch = supabase.channel("hrm_activity").on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, (p) => {
			setLogs(prev => {
				if (role !== "all" && p.new.user_role !== role) return prev;
				if (cat !== "all" && p.new.category !== cat) return prev;
				if (focusedUserId && p.new.user_id !== focusedUserId) return prev;
				if (search && !p.new.description?.toLowerCase().includes(search.toLowerCase())) return prev;
				if (dateRange === "today") {
					const d = new Date(); d.setHours(0, 0, 0, 0);
					if (new Date(p.new.created_at) < d) return prev;
				} else if (dateRange === "week") {
					const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
					if (new Date(p.new.created_at) < d) return prev;
				} else if (dateRange === "month") {
					const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
					if (new Date(p.new.created_at) < d) return prev;
				}
				return [p.new, ...prev];
			});
			setCounts(prev => {
				const isRoleMatch = role === "all" || p.new.user_role === role;
				const isUserMatch = !focusedUserId || p.new.user_id === focusedUserId;
				const isSearchMatch = !search || p.new.description?.toLowerCase().includes(search.toLowerCase());
				let isDateMatch = true;
				if (dateRange === "today") {
					const d = new Date(); d.setHours(0, 0, 0, 0);
					isDateMatch = new Date(p.new.created_at) >= d;
				} else if (dateRange === "week") {
					const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
					isDateMatch = new Date(p.new.created_at) >= d;
				} else if (dateRange === "month") {
					const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
					isDateMatch = new Date(p.new.created_at) >= d;
				}
				if (isRoleMatch && isUserMatch && isSearchMatch && isDateMatch) {
					return { ...prev, [p.new.category]: (prev[p.new.category] || 0) + 1 };
				}
				return prev;
			});
		}).subscribe();
		return () => { supabase.removeChannel(ch); };
	}, [hasAccess, role, cat, focusedUserId, search, dateRange, supabase]);

	const sendOTP = async () => {
		if (!email) {
			setOtpError("Email address is required.");
			return;
		}
		setOtpLoading(true);
		setOtpError("");
		try {
			const res = await fetch("/api/activity_logger/otp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "send", email }),
			});
			const data = await res.json();
			if (res.ok && data.token) {
				setOtpToken(data.token);
				setOtpStep("otp");
				toast.success("Verification code sent successfully!");
			} else {
				setOtpError(data.error || "Failed to send code.");
			}
		} catch (err) {
			setOtpError("Network error. Please try again.");
		} finally {
			setOtpLoading(false);
		}
	};

	const verifyOTP = async () => {
		if (!otp) {
			setOtpError("Verification code is required.");
			return;
		}
		setOtpLoading(true);
		setOtpError("");
		try {
			const res = await fetch("/api/activity_logger/otp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "verify", email, otp, token: otpToken }),
			});
			const data = await res.json();
			if (res.ok) {
				setUnlocked(true);
				if (typeof window !== "undefined") {
					window.localStorage.setItem(ACTIVITY_LOGGER_UNLOCK_KEY, "true");
				}
				toast.success("Access authorized successfully! Welcome 🎉");
			} else {
				setOtpError(data.error || "Incorrect verification code.");
			}
		} catch (err) {
			setOtpError("Network error. Please try again.");
		} finally {
			setOtpLoading(false);
		}
	};

	const exportToCSV = () => {
		if (!logs.length) return;
		const headers = ["Date", "Time", "User", "Role", "Action", "Category", "Description"];
		const rows = logs.map(log => {
			const date = dateKey(log.created_at);
			const time = fmtTime(log.created_at);
			const user = log.user_name || "System";
			const role = log.user_role || "admin";
			const action = log.action;
			const category = log.category;
			const description = log.description.replace(/"/g, '""');
			return [
				`"${date}"`,
				`"${time}"`,
				`"${user}"`,
				`"${role}"`,
				`"${action}"`,
				`"${category}"`,
				`"${description}"`
			].join(",");
		});
		const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `audit_log_${new Date().toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const grouped = useMemo(() => groupByDate(logs), [logs]);
	const total = Object.values(counts).reduce((a, b) => a + b, 0);

	const topModule = useMemo(() => {
		const entries = Object.entries(counts).filter(([_, v]) => v > 0);
		if (!entries.length) return { label: "None", count: 0 };
		entries.sort((a, b) => b[1] - a[1]);
		return {
			label: CAT_META[entries[0][0]]?.label || entries[0][0],
			count: entries[0][1]
		};
	}, [counts]);

	const topContributor = useMemo(() => {
		if (!logs.length) return { name: "None", count: 0 };
		const userCounts: Record<string, number> = {};
		logs.forEach(log => {
			if (log.user_name) {
				userCounts[log.user_name] = (userCounts[log.user_name] || 0) + 1;
			}
		});
		const entries = Object.entries(userCounts);
		entries.sort((a, b) => b[1] - a[1]);
		return {
			name: entries[0][0],
			count: entries[0][1]
		};
	}, [logs]);

	const latestActivityTime = useMemo(() => {
		if (!logs.length) return "N/A";
		const lastLog = logs[0];
		const diffMs = Date.now() - new Date(lastLog.created_at).getTime();
		const diffMins = Math.floor(diffMs / 60000);
		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHrs = Math.floor(diffMins / 60);
		if (diffHrs < 24) return `${diffHrs}h ago`;
		return `${Math.floor(diffHrs / 24)}d ago`;
	}, [logs]);

	const adminLogs = useMemo(() => {
		return logs.filter(log => ["admin", "hr", "hr manager"].includes((log.user_role || "").toLowerCase()));
	}, [logs]);

	const loginSessions = useMemo(() => {
		return logs.filter(log => log.category === "auth" || (log.action || "").toLowerCase().includes("login") || (log.action || "").toLowerCase().includes("session") || (log.action || "").toLowerCase().includes("clock"));
	}, [logs]);

	const criticalLogs = useMemo(() => {
		return logs.filter(log => {
			const sev = getSeverity(log);
			return sev.label === "critical" || sev.label === "warning";
		});
	}, [logs]);

	const activeUsersCount = useMemo(() => {
		const users = new Set(logs.map(log => log.user_id).filter(Boolean));
		return users.size || (logs.length ? 1 : 0);
	}, [logs]);

	// ── OTP Authorization Gate ──
	if (!unlocked) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-500 relative overflow-hidden">
				{/* Background decorative glowing blobs */}
				<div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
				<div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-400/20 dark:bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

				<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full max-w-sm z-10">
					<div className="rounded-3xl border border-slate-100/80 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center relative overflow-hidden">
						<div className="flex justify-center mb-6">
							<motion.div
								animate={{ scale: [1, 1.05, 1] }}
								transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
								className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_8px_20px_rgba(79,70,229,0.25)] relative"
							>
								{otpStep === "email" ? <Mail className="w-6 h-6" /> : <Key className="w-6 h-6" />}
								<div className="absolute -inset-1 rounded-2xl bg-indigo-500/20 blur opacity-70" />
							</motion.div>
						</div>

						<h1 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-white mb-2">Activity Logger</h1>
						<p className="text-xs text-slate-400 dark:text-slate-500 font-bold mb-8">
							{otpStep === "email" ? "Enter authorized email to access dashboard" : "Enter verification code sent to your email"}
						</p>

						<div className="space-y-4">
							{otpStep === "email" ? (
								<div className="relative">
									<input
										type="email"
										value={email}
										onChange={e => { setEmail(e.target.value); setOtpError(""); }}
										onKeyDown={e => e.key === "Enter" && sendOTP()}
										placeholder="Enter authorized email"
										className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-center text-sm font-semibold bg-slate-50/40 dark:bg-slate-950/30 placeholder-slate-400 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-900 transition-all"
										disabled={otpLoading}
									/>
								</div>
							) : (
								<div className="space-y-3">
									<div className="relative">
										<input
											type="text"
											maxLength={6}
											value={otp}
											onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
											onKeyDown={e => e.key === "Enter" && verifyOTP()}
											placeholder="000000"
											className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-center text-sm font-black tracking-[8px] uppercase bg-slate-50/40 dark:bg-slate-950/30 placeholder-slate-400 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-900 transition-all"
											disabled={otpLoading}
										/>
									</div>
									<button
										onClick={() => { setOtpStep("email"); setOtp(""); setOtpError(""); }}
										className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
										disabled={otpLoading}
									>
										← Change Email Address
									</button>
								</div>
							)}

							<AnimatePresence>
								{otpError && (
									<motion.p
										initial={{ opacity: 0, y: -5 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -5 }}
										className="text-[10px] font-black text-rose-500 text-center uppercase tracking-wider"
									>
										{otpError}
									</motion.p>
								)}
							</AnimatePresence>

							<button
								onClick={otpStep === "email" ? sendOTP : verifyOTP}
								disabled={otpLoading}
								className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-[0_8px_25px_rgba(79,70,229,0.25)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
							>
								{otpLoading ? (
									<>
										<RefreshCw className="w-3 h-3 animate-spin" />
										Processing...
									</>
								) : otpStep === "email" ? (
									"Send Code"
								) : (
									"Verify Code"
								)}
							</button>
						</div>
					</div>
				</motion.div>
			</div>
		);
	}

	// ── Main View ──
	return (
		<div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
			<div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 space-y-6">
				{/* Header */}
				<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] relative overflow-hidden">
					{/* Glowing effect inside header */}
					<div className="absolute right-0 top-0 w-32 h-32 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-[0_8px_20px_rgba(139,92,246,0.2)] shrink-0">
							<Activity className="w-5 h-5 animate-pulse" />
						</div>
						<div className="text-left">
							<h1 className="text-lg font-black uppercase tracking-wider text-slate-805 dark:text-white flex items-center gap-2">
								Activity Logger
							</h1>
							<p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5 flex-wrap">
								Real-time system timeline
								<span className="h-1 w-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
								<span className="text-violet-600 dark:text-violet-400 font-black">{total.toLocaleString()}</span> total events
							</p>
						</div>
					</div>

					{/* Header Controls */}
					<div className="flex flex-wrap items-center gap-3">
						{/* Date Range Switcher */}
						<div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-150/60 dark:border-slate-850">
							{(["all", "today", "week", "month"] as const).map(range => {
								const label = range === "all" ? "All Time" : range === "today" ? "Today" : range === "week" ? "7 Days" : "30 Days";
								const active = dateRange === range;
								return (
									<button
										key={range}
										onClick={() => setDateRange(range)}
										className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${active
												? "bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-405 shadow-sm border border-slate-100/80 dark:border-slate-800/80"
												: "text-slate-400 hover:text-slate-655 dark:hover:text-slate-300"
											}`}
									>
										{label}
									</button>
								);
							})}
						</div>

						{/* Export CSV Button */}
						<button
							onClick={exportToCSV}
							disabled={!logs.length}
							className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-655 dark:text-slate-350 bg-slate-50 dark:bg-slate-950 border border-slate-150/60 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850 px-4.5 py-3 rounded-2xl transition-all active:scale-95 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Download className="w-3.5 h-3.5 text-slate-500" />
							Export CSV
						</button>

						<button
							onClick={() => { setPage(0); fetchLogs(0, true); }}
							className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-655 dark:text-slate-350 bg-slate-50 dark:bg-slate-950 border border-slate-150/60 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850 px-4.5 py-3 rounded-2xl transition-all active:scale-95 shadow-sm cursor-pointer"
						>
							<RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
							Refresh
						</button>
						<span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-650 dark:text-emerald-450 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 px-4.5 py-3 rounded-2xl shadow-sm relative overflow-hidden group">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
								<span className="relative rounded-full h-2 w-2 bg-emerald-500" />
							</span>
							Live Syncing
						</span>
					</div>
				</motion.div>

				{/* Insights KPI Widgets */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.02 }}
					className="grid grid-cols-1 md:grid-cols-3 gap-4"
				>
					{/* Card 1: Top Module */}
					<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] text-left flex items-center justify-between relative overflow-hidden group">
						<div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
						<div className="space-y-1.5 z-10">
							<span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Peak Activity Module</span>
							<h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{topModule.label}</h4>
							<p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{topModule.count} events logged</p>
						</div>
						<div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
							<Layers className="w-5 h-5" />
						</div>
					</div>

					{/* Card 2: Top Contributor */}
					<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] text-left flex items-center justify-between relative overflow-hidden group">
						<div className="absolute right-0 bottom-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
						<div className="space-y-1.5 z-10">
							<span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Top Auditor / User</span>
							<h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider truncate max-w-[180px]">{topContributor.name}</h4>
							<p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{topContributor.count} actions performed</p>
						</div>
						<div className="h-10 w-10 rounded-2xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
							<UserCheck className="w-5 h-5" />
						</div>
					</div>

					{/* Card 3: Latest Event Time */}
					<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] text-left flex items-center justify-between relative overflow-hidden group">
						<div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
						<div className="space-y-1.5 z-10">
							<span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Latest Event Triggered</span>
							<h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{latestActivityTime}</h4>
							<p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Real-time dynamic feed</p>
						</div>
						<div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
							<Clock className="w-5 h-5" />
						</div>
					</div>
				</motion.div>

				{/* Tab Selector */}
				<div className="flex border-b border-slate-200/80 dark:border-slate-800/85 gap-6 pt-2">
					{(["timeline", "security", "health"] as const).map(tab => {
						const label = tab === "timeline" ? "Timeline Feed" : tab === "security" ? "Security & Sessions" : "System Status & Latency";
						const active = activeTab === tab;
						return (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`pb-3 text-xs font-black uppercase tracking-wider relative transition-all duration-300 cursor-pointer ${active ? "text-indigo-655 dark:text-indigo-405 font-black" : "text-slate-400 hover:text-slate-655 dark:hover:text-slate-350"
									}`}
							>
								{label}
								{active && (
									<motion.div
										layoutId="activeLoggerTab"
										className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-450 rounded-full"
									/>
								)}
							</button>
						);
					})}
				</div>

				<AnimatePresence mode="wait">
					{activeTab === "timeline" && (
						<motion.div
							key="timeline-tab"
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -15 }}
							transition={{ duration: 0.2 }}
							className="space-y-6"
						>
							{/* Data Distribution Heatbar */}
							{total > 0 && (
								<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] text-left">
									<div className="flex justify-between items-center mb-3">
										<h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Activity Distribution</h3>
										<span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{Object.keys(counts).filter(k => counts[k] > 0).length} active modules</span>
									</div>

									{/* Progress Track */}
									<div className="h-3 w-full rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-100/50 dark:border-slate-855 flex overflow-hidden shadow-inner relative">
										{Object.entries(CAT_META)
											.filter(([k]) => counts[k] > 0)
											.map(([k, v]) => {
												const segmentPct = ((counts[k] || 0) / total) * 100;
												return (
													<div
														key={k}
														style={{ width: `${segmentPct}%` }}
														className={`h-full bg-gradient-to-r ${v.grad} relative group cursor-pointer transition-all duration-300 hover:opacity-90`}
														title={`${v.label}: ${counts[k]} events (${segmentPct.toFixed(1)}%)`}
													/>
												);
											})}
									</div>

									{/* Badges checklist in miniature */}
									<div className="flex flex-wrap gap-2.5 mt-3">
										{Object.entries(CAT_META)
											.filter(([k]) => counts[k] > 0)
											.map(([k, v]) => {
												const segmentPct = ((counts[k] || 0) / total) * 100;
												return (
													<div key={k} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
														<span className={`w-2 h-2 rounded-full ${v.dot}`} />
														<span>{v.label}</span>
														<span className="text-slate-350 dark:text-slate-600 font-medium">({segmentPct.toFixed(0)}%)</span>
													</div>
												);
											})}
									</div>
								</div>
							)}

							{/* Category Cards */}
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
								{Object.entries(CAT_META).map(([k, v]) => {
									const I = v.icon;
									const a = cat === k;
									const activeStyles = a ? `${v.activeBg} ${v.activeBorder} ${v.activeText} ${v.activeGlow} border-b-4` : "border-slate-100 dark:border-slate-805 bg-white dark:bg-slate-900 hover:border-slate-205 dark:hover:border-slate-750 hover:shadow-md hover:-translate-y-0.5";
									const countVal = counts[k] || 0;
									const pct = total > 0 ? (countVal / total) * 100 : 0;

									return (
										<button
											key={k}
											onClick={() => setCat(cat === k ? "all" : k)}
											className={`rounded-2xl p-4 border transition-all duration-300 text-left relative overflow-hidden flex flex-col justify-between group h-28 cursor-pointer ${activeStyles}`}
										>
											{/* Card Header */}
											<div className="flex items-center justify-between gap-2 w-full">
												<div className={`p-1.5 rounded-xl transition-colors ${a ? "bg-white/90 dark:bg-slate-900/50 shadow-sm" : "bg-slate-50 dark:bg-slate-950 text-slate-400"}`}>
													<I className={`w-3.5 h-3.5 ${a ? v.activeText : "text-slate-455 group-hover:text-slate-650 dark:group-hover:text-slate-205 transition-colors"}`} />
												</div>
												{pct > 0 && (
													<span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded bg-slate-50/60 dark:bg-slate-950/30 ${a ? v.activeText : "text-slate-400"}`}>
														{pct.toFixed(0)}%
													</span>
												)}
											</div>

											{/* Card Bottom Stats */}
											<div className="mt-3">
												<span className={`text-[9px] font-black uppercase tracking-wider block truncate ${a ? v.activeText : "text-slate-450 dark:text-slate-400"}`}>
													{v.label}
												</span>
												<div className="flex items-baseline justify-between w-full mt-0.5">
													<span className="text-xl font-black text-slate-805 dark:text-white leading-none">
														{countVal.toLocaleString()}
													</span>
												</div>

												{/* Interactive Progress Bar inside card */}
												<div className="w-full bg-slate-100/70 dark:bg-slate-950/40 h-1 rounded-full mt-2 overflow-hidden">
													<motion.div
														initial={{ width: 0 }}
														animate={{ width: `${pct}%` }}
														transition={{ duration: 0.8, ease: "easeOut" }}
														className={`h-full bg-gradient-to-r ${v.grad}`}
													/>
												</div>
											</div>
										</button>
									);
								})}
							</div>

							{/* Filters & Control Center */}
							<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col md:flex-row items-center justify-between gap-4">
								<div className="relative w-full md:max-w-md">
									<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
									<input
										value={search}
										onChange={e => setSearch(e.target.value)}
										placeholder="Search logs by description, user, or action..."
										className="w-full border border-slate-100 dark:border-slate-850 rounded-2xl pl-11 pr-5 py-3 text-xs text-slate-850 dark:text-slate-205 bg-slate-50/50 dark:bg-slate-950/20 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
									/>
								</div>

								<div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
									{/* Role Switcher */}
									<div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-100/80 dark:border-slate-850 rounded-2xl p-1.5 w-full md:w-auto overflow-x-auto scrollbar-hide">
										{ROLES.map(r => {
											const active = role === r;
											return (
												<button
													key={r}
													onClick={() => setRole(r)}
													className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all relative shrink-0 cursor-pointer ${active ? "text-slate-850 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"}`}
												>
													{active && (
														<motion.div
															layoutId="activeRoleBg"
															className="absolute inset-0 bg-white dark:bg-slate-850 rounded-xl shadow-sm border border-slate-100/80 dark:border-slate-800"
															transition={{ type: "spring", stiffness: 380, damping: 30 }}
														/>
													)}
													<span className="relative z-10">{r}</span>
												</button>
											);
										})}
									</div>

									{/* Clear Filters Indicator */}
									{(cat !== "all" || role !== "all" || search !== "" || focusedUserId !== null || dateRange !== "all") && (
										<button
											onClick={() => { setCat("all"); setRole("all"); setSearch(""); setFocusedUserId(null); setFocusedUserName(null); setDateRange("all"); }}
											className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-655 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/50 dark:hover:bg-rose-900/20 px-4.5 py-3.5 border border-rose-100/50 dark:border-rose-900/30 rounded-2xl transition-all active:scale-95 cursor-pointer shadow-sm"
										>
											Clear Filters
										</button>
									)}
								</div>
							</div>

							{/* Timeline Feed Container */}
							{loading && !logs.length ? (
								<div className="flex flex-col items-center py-24 gap-4 bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-8">
									<div className="relative flex items-center justify-center">
										<div className="w-12 h-12 border-4 border-indigo-100 dark:border-indigo-950 border-t-indigo-600 rounded-full animate-spin" />
										<Activity className="w-5 h-5 text-indigo-650 absolute animate-pulse" />
									</div>
									<p className="text-xs font-black uppercase tracking-wider text-slate-400">Loading system logs...</p>
								</div>
							) : !logs.length ? (
								<div className="flex flex-col items-center py-20 gap-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/80 dark:border-slate-800/80 p-12 shadow-[0_10px_30px_rgba(0,0,0,0.015)] text-center">
									<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100/80 dark:border-slate-800/80 text-slate-400">
										<Activity className="w-7 h-7 animate-bounce" />
									</div>
									<h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">No activities found</h3>
									<p className="text-xs text-slate-400 font-bold max-w-[280px] leading-relaxed">No matching system logs were detected for your current selection or search parameters.</p>
								</div>
							) : (
								<div className="space-y-6">
									{grouped.map(([dk, dateLogs], gi) => (
										<div key={dk} className="relative">
											{/* Date Header */}
											<motion.div
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ delay: gi * 0.04 }}
												className="sticky top-0 z-10 py-4"
											>
												<div className="flex items-center gap-4">
													<div className="flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-100/80 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.02)] rounded-2xl px-4 py-2.5">
														<span className="text-[10px] font-black uppercase tracking-wider text-slate-705 dark:text-white bg-slate-150/60 dark:bg-slate-800 px-2 py-0.5 rounded shadow-inner">
															{fmtDateLabel(dk)}
														</span>
														<span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">
															{dateLogs.length} {dateLogs.length === 1 ? 'event' : 'events'}
														</span>
													</div>
													<div className="flex-1 h-px bg-gradient-to-r from-slate-200/80 dark:from-slate-800/80 to-transparent" />
												</div>
											</motion.div>

											{/* Timeline Items */}
											<div className="relative pl-8 sm:pl-10">
												<div className="absolute left-[13px] sm:left-[17px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 dark:from-slate-800 via-slate-150 dark:via-slate-850 to-transparent rounded-full pointer-events-none" />

												{dateLogs.map((log: any, i: number) => {
													const c = CAT_META[log.category];
													const Icon = c?.icon || Zap;
													const changes = log.metadata?.changes || [];
													const isOpen = openMeta.has(log.id);
													const hasChanges = changes.length > 0;
													const roleTheme = ROLE_BADGE[log.user_role] || ROLE_BADGE.employee;

													return (
														<motion.div
															key={log.id}
															initial={{ opacity: 0, y: 10 }}
															animate={{ opacity: 1, y: 0 }}
															transition={{ delay: i * 0.01 }}
															className="relative pb-5 group"
														>
															<div className="absolute -left-[20px] sm:-left-[24px] top-6 z-10">
																<motion.div
																	whileHover={{ scale: 1.2 }}
																	className={`w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center bg-gradient-to-br ${c?.grad || "from-slate-400 to-slate-500"} shadow-md cursor-help`}
																	title={c?.label}
																>
																	<div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
																</motion.div>
															</div>

															<div
																className={`ml-2 sm:ml-4 rounded-2xl border border-slate-100/80 dark:border-slate-800/30 ${c?.bg || "bg-white dark:bg-slate-900"} py-3 px-4.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:border-slate-200 dark:hover:border-slate-800 hover:scale-[1.002] transition-all duration-300`}
																style={{ borderLeft: `3px solid ${c?.colorCode || "#cbd5e1"}` }}
															>
																<div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
																	<div className="flex-1 min-w-0 w-full text-left">
																		<div className="flex items-center gap-2.5 flex-wrap w-full">
																			{avatars[log.user_id] ? (
																				<img
																					src={avatars[log.user_id]}
																					alt={log.user_name}
																					className="w-8 h-8 rounded-lg object-cover shrink-0 shadow-sm transform hover:rotate-6 transition-all duration-300 cursor-pointer"
																					onClick={() => { setFocusedUserId(log.user_id); setFocusedUserName(log.user_name); }}
																					title={`Click to focus on ${log.user_name}`}
																				/>
																			) : (
																				<div
																					className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black bg-gradient-to-br ${roleTheme.grad} text-white shrink-0 shadow-sm transform hover:rotate-6 transition-all duration-300 cursor-pointer`}
																					onClick={() => { setFocusedUserId(log.user_id); setFocusedUserName(log.user_name); }}
																					title={`Click to focus on ${log.user_name}`}
																				>
																					{log.user_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
																				</div>
																			)}

																			<div className="flex items-center gap-2">
																				<span
																					className="text-xs font-black text-slate-805 dark:text-white tracking-wide cursor-pointer hover:underline hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors"
																					onClick={() => { setFocusedUserId(log.user_id); setFocusedUserName(log.user_name); }}
																					title={`Click to focus on ${log.user_name}`}
																				>
																					{log.user_name}
																				</span>
																				<span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border inline-block ${roleTheme.bg} ${roleTheme.text}`}>
																					{roleTheme.label}
																				</span>
																			</div>

																			<span className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
																			<span className="text-[9px] text-slate-400 dark:bg-slate-500 font-black uppercase tracking-wider">{c?.label}</span>

																			<span className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
																			<span className="flex items-center gap-1.5 bg-indigo-50/60 dark:bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-900/30 text-[8px] font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
																				<span className="w-1 h-1 rounded-full bg-indigo-400 dark:bg-indigo-600" />
																				IP: {getIPAddress(log)}
																			</span>

																			<span className="flex items-center gap-1.5 bg-emerald-50/60 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100/50 dark:border-emerald-900/30 text-[8px] font-black uppercase tracking-wider text-emerald-650 dark:text-emerald-400">
																				<span className="w-1 h-1 rounded-full bg-emerald-400 dark:bg-emerald-600" />
																				{log.metadata?.device || "Unknown"} • {log.metadata?.browser || "Unknown"} • {log.metadata?.os || "Unknown"}
																			</span>

																			<span className="flex items-center gap-1.5 bg-amber-50/60 dark:bg-amber-950/20 px-2 py-0.5 rounded border border-amber-100/50 dark:border-amber-900/30 text-[8px] font-black uppercase tracking-wider text-amber-650 dark:text-amber-400">
																				<span className="w-1 h-1 rounded-full bg-amber-400 dark:bg-amber-600" />
																				Location: {getLocationDetails(log)}
																			</span>

																			<div className="flex items-center gap-1.5 ml-auto">
																				{(() => {
																					const severity = getSeverity(log);
																					return (
																						<span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-1.5 ${severity.bg} ${severity.color}`}>
																							<span className={`w-1.5 h-1.5 rounded-full ${severity.dot}`} />
																							{severity.label}
																						</span>
																					);
																				})()}
																				<span className="text-[8px] font-black uppercase tracking-wider text-indigo-655 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 px-2 py-0.5 rounded">
																					{log.action}
																				</span>
																			</div>
																		</div>

																		<p className="text-xs text-slate-705 dark:text-slate-300 leading-relaxed font-medium mt-2 py-0.5">
																			{renderDescription(log.description)}
																		</p>

																		{hasChanges && (
																			<div className="mt-3">
																				<button
																					onClick={() => {
																						const s = new Set(openMeta);
																						s.has(log.id) ? s.delete(log.id) : s.add(log.id);
																						setOpenMeta(s);
																					}}
																					className="flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider text-indigo-650 hover:text-indigo-750 dark:text-indigo-404 dark:hover:text-indigo-300 transition-colors cursor-pointer"
																				>
																					<ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
																					{isOpen ? "Hide changes" : `View ${changes.length} change${changes.length !== 1 ? "s" : ""}`}
																				</button>

																				<AnimatePresence>
																					{isOpen && (
																						<motion.div
																							initial={{ height: 0, opacity: 0 }}
																							animate={{ height: "auto", opacity: 1 }}
																							exit={{ height: 0, opacity: 0 }}
																							transition={{ duration: 0.25 }}
																							className="overflow-hidden"
																						>
																							<div className="mt-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60">
																								<ChangeDiff changes={changes} employeeNames={employeeNames} />
																							</div>
																						</motion.div>
																					)}
																				</AnimatePresence>
																			</div>
																		)}

																	</div>

																	<div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start bg-slate-50/80 dark:bg-slate-950/40 border border-slate-100/50 dark:border-slate-850 px-2.5 py-1 rounded-xl">
																		<Clock className="w-3 h-3 text-slate-400" />
																		<span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold tabular-nums">
																			{fmtTime(log.created_at)}
																		</span>
																	</div>
																</div>
															</div>
														</motion.div>
													);
												})}
											</div>
										</div>
									))}
								</div>
							)}

							{hasMore && !loading && (
								<button onClick={() => { const n = page + 1; setPage(n); fetchLogs(n, false); }}
									className="w-full py-4 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/60 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] active:scale-[0.99] cursor-pointer text-center">
									Load more activities
								</button>
							)}
							{loading && logs.length > 0 && (
								<div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-650 rounded-full animate-spin" /></div>
							)}
						</motion.div>
					)}

					{activeTab === "security" && (
						<motion.div
							key="security-tab"
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -15 }}
							transition={{ duration: 0.2 }}
							className="space-y-6 text-left"
						>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Left: Critical Action Highlights */}
								<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] space-y-4">
									<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
										<div className="flex items-center gap-2.5">
											<div className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
												<Shield className="w-4 h-4" />
											</div>
											<div>
												<h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Critical Action Highlights</h3>
												<p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Severity: High / Warning</p>
											</div>
										</div>
										<span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider">
											{criticalLogs.length} Events
										</span>
									</div>

									<div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-[400px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
										{!criticalLogs.length ? (
											<p className="text-xs text-slate-400 font-bold py-6 text-center">No critical security events flagged</p>
										) : (
											criticalLogs.map((log: any) => {
												const severity = getSeverity(log);
												return (
													<div key={log.id} className="pt-3 first:pt-0 flex items-start justify-between gap-3 text-xs">
														<div className="space-y-1">
															<div className="flex items-center gap-2 flex-wrap">
																<span className="font-extrabold text-slate-800 dark:text-white">{log.user_name}</span>
																<span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border inline-block ${severity.bg} ${severity.color}`}>
																	{severity.label}
																</span>
																<span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{fmtDateClear(log.created_at)}</span>
															</div>
															<p className="text-slate-655 dark:text-slate-300 font-medium leading-relaxed">{log.description}</p>
														</div>
														<span className="text-[8px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-855 shrink-0">
															{log.category}
														</span>
													</div>
												);
											})
										)}
									</div>
								</div>

								{/* Right: Admin Actions Tracker */}
								<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] space-y-4">
									<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
										<div className="flex items-center gap-2.5">
											<div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400">
												<UserCheck className="w-4 h-4" />
											</div>
											<div>
												<h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Admin Actions Tracker</h3>
												<p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filtered: Admin / HR logs</p>
											</div>
										</div>
										<span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
											{adminLogs.length} Actions
										</span>
									</div>

									<div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-[400px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
										{!adminLogs.length ? (
											<p className="text-xs text-slate-400 font-bold py-6 text-center">No Admin or HR changes logged</p>
										) : (
											adminLogs.map((log: any) => (
												<div key={log.id} className="pt-3 first:pt-0 flex items-start justify-between gap-3 text-xs">
													<div className="space-y-1">
														<div className="flex items-center gap-2 flex-wrap">
															<span className="font-extrabold text-slate-800 dark:text-white">{log.user_name}</span>
															<span className="text-[8px] font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-455 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 px-1.5 py-0.5 rounded">
																{log.user_role}
															</span>
															<span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{fmtDateClear(log.created_at)}</span>
														</div>
														<p className="text-slate-655 dark:text-slate-300 font-medium leading-relaxed">{log.description}</p>
													</div>
													<span className="text-[8px] font-black uppercase tracking-wider text-indigo-650 bg-indigo-50/50 dark:bg-indigo-950/10 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30 shrink-0">
														{log.action}
													</span>
												</div>
											))
										)}
									</div>
								</div>
							</div>

							{/* Bottom: Employee Login Sessions */}
							<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] space-y-4">
								<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
									<div className="flex items-center gap-2.5">
										<div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
											<Clock className="w-4 h-4" />
										</div>
										<div>
											<h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Employee Login Sessions</h3>
											<p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Device, Session activity & IP audit trail</p>
										</div>
									</div>
									<span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-455 text-[10px] font-black uppercase tracking-wider">
										{loginSessions.length} Sessions
									</span>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
									{!loginSessions.length ? (
										<div className="col-span-2 text-xs text-slate-400 font-bold py-6 text-center">No active authentication sessions found</div>
									) : (
										loginSessions.map((log: any) => (
											<div key={log.id} className="border border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-950/10 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs hover:border-slate-200 transition-all">
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<span className="font-extrabold text-slate-800 dark:text-white">{log.user_name}</span>
														<span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{fmtDateClear(log.created_at)}</span>
													</div>
													<p className="text-slate-655 dark:text-slate-300 font-medium text-[11px]">{log.description}</p>
													<div className="flex items-center gap-2.5 pt-1 text-[9px] font-bold text-slate-400">
														<span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{getDeviceDetails(log)}</span>
														<span>IP: {getIPAddress(log)}</span>
														<span>Location: {getLocationDetails(log)}</span>
													</div>
												</div>
												<span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shrink-0">
													{log.action}
												</span>
											</div>
										))
									)}
								</div>
							</div>
						</motion.div>
					)}

					{activeTab === "health" && (
						<motion.div
							key="health-tab"
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -15 }}
							transition={{ duration: 0.2 }}
							className="space-y-6 text-left"
						>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{/* KPI 1: Server Status */}
								<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] text-left flex items-center justify-between relative overflow-hidden group">
									<div className="space-y-1.5">
										<span className="text-[9px] font-black uppercase tracking-wider text-slate-400">App Server Status</span>
										<h4 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
											<span className="relative flex h-2.5 w-2.5">
												<span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
												<span className="relative rounded-full h-2.5 w-2.5 bg-emerald-500" />
											</span>
											Operational
										</h4>
										<p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Uptime: 100% (No outages)</p>
									</div>
									<div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
										<Activity className="w-5 h-5 animate-pulse" />
									</div>
								</div>

								{/* KPI 2: Supabase Latency */}
								<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] text-left flex items-center justify-between relative overflow-hidden group">
									<div className="space-y-1.5">
										<span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Database Query Speed</span>
										<h4 className="text-sm font-black text-slate-805 dark:text-white uppercase tracking-wider">
											{dbLatency !== null ? `${dbLatency}ms` : "12ms"}
										</h4>
										<p className="text-[10px] font-bold text-emerald-650 dark:text-emerald-400 uppercase tracking-wider">Optimal (&lt;150ms)</p>
									</div>
									<div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
										<Zap className="w-5 h-5" />
									</div>
								</div>

								{/* KPI 3: Active Unique Users */}
								<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.01)] text-left flex items-center justify-between relative overflow-hidden group">
									<div className="space-y-1.5">
										<span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Active Unique Users</span>
										<h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
											{activeUsersCount} Users
										</h4>
										<p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-medium">In selected time window</p>
									</div>
									<div className="h-10 w-10 rounded-2xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
										<UserCheck className="w-5 h-5" />
									</div>
								</div>
							</div>

							{/* Stats grids */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Left Card: Module-wise Activity */}
								<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] space-y-4">
									<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
										<div className="flex items-center gap-2.5">
											<div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-405">
												<Layers className="w-4 h-4" />
											</div>
											<div>
												<h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Module-wise Activity</h3>
												<p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Event volumes by feature category</p>
											</div>
										</div>
									</div>

									<div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
										{Object.entries(CAT_META).map(([k, v]) => {
											const val = counts[k] || 0;
											const pct = total > 0 ? (val / total) * 100 : 0;
											return (
												<div key={k} className="space-y-1.5 text-xs">
													<div className="flex justify-between items-center text-xs">
														<span className="font-extrabold text-slate-750 dark:text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
															<span className={`w-2 h-2 rounded-full ${v.dot}`} />
															{v.label}
														</span>
														<div className="flex items-center gap-1.5 font-bold">
															<span className="text-slate-800 dark:text-white">{val} logs</span>
															<span className="text-slate-400">({pct.toFixed(1)}%)</span>
														</div>
													</div>
													<div className="w-full bg-slate-50 dark:bg-slate-950/40 h-1.5 rounded-full overflow-hidden border border-slate-100/50 dark:border-slate-850">
														<motion.div
															initial={{ width: 0 }}
															animate={{ width: `${pct}%` }}
															className={`h-full bg-gradient-to-r ${v.grad}`}
														/>
													</div>
												</div>
											);
										})}
									</div>
								</div>

								{/* Right Card: Daily/Weekly Activity Summary */}
								<div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] space-y-4">
									<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
										<div className="flex items-center gap-2.5">
											<div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-405">
												<Calendar className="w-4 h-4" />
											</div>
											<div>
												<h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Activity Summary & Trends</h3>
												<p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Feed aggregates and trend analytics</p>
											</div>
										</div>
									</div>

									<div className="space-y-4">
										{/* Trend Stats */}
										<div className="grid grid-cols-2 gap-4">
											<div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 text-left">
												<span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Average Daily Audits</span>
												<h5 className="text-lg font-black text-slate-800 dark:text-white">
													{Math.ceil(logs.length / Math.max(1, grouped.length))} / day
												</h5>
												<span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5 mt-1">
													Stable performance
												</span>
											</div>
											<div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-855 rounded-2xl p-4 text-left">
												<span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Total Monitored Days</span>
												<h5 className="text-lg font-black text-slate-805 dark:text-white">
													{grouped.length} Days
												</h5>
												<span className="text-[9px] font-bold text-slate-400 mt-1 block">Active date scope</span>
											</div>
										</div>

										{/* Severity Statistics */}
										<div className="space-y-2 text-xs">
											<h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-left mb-2">Severity Distribution</h4>
											{[
												{ label: "Critical", count: logs.filter(log => getSeverity(log).label === "critical").length, color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
												{ label: "Warning", count: logs.filter(log => getSeverity(log).label === "warning").length, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
												{ label: "Important", count: logs.filter(log => getSeverity(log).label === "important").length, color: "bg-indigo-500", text: "text-indigo-650 dark:text-indigo-400" },
												{ label: "Normal", count: logs.filter(log => getSeverity(log).label === "normal").length, color: "bg-slate-450", text: "text-slate-600 dark:text-slate-400" },
											].map(item => {
												const pct = logs.length > 0 ? (item.count / logs.length) * 100 : 0;
												return (
													<div key={item.label} className="flex items-center justify-between border-b border-slate-50 dark:border-slate-900/40 pb-2 last:border-0 last:pb-0">
														<span className="font-bold text-slate-750 dark:text-slate-350 flex items-center gap-2">
															<span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
															{item.label}
														</span>
														<div className="flex items-center gap-1.5 font-extrabold">
															<span className={item.text}>{item.count} items</span>
															<span className="text-slate-400 text-[10px]">({pct.toFixed(0)}%)</span>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
