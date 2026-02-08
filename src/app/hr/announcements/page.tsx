"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { AnnouncementManager } from "@/components/announcement/announcement-manager";

export default function HRAnnouncementsPage() {
	return (
		<div className='flex flex-col'>
			<DashboardHeader
				title='Announcements'
				description='Create and manage anno..'
			/>
			<div className='flex-1 p-6'>
				<AnnouncementManager />
			</div>
		</div>
	);
}
