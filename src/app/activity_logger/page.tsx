"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/user-context";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Lock, ChevronDown, Clock, Shield, UserCheck, Calendar, Activity, Zap, FileText, DollarSign, Settings, Megaphone, LogOut, UserPlus, Layers, ArrowRight, RefreshCw } from "lucide-react";

const PAGE_PASSWORD = "MaveriX@123";
const ACTIVITY_LOGGER_UNLOCK_KEY = "activity_logger_unlocked";
const CATEGORIES = ["all", "auth", "employee", "leave", "payroll", "role", "document", "attendance", "announcement", "resignation", "finance", "settings", "team"] as const;
const ROLES = ["all", "admin", "hr", "employee"] as const;
const PAGE_SIZE = 20;

const CAT_META: Record<string, { label: string; grad: string; bg: string; text: string; dot: string; icon: any }> = {
	auth: { label: "Auth", grad: "from-blue-500 to-indigo-600", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", icon: Shield },
	employee: { label: "Employee", grad: "from-emerald-500 to-green-600", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", icon: UserPlus },
	leave: { label: "Leave", grad: "from-amber-500 to-orange-600", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", icon: Calendar },
	payroll: { label: "Payroll", grad: "from-violet-500 to-purple-600", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", icon: DollarSign },
	role: { label: "Role", grad: "from-rose-500 to-red-600", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", icon: UserCheck },
	document: { label: "Document", grad: "from-orange-500 to-amber-600", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", icon: FileText },
	attendance: { label: "Attendance", grad: "from-pink-500 to-rose-600", bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-500", icon: Clock },
	announcement: { label: "Announcement", grad: "from-teal-500 to-cyan-600", bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500", icon: Megaphone },
	resignation: { label: "Resignation", grad: "from-red-500 to-rose-700", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", icon: LogOut },
	finance: { label: "Finance", grad: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", icon: DollarSign },
	settings: { label: "Settings", grad: "from-slate-500 to-gray-600", bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-500", icon: Settings },
	team: { label: "Team", grad: "from-cyan-500 to-blue-600", bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500", icon: Layers },
};

const ROLE_STYLE: Record<string, string> = { admin: "bg-red-50 text-red-700", hr: "bg-blue-50 text-blue-700", employee: "bg-gray-100 text-gray-600" };

function fmtTime(ts: string) { return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }); }
function dateKey(ts: string) { return new Date(ts).toISOString().split("T")[0]; }
function fmtDateLabel(d: string) {
	const dt = new Date(d + "T00:00:00"), now = new Date(); now.setHours(0, 0, 0, 0);
	const y = new Date(now); y.setDate(y.getDate() - 1);
	if (dt.getTime() === now.getTime()) return "Today";
	if (dt.getTime() === y.getTime()) return "Yesterday";
	return dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function groupByDate(logs: any[]) {
	const g: Record<string, any[]> = {};
	for (const l of logs) { const k = dateKey(l.created_at); (g[k] ??= []).push(l); }
	return Object.entries(g).sort(([a], [b]) => b.localeCompare(a));
}
const FIELD_LABELS: Record<string, string> = { used_days: "Deducted Leave", total_days: "Total Leave Days", leave_type_id: "Leave Type", employee_id: "Employee", status: "Status", clock_in: "Clock In", clock_out: "Clock Out", total_hours: "Total Hours", start_date: "Start Date", end_date: "End Date", first_name: "First Name", last_name: "Last Name", designation: "Designation", department: "Department", role: "Role", reason: "Reason", last_working_day: "Last Working Day" }; function prettifyField(f: string) { return FIELD_LABELS[f] || f.replace(/_/g, " ").replace(/\bid\b/gi, "ID").replace(/\b\w/g, c => c.toUpperCase()); }

/* ── Change Diff component ── */
function ChangeDiff({ changes }: { changes: { field: string; from: string; to: string }[] }) {
	if (!changes?.length) return null;
	return (
		<div className="mt-1.5 space-y-1">
			{changes.map((c, i) => (
				<div key={i} className="flex items-center gap-1.5 text-[11px] flex-wrap">
					<span className="font-medium text-gray-500 min-w-[70px]">{prettifyField(c.field)}</span>
					<span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 line-through max-w-[180px] truncate" title={c.from}>{c.from || "(empty)"}</span>
					<ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
					<span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 font-medium max-w-[180px] truncate" title={c.to}>{c.to || "(empty)"}</span>
				</div>
			))}
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
	const [pw, setPw] = useState("");
	const [unlocked, setUnlocked] = useState(false);
	const [pwErr, setPwErr] = useState("");
	const [openMeta, setOpenMeta] = useState<Set<string>>(new Set());

	const hasAccess = employee && unlocked;

	// useEffect(() => { if (!employee) router.push("/auth/login"); }, [employee, router]);
	useEffect(() => { if (typeof window !== "undefined" && window.localStorage.getItem(ACTIVITY_LOGGER_UNLOCK_KEY) === "true") setUnlocked(true); }, []);

	useEffect(() => {
		if (!hasAccess) return;
		supabase.from("activity_logs").select("category").then(({ data }) => {
			if (!data) return;
			const c: Record<string, number> = {};
			data.forEach(r => { c[r.category] = (c[r.category] || 0) + 1; });
			setCounts(c);
		});
	}, [hasAccess, supabase]);

	const fetchLogs = useCallback(async (p: number, reset: boolean) => {
		if (!hasAccess) return;
		setLoading(true);
		let q = supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);
		if (role !== "all") q = q.eq("user_role", role);
		if (cat !== "all") q = q.eq("category", cat);
		if (search) q = q.ilike("description", `%${search}%`);
		const { data } = await q;
		if (data) { setLogs(reset ? data : prev => [...prev, ...data]); setHasMore(data.length === PAGE_SIZE); }
		setLoading(false);
	}, [hasAccess, role, cat, search, supabase]);

	useEffect(() => { if (!hasAccess) return; setPage(0); fetchLogs(0, true); }, [hasAccess, role, cat, search, fetchLogs]);

	useEffect(() => {
		if (!hasAccess) return;
		const ch = supabase.channel("hrm_activity").on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, (p) => {
			setLogs(prev => {
				if (role !== "all" && p.new.user_role !== role) return prev;
				if (cat !== "all" && p.new.category !== cat) return prev;
				if (search && !p.new.description?.toLowerCase().includes(search.toLowerCase())) return prev;
				return [p.new, ...prev];
			});
			setCounts(prev => ({ ...prev, [p.new.category]: (prev[p.new.category] || 0) + 1 }));
		}).subscribe();
		return () => { supabase.removeChannel(ch); };
	}, [hasAccess, role, cat, search, supabase]);

	const tryUnlock = () => {
		if (pw === PAGE_PASSWORD) { setUnlocked(true); setPwErr(""); if (typeof window !== "undefined") window.localStorage.setItem(ACTIVITY_LOGGER_UNLOCK_KEY, "true"); }
		else setPwErr("Incorrect password");
	};

	const grouped = useMemo(() => groupByDate(logs), [logs]);
	const total = Object.values(counts).reduce((a, b) => a + b, 0);

	// ── Password Gate ──
	if (!unlocked) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc] dark:bg-slate-950">
				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
					<div className="rounded-3xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.015)] text-center">
						<div className="flex justify-center mb-6">
							<div className="w-12 h-12 rounded-2xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-450 shadow-[0_2px_8px_rgba(37,99,235,0.05)]">
								<Lock className="w-5 h-5" />
							</div>
						</div>
						<h1 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white mb-1">Activity Logger</h1>
						<p className="text-[10px] text-slate-400 font-bold mb-6">Enter password to access system logs</p>
						<input type="password" value={pw} onChange={e => { setPw(e.target.value); setPwErr(""); }}
							onKeyDown={e => e.key === "Enter" && tryUnlock()} placeholder="Enter password"
							className="w-full border border-slate-100 dark:border-slate-800/60 rounded-2xl px-4 py-3 text-xs bg-slate-50/40 dark:bg-slate-950/10 placeholder-slate-400 text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white dark:focus:bg-slate-900 transition-all mb-4" />
						<AnimatePresence>{pwErr && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] font-bold text-rose-500 text-center mb-3">{pwErr}</motion.p>}</AnimatePresence>
						<button onClick={tryUnlock} className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-[0_4px_12px_rgba(37,99,235,0.15)] active:scale-95 transition-all">Unlock Dashboard</button>
					</div>
				</motion.div>
			</div>
		);
	}

	// ── Main View ──
	return (
		<div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
				{/* Header */}
				<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-xl font-black uppercase tracking-wider text-slate-850 dark:text-white flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50/80 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-900/30 text-violet-600 dark:text-violet-400 shadow-[0_2px_8px_rgba(124,58,237,0.05)] shrink-0">
								<Activity className="w-5 h-5" />
							</div>
							Activity Logger
						</h1>
						<p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">
							Real-time system timeline &middot; <span className="text-slate-650 dark:text-slate-350">{total.toLocaleString()}</span> events
						</p>
					</div>
					<div className="flex items-center gap-2.5">
						<button
							onClick={() => { setPage(0); fetchLogs(0, true); }}
							className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-405 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 py-2.5 rounded-2xl transition-all active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
							Refresh
						</button>
						<span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-650 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 px-4 py-2.5 rounded-2xl">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
								<span className="relative rounded-full h-2 w-2 bg-emerald-500" />
							</span>
							Live Syncing
						</span>
					</div>
				</motion.div>

				{/* Category Cards */}
				<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
					{Object.entries(CAT_META).map(([k, v]) => {
						const I = v.icon; const a = cat === k; return (
							<button key={k} onClick={() => setCat(cat === k ? "all" : k)}
								className={`rounded-2xl p-4 border transition-all text-left duration-200 relative overflow-hidden ${a 
									? "border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-100 dark:ring-blue-900/40 shadow-[0_4px_20px_rgba(37,99,235,0.03)]" 
									: "border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 hover:scale-[1.01] shadow-[0_4px_24px_rgba(0,0,0,0.015)]"}`}>
								<div className="flex items-center gap-2 mb-2">
									<div className={`p-1.5 rounded-lg ${a ? "bg-blue-100/50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-505"}`}>
										<I className="w-3.5 h-3.5" />
									</div>
									<span className={`text-[9px] font-black uppercase tracking-wider ${a ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}>{v.label}</span>
								</div>
								<div className="text-2xl font-black text-slate-800 dark:text-white leading-none mt-1">{counts[k] || 0}</div>
							</button>
						);
					})}
				</motion.div>

				{/* Filters */}
				<div className="flex flex-wrap gap-4 items-center justify-between">
					<div className="relative flex-1 min-w-[240px] max-w-sm">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
						<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activities by description..."
							className="w-full border border-slate-100 dark:border-slate-800/60 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-750 dark:text-slate-350 bg-white dark:bg-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)]" />
					</div>
					<div className="flex flex-wrap gap-3 items-center">
						<div className="flex gap-1 bg-slate-100/70 dark:bg-slate-900 border border-slate-150/40 dark:border-slate-800/40 rounded-2xl p-1">
							{ROLES.map(r => (
								<button key={r} onClick={() => setRole(r)} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${role === r ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "text-slate-400 hover:text-slate-650 dark:hover:text-slate-300"}`}>{r}</button>
							))}
						</div>
						<div className="flex gap-1.5 flex-wrap">
							{CATEGORIES.map(c => (
								<button key={c} onClick={() => setCat(c)} className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${cat === c ? "bg-blue-600 text-white border-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.15)]" : "bg-white dark:bg-slate-900 text-slate-450 dark:text-slate-400 border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-850"}`}>{c}</button>
							))}
						</div>
					</div>
				</div>

				{/* Timeline */}
				{loading && !logs.length ? (
					<div className="flex flex-col items-center py-20 gap-3">
						<div className="w-7 h-7 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
						<p className="text-xs font-bold text-slate-400">Loading activities...</p>
					</div>
				) : !logs.length ? (
					<div className="flex flex-col items-center py-20 gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.015)]">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/40 text-slate-405">
							<Activity className="w-6 h-6" />
						</div>
						<p className="text-xs font-bold text-slate-700 dark:text-slate-300">No activities found</p>
						<p className="text-[10px] text-slate-400 font-bold max-w-[200px] text-center mt-1">Try adjusting your filters or search query to find matching events.</p>
					</div>
				) : (
					<div className="space-y-0">
						{grouped.map(([dk, dateLogs], gi) => (
							<div key={dk}>
								{/* Date Header */}
								<motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: gi * 0.04 }} className="sticky top-0 z-10 py-3">
									<div className="flex items-center gap-3">
										<div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.015)] rounded-2xl px-4 py-2">
											<Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-450" />
											<span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-205">{fmtDateLabel(dk)}</span>
											<span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">{dateLogs.length} event{dateLogs.length !== 1 && "s"}</span>
										</div>
										<div className="flex-1 h-px bg-gradient-to-r from-slate-200/60 dark:from-slate-800/60 to-transparent" />
									</div>
								</motion.div>

								{/* Timeline Items */}
								<div className="relative pl-7 sm:pl-9">
									{/* Vertical line */}
									<div className="absolute left-[13px] sm:left-[17px] top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800/60 rounded-full" />

									{dateLogs.map((log: any, i: number) => {
										const c = CAT_META[log.category];
										const Icon = c?.icon || Zap;
										const changes = log.metadata?.changes || [];
										const isOpen = openMeta.has(log.id);
										const hasChanges = changes.length > 0;

										return (
											<motion.div key={log.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }} className="relative pb-1.5 group">
												{/* Dot */}
												<div className="absolute -left-[20px] sm:-left-[24px] top-5 z-10">
													<div className={`w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center bg-gradient-to-br ${c?.grad || "from-slate-400 to-slate-500"} shadow-sm`}>
														{/* Tiny dot inner */}
														<div className="w-1.5 h-1.5 rounded-full bg-white" />
													</div>
												</div>

												{/* Card */}
												<div className="ml-2 sm:ml-4 mb-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-5 hover:shadow-[0_6px_30px_rgba(0,0,0,0.02)] transition-all duration-300">
													<div className="flex items-start justify-between gap-4">
														<div className="flex-1 min-w-0">
															{/* Who + Badges */}
															<div className="flex items-center gap-2.5 flex-wrap mb-2">
																<div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 shrink-0 shadow-sm`}>
																	{log.user_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
																</div>

																<div className="flex flex-col text-left">
																	<span className="text-xs font-bold text-slate-800 dark:text-white leading-none">{log.user_name}</span>
																	<span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{log.user_role}</span>
																</div>

																<div className="flex items-center gap-1.5 ml-auto sm:ml-2">
																	<span className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 px-2.5 py-0.5 rounded-md">{log.action}</span>
																	<span className={`text-[9px] font-black uppercase tracking-wider ${c?.bg} ${c?.text} border border-slate-105/80 dark:border-slate-800/40 px-2.5 py-0.5 rounded-md`}>{c?.label}</span>
																</div>
															</div>

															{/* Description */}
															<p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold mt-2.5 text-left">{log.description}</p>

															{/* Changes diff */}
															{hasChanges && (
																<div className="mt-3">
																	<button onClick={() => { const s = new Set(openMeta); s.has(log.id) ? s.delete(log.id) : s.add(log.id); setOpenMeta(s); }}
																		className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 dark:text-blue-450 dark:hover:text-blue-400 transition-colors">
																		<ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
																		{isOpen ? "Hide" : "View"} {changes.length} change{changes.length !== 1 && "s"}
																	</button>
																	<AnimatePresence>
																		{isOpen && (
																			<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
																				className="overflow-hidden">
																				<div className="mt-2.5 px-3.5 py-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60">
																					<ChangeDiff changes={changes} />
																				</div>
																			</motion.div>
																		)}
																	</AnimatePresence>
																</div>
															)}

															{/* Legacy metadata fallback */}
															{!hasChanges && log.metadata && Object.keys(log.metadata).length > 0 && !log.metadata?.changes && (
																<details className="mt-3 group/raw">
																	<summary className="text-[9px] font-black uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-500 select-none">Raw details</summary>
																	<pre className="text-[10px] bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60 rounded-xl p-3 mt-2 overflow-auto text-slate-500 dark:text-slate-450 font-mono scrollbar-hide">{JSON.stringify(log.metadata, null, 2)}</pre>
																</details>
															)}
														</div>

														{/* Time */}
														<div className="flex items-center gap-1.5 shrink-0 pt-0.5">
															<Clock className="w-3.5 h-3.5 text-slate-400" />
															<span className="text-[10px] text-slate-500 font-bold tabular-nums">{fmtTime(log.created_at)}</span>
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

				{/* Load More */}
				{hasMore && !loading && (
					<button onClick={() => { const n = page + 1; setPage(n); fetchLogs(n, false); }}
						className="w-full py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/60 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] active:scale-[0.99]">
						Load more activities
					</button>
				)}
				{loading && logs.length > 0 && (
					<div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>
				)}
			</div>
		</div>
	);
}
