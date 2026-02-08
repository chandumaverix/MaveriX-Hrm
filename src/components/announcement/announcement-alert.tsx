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
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300'>
			<div className='relative w-full max-w-lg rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/40 dark:to-background shadow-2xl animate-in zoom-in-95 duration-300 ring-4 ring-amber-400/20'>
				<div className='relative p-6 sm:p-8'>
					<div className='flex items-center gap-3 mb-4'>
						<div className='flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg'>
							<Megaphone className='h-6 w-6' />
						</div>
						<div>
							<h2 className='text-lg font-semibold text-foreground'>
								{announcement.title || "Announcement"}
							</h2>
							<p className='text-sm text-muted-foreground'>
								{dateStr}
							</p>
						</div>
					</div>
					<p className='text-foreground whitespace-pre-wrap leading-relaxed mb-6'>
						{announcement.content}
					</p>
					{badge && (
						<p className='text-center text-xs text-muted-foreground mb-2'>
							{badge}
						</p>
					)}
					<Button
						onClick={onDismiss}
						className='w-full rounded-full bg-amber-600 hover:bg-amber-700 text-white'>
						Got it
					</Button>
				</div>
			</div>
		</div>
	);
}
