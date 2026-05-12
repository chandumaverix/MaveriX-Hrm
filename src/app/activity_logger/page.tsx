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
			<div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-white to-violet-50/40">
				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
					<div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl shadow-gray-200/50">
						<div className="flex justify-center mb-6">
							<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
								<Lock className="w-6 h-6 text-white" />
							</div>
						</div>
						<h1 className="text-lg font-bold text-gray-900 text-center mb-1">Activity Logger</h1>
						<p className="text-sm text-gray-500 text-center mb-6">Enter password to access system logs</p>
						<input type="password" value={pw} onChange={e => { setPw(e.target.value); setPwErr(""); }}
							onKeyDown={e => e.key === "Enter" && tryUnlock()} placeholder="Enter password"
							className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all mb-3" />
						<AnimatePresence>{pwErr && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-red-500 text-center mb-2">{pwErr}</motion.p>}</AnimatePresence>
						<button onClick={tryUnlock} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-200 active:scale-[0.98]">Unlock</button>
					</div>
				</motion.div>
			</div>
		);
	}

	// ── Main View ──
	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50/30">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
				{/* Header */}
				<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
							<Activity className="w-6 h-6 text-violet-600" /> Activity Logger
						</h1>
						<p className="text-sm text-gray-500 mt-1">Real-time system timeline &middot; <span className="font-medium text-gray-700">{total.toLocaleString()}</span> events</p>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => { setPage(0); fetchLogs(0, true); }}
							className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-full transition-all active:scale-95 shadow-sm"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
							Refresh
						</button>
						<span className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
							<span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative rounded-full h-2 w-2 bg-emerald-500" /></span>
							Live
						</span>
					</div>
				</motion.div>

				{/* Category Cards */}
				<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
					{Object.entries(CAT_META).map(([k, v]) => {
						const I = v.icon; const a = cat === k; return (
							<button key={k} onClick={() => setCat(cat === k ? "all" : k)}
								className={`rounded-xl p-3 border transition-all text-left ${a ? "border-violet-300 bg-violet-50 ring-1 ring-violet-200" : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"}`}>
								<div className="flex items-center gap-1.5 mb-1"><I className={`w-3.5 h-3.5 ${v.text}`} /><span className={`text-[11px] font-semibold ${v.text}`}>{v.label}</span></div>
								<div className="text-lg font-bold text-gray-900">{counts[k] || 0}</div>
							</button>
						);
					})}
				</motion.div>

				{/* Filters */}
				<div className="flex flex-wrap gap-3 items-center">
					<div className="relative flex-1 min-w-[200px] max-w-xs">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
						<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activities..."
							className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
					</div>
					<div className="flex gap-1 bg-gray-100 rounded-xl p-1">
						{ROLES.map(r => (
							<button key={r} onClick={() => setRole(r)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${role === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{r}</button>
						))}
					</div>
					<div className="flex gap-1.5 flex-wrap">
						{CATEGORIES.map(c => (
							<button key={c} onClick={() => setCat(c)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize transition-all border ${cat === c ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>{c}</button>
						))}
					</div>
				</div>

				{/* Timeline */}
				{loading && !logs.length ? (
					<div className="flex flex-col items-center py-20 gap-3">
						<div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
						<p className="text-sm text-gray-400">Loading...</p>
					</div>
				) : !logs.length ? (
					<div className="flex flex-col items-center py-20 gap-3">
						<Activity className="w-10 h-10 text-gray-300" />
						<p className="text-sm text-gray-400">No activities found</p>
					</div>
				) : (
					<div className="space-y-0">
						{grouped.map(([dk, dateLogs], gi) => (
							<div key={dk}>
								{/* Date Header */}
								<motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: gi * 0.04 }} className="sticky top-0 z-10 py-3">
									<div className="flex items-center gap-3">
										<div className="flex items-center gap-2 bg-white border border-violet-200 shadow-sm rounded-full px-4 py-1.5">
											<Calendar className="w-3.5 h-3.5 text-violet-600" />
											<span className="text-xs font-bold text-violet-700">{fmtDateLabel(dk)}</span>
											<span className="text-[10px] text-violet-400 font-medium">{dateLogs.length} event{dateLogs.length !== 1 && "s"}</span>
										</div>
										<div className="flex-1 h-px bg-gradient-to-r from-violet-200 to-transparent" />
									</div>
								</motion.div>

								{/* Timeline Items */}
								<div className="relative pl-7 sm:pl-9">
									{/* Vertical line */}
									<div className="absolute left-[11px] sm:left-[15px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-200 via-gray-200 to-transparent rounded-full" />

									{dateLogs.map((log: any, i: number) => {
										const c = CAT_META[log.category];
										const Icon = c?.icon || Zap;
										const changes = log.metadata?.changes || [];
										const targetName = log.metadata?.target_name;
										const operation = log.metadata?.operation || log.action;
										const isOpen = openMeta.has(log.id);
										const hasChanges = changes.length > 0;

										return (
											<motion.div key={log.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }} className="relative pb-1 group">
												{/* Dot */}
												<div className="absolute -left-7 sm:-left-9 top-4">
													<div className={`w-[22px] h-[22px] sm:w-[26px] sm:h-[26px] rounded-full border-[3px] border-white flex items-center justify-center bg-gradient-to-br ${c?.grad || "from-gray-400 to-gray-500"} shadow-md`}>
														<Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
													</div>
												</div>

												{/* Card */}
												<div className="ml-2 sm:ml-3 mb-1.5 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-md transition-all px-3.5 py-2.5 group-hover:shadow-lg group-hover:shadow-gray-100">
													<div className="flex items-start justify-between gap-3">
														<div className="flex-1 min-w-0">
															{/* Who + Badges */}
															<div className="flex items-center gap-2.5 flex-wrap mb-1.5">
																<div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold bg-gradient-to-br ${c?.grad || "from-gray-400 to-gray-500"} text-white shrink-0 shadow-sm ring-2 ring-white`}>
																	{log.user_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
																</div>

																<span className="text-[15px] font-bold text-gray-900 tracking-tight">{log.user_name}</span>
																{/* Action badge */}
																<span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">{log.action}</span>
																{/* {targetName && <span className="text-xs text-gray-500 ml-2">for <span className="font-semibold text-gray-700">{targetName}</span></span>} */}
																<span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${ROLE_STYLE[log.user_role] || "bg-gray-100 text-gray-600"}`}>{log.user_role}</span>
																<span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c?.bg} ${c?.text}`}>{c?.label}</span>
															</div>


															{/* Description */}
															<p className="text-sm text-gray-600 leading-relaxed">{log.description}</p>

															{/* Changes diff */}
															{hasChanges && (
																<div className="mt-2">
																	<button onClick={() => { const s = new Set(openMeta); s.has(log.id) ? s.delete(log.id) : s.add(log.id); setOpenMeta(s); }}
																		className="flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-800 transition-colors">
																		<ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
																		{isOpen ? "Hide" : "View"} {changes.length} change{changes.length !== 1 && "s"}
																	</button>
																	<AnimatePresence>
																		{isOpen && (
																			<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
																				className="overflow-hidden">
																				<div className="mt-1.5 px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-100">
																					<ChangeDiff changes={changes} />
																				</div>
																			</motion.div>
																		)}
																	</AnimatePresence>
																</div>
															)}

															{/* Legacy metadata fallback */}
															{!hasChanges && log.metadata && Object.keys(log.metadata).length > 0 && !log.metadata?.changes && (
																<details className="mt-2">
																	<summary className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-600">Raw details</summary>
																	<pre className="text-[11px] bg-gray-50 rounded-lg p-2 mt-1 overflow-auto text-gray-500">{JSON.stringify(log.metadata, null, 2)}</pre>
																</details>
															)}
														</div>

														{/* Time */}
														<div className="flex items-center gap-1.5 shrink-0 pt-0.5">
															<Clock className="w-3 h-3 text-gray-400" />
															<span className="text-[11px] text-gray-500 font-medium tabular-nums">{fmtTime(log.created_at)}</span>
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
						className="w-full py-3 text-sm font-medium text-gray-500 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl transition-all shadow-sm">
						Load more activities
					</button>
				)}
				{loading && logs.length > 0 && (
					<div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" /></div>
				)}
			</div>
		</div>
	);
}
