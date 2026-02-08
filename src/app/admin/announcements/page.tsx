"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { AnnouncementManager } from "@/components/announcement/announcement-manager";

export default function AdminAnnouncementsPage() {
	return (
		<div className='flex flex-col'>
			<DashboardHeader
				title='Announcements'
				description='Create and manage ann...'
			/>
			<div className='flex-1 p-6'>
				<AnnouncementManager />
			</div>
		</div>
	);
}
