"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/user-context";

const PAGE_PASSWORD = "MaveriX@123";
const ACTIVITY_LOGGER_UNLOCK_KEY = "activity_logger_unlocked";

const CATEGORIES = [
	"all",
	"auth",
	"employee",
	"leave",
	"payroll",
	"role",
	"document",
	"attendance",
	"announcement",
	"resignation",
	"finance",
	"settings",
	"team",
] as const;

const ROLES = ["all", "admin", "hr", "employee"] as const;

const CAT_META: Record<string, { label: string; color: string }> = {
	auth: { label: "Auth", color: "bg-blue-50 text-blue-700" },
	employee: { label: "Employee", color: "bg-green-50 text-green-700" },
	leave: { label: "Leave", color: "bg-amber-50 text-amber-700" },
	payroll: { label: "Payroll", color: "bg-purple-50 text-purple-700" },
	role: { label: "Role", color: "bg-red-50 text-red-700" },
	document: { label: "Document", color: "bg-orange-50 text-orange-700" },
	attendance: { label: "Attendance", color: "bg-pink-50 text-pink-700" },
	announcement: { label: "Announcement", color: "bg-teal-50 text-teal-700" },
	resignation: { label: "Resignation", color: "bg-red-50 text-red-800" },
	finance: { label: "Finance", color: "bg-emerald-50 text-emerald-700" },
	settings: { label: "Settings", color: "bg-slate-50 text-slate-700" },
	team: { label: "Team", color: "bg-cyan-50 text-cyan-700" },
};

const ROLE_COLOR: Record<string, string> = {
	admin: "bg-red-50 text-red-700",
	hr: "bg-blue-50 text-blue-700",
	employee: "bg-gray-100 text-gray-600",
};

function timeAgo(ts: string) {
	const diff = Date.now() - new Date(ts).getTime();
	const m = Math.floor(diff / 60000);
	if (m < 1) return "just now";
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.floor(h / 24)}d ago`;
}

const PAGE_SIZE = 20;

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
	const [passwordInput, setPasswordInput] = useState("");
	const [isPasswordUnlocked, setIsPasswordUnlocked] = useState(false);
	const [passwordError, setPasswordError] = useState("");

	const hasAccess = employee && isPasswordUnlocked;

	useEffect(() => {
		if (!employee) {
			router.push("/auth/login");
		}
	}, [employee, router]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const unlocked = window.localStorage.getItem(
			ACTIVITY_LOGGER_UNLOCK_KEY,
		);
		if (unlocked === "true") {
			setIsPasswordUnlocked(true);
		}
	}, []);

	// Fetch category counts
	useEffect(() => {
		if (!hasAccess) return;
		supabase
			.from("activity_logs")
			.select("category")
			.then(({ data }) => {
				if (!data) return;
				const c: Record<string, number> = {};
				data.forEach((r) => {
					c[r.category] = (c[r.category] || 0) + 1;
				});
				setCounts(c);
			});
	}, [hasAccess, supabase]);

	const fetchLogs = useCallback(
		async (pageNum: number, isReset: boolean) => {
			if (!hasAccess) return;
			setLoading(true);
			let q = supabase
				.from("activity_logs")
				.select("*")
				.order("created_at", { ascending: false })
				.range(
					pageNum * PAGE_SIZE,
					pageNum * PAGE_SIZE + PAGE_SIZE - 1,
				);

			if (role !== "all") q = q.eq("user_role", role);
			if (cat !== "all") q = q.eq("category", cat);
			if (search) q = q.ilike("description", `%${search}%`);

			const { data } = await q;
			if (data) {
				setLogs(isReset ? data : (prev) => [...prev, ...data]);
				setHasMore(data.length === PAGE_SIZE);
			}
			setLoading(false);
		},
		[hasAccess, role, cat, search, supabase],
	);

	useEffect(() => {
		if (!hasAccess) return;
		setPage(0);
		fetchLogs(0, true);
	}, [hasAccess, role, cat, search, fetchLogs]);

	// Real-time
	useEffect(() => {
		if (!hasAccess) return;
		const ch = supabase
			.channel("hrm_activity")
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "activity_logs" },
				(p) => {
					setLogs((prev) => {
						if (role !== "all" && p.new.user_role !== role)
							return prev;
						if (cat !== "all" && p.new.category !== cat)
							return prev;
						if (
							search &&
							!p.new.description
								?.toLowerCase()
								.includes(search.toLowerCase())
						)
							return prev;
						return [p.new, ...prev];
					});
					setCounts((prev) => ({
						...prev,
						[p.new.category]: (prev[p.new.category] || 0) + 1,
					}));
				},
			)
			.subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [hasAccess, role, cat, search, supabase]);

	if (!isPasswordUnlocked) {
		return (
			<div className='max-w-md mx-auto p-6'>
				<div className='rounded-xl border border-gray-200 bg-white p-5 space-y-4'>
					<div>
						<h1 className='text-base font-semibold text-gray-900'>
							Protected Activity Log
						</h1>
						<p className='text-sm text-gray-500 mt-1'>
							Enter password to view logs.
						</p>
					</div>
					<input
						type='password'
						value={passwordInput}
						onChange={(e) => {
							setPasswordInput(e.target.value);
							setPasswordError("");
						}}
						placeholder='Enter page password'
						className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300'
					/>
					{passwordError && (
						<p className='text-xs text-red-600'>{passwordError}</p>
					)}
					<button
						onClick={() => {
							if (passwordInput === PAGE_PASSWORD) {
								setIsPasswordUnlocked(true);
								setPasswordError("");
								if (typeof window !== "undefined") {
									window.localStorage.setItem(
										ACTIVITY_LOGGER_UNLOCK_KEY,
										"true",
									);
								}
								return;
							}
							setPasswordError("Incorrect password");
						}}
						className='w-full px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800'>
						Unlock
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className='max-w-5xl mx-auto p-6 space-y-5'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-xl font-semibold text-gray-900'>
						Activity Log
					</h1>
					<p className='text-sm text-gray-500 mt-0.5'>
						Every action across your HRM in real time
					</p>
				</div>
				<span className='flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full'>
					<span className='w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse' />
					Live
				</span>
			</div>

			{/* Category stat cards */}
			<div className='grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2'>
				{Object.entries(CAT_META).map(([k, v]) => (
					<button
						key={k}
						onClick={() => setCat(cat === k ? "all" : k)}
						className={`rounded-xl p-2.5 border transition-all text-left ${
							cat === k
								? "border-gray-400 ring-1 ring-gray-300"
								: "border-gray-100 hover:border-gray-200"
						} bg-white`}>
						<div
							className={`text-xs font-medium ${v.color} px-1.5 py-0.5 rounded-md inline-block mb-1`}>
							{v.label}
						</div>
						<div className='text-lg font-semibold text-gray-900'>
							{counts[k] || 0}
						</div>
					</button>
				))}
			</div>

			{/* Filters */}
			<div className='flex flex-wrap gap-2 items-center'>
				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder='Search activities...'
					className='border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-gray-300'
				/>

				<div className='flex gap-1 bg-gray-100 rounded-lg p-1'>
					{ROLES.map((r) => (
						<button
							key={r}
							onClick={() => setRole(r)}
							className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
								role === r
									? "bg-white shadow text-gray-900"
									: "text-gray-500 hover:text-gray-700"
							}`}>
							{r}
						</button>
					))}
				</div>

				<div className='flex gap-1 flex-wrap'>
					{CATEGORIES.map((c) => (
						<button
							key={c}
							onClick={() => setCat(c)}
							className={`px-2.5 py-1 rounded-full text-xs capitalize transition-all border ${
								cat === c
									? "bg-gray-800 text-white border-gray-800"
									: "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
							}`}>
							{c}
						</button>
					))}
				</div>
			</div>

			{/* Feed */}
			<div className='space-y-1.5'>
				{loading && !logs.length ? (
					<div className='text-center py-16 text-gray-400 text-sm'>
						Loading...
					</div>
				) : !logs.length ? (
					<div className='text-center py-16 text-gray-400 text-sm'>
						No activities found
					</div>
				) : (
					logs.map((log) => {
						const c = CAT_META[log.category];
						return (
							<div
								key={log.id}
								className='flex gap-3 bg-white border border-gray-100 hover:border-gray-200 rounded-xl p-3.5 transition-colors'>
								<div
									className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${c?.color}`}>
									{log.user_name
										?.split(" ")
										.map((n: string) => n[0])
										.join("")
										.slice(0, 2)
										.toUpperCase()}
								</div>
								<div className='flex-1 min-w-0'>
									<div className='flex items-center gap-1.5 flex-wrap mb-0.5'>
										<span className='text-sm font-medium text-gray-900'>
											{log.user_name}
										</span>
										<span
											className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${ROLE_COLOR[log.user_role]}`}>
											{log.user_role}
										</span>
										<span
											className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c?.color}`}>
											{c?.label}
										</span>
									</div>
									<p className='text-sm text-gray-600'>
										{log.description}
									</p>
									{log.metadata &&
										Object.keys(log.metadata).length >
											0 && (
											<details className='mt-1'>
												<summary className='text-xs text-gray-400 cursor-pointer hover:text-gray-600'>
													Details
												</summary>
												<pre className='text-xs bg-gray-50 rounded-lg p-2 mt-1 overflow-auto text-gray-500'>
													{JSON.stringify(
														log.metadata,
														null,
														2,
													)}
												</pre>
											</details>
										)}
								</div>
								<span className='text-xs text-gray-400 shrink-0 pt-0.5'>
									{timeAgo(log.created_at)}
								</span>
							</div>
						);
					})
				)}
			</div>

			{hasMore && !loading && (
				<button
					onClick={() => {
						const nextPage = page + 1;
						setPage(nextPage);
						fetchLogs(nextPage, false);
					}}
					className='w-full py-2 text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-colors'>
					Load more
				</button>
			)}
		</div>
	);
}
