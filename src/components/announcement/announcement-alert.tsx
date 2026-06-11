"use client";

import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Announcement } from "@/lib/types";

interface AnnouncementAlertProps {
	announcement: Announcement;
	onDismiss: () => void;
	/** e.g. "1 of 2" when multiple */
	badge?: string;
}

export function AnnouncementAlert({
	announcement,
	onDismiss,
	badge,
}: AnnouncementAlertProps) {
	const dateStr = new Date(announcement.date + "Z").toLocaleDateString(
		"en-US",
		{
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		}
	);

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200'>
			<div className='relative flex flex-col w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-background shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] sm:max-h-[500px] overflow-hidden'>
				{/* Header */}
				<div className='flex items-center gap-3 p-5 border-b border-slate-100 dark:border-slate-800/60'>
					<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'>
						<Megaphone className='h-5 w-5' />
					</div>
					<div className='min-w-0 flex-1'>
						<h2 className='text-base font-semibold text-foreground truncate'>
							{announcement.title || "Announcement"}
						</h2>
						<p className='text-xs text-muted-foreground mt-0.5'>
							{dateStr}
						</p>
					</div>
				</div>

				{/* Scrollable Content Container */}
				<div className='flex-1 overflow-y-auto p-5 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed'>
					{announcement.content}
				</div>

				{/* Footer */}
				<div className='p-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col gap-2'>
					{badge && (
						<p className='text-center text-xs text-muted-foreground font-medium mb-1'>
							{badge}
						</p>
					)}
					<Button
						onClick={onDismiss}
						className='w-full rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium h-10 transition-colors'>
						Got it
					</Button>
				</div>
			</div>
		</div>
	);
}
