import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
	title: string;
	value: string | number;
	description?: string;
	icon: React.ReactNode;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	className?: string;
}

export function StatCard({
	title,
	value,
	description,
	icon,
	trend,
	className,
}: StatCardProps) {
	return (
		<Card className={cn("bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col justify-between text-left", className)}>
			<div className="flex justify-between items-center w-full">
				<span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">{title}</span>
				<div className="w-8 h-8 rounded-lg flex items-center justify-center border border-primary/10 bg-primary/5 text-primary shrink-0">
					{icon}
				</div>
			</div>
			<div className="mt-4 flex flex-col items-start">
				<div className="flex items-baseline gap-2">
					<h2 className="text-2xl font-black text-slate-800 dark:text-white leading-none tabular-nums">{value}</h2>
					{trend && (
						<span className={cn("inline-block text-[9px] font-black uppercase tracking-wide border px-2 py-0.5 rounded-md", trend.isPositive ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100")}>
							{trend.isPositive ? "+" : ""}{trend.value}%
						</span>
					)}
				</div>
				{description && (
					<span className="inline-block text-[9px] font-black uppercase tracking-wide border border-slate-100 dark:border-slate-800/60 px-2 py-0.5 rounded-md mt-2 text-slate-500 bg-slate-50 dark:bg-slate-950/20">
						{description}
					</span>
				)}
			</div>
		</Card>
	);
}
