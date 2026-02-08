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
		<Card className={cn("rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden", className)}>
			<CardContent className="p-5">
				<div className="flex items-start justify-between gap-3">
					<div className="space-y-1 min-w-0">
						<p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
						<div className="flex items-baseline gap-2">
							<h3 className="text-lg font-bold md:text-2xl tabular-nums text-foreground">{value}</h3>
							{trend && (
								<span className={cn("text-xs font-medium", trend.isPositive ? "text-success" : "text-destructive")}>
									{trend.isPositive ? "+" : ""}{trend.value}%
								</span>
							)}
						</div>
						{description && <p className="text-xs text-muted-foreground">{description}</p>}
					</div>
					<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
						{icon}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
