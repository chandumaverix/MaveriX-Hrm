"use client";

import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnnouncementBarProps {
	count: number;
	onView: () => void;
}

export function AnnouncementBar({ count, onView }: AnnouncementBarProps) {
	return (
		<div className='sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-4 py-2 text-amber-900 dark:text-amber-100'>
			<Megaphone className='h-4 w-4 shrink-0' />
			<span className='text-sm font-medium'>
				{count === 1
					? "1 announcement today"
					: `${count} announcements today`}
			</span>
			<Button
				size='sm'
				variant='outline'
				className='h-7 rounded-full border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50'
				onClick={onView}>
				View
			</Button>
		</div>
	);
}
