"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar, MobileBottomNav } from "./sidebar";
import { AnnouncementProvider } from "@/components/announcement/announcement-provider";
import { BirthdayProvider } from "@/components/birthday/birthday-provider";
import { SettingsProvider } from "@/contexts/settings-context";
import { useUser } from "../../contexts/user-context";
import { Loader2 } from "lucide-react";

interface DashboardLayoutProps {
	children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
	const router = useRouter();
	const { isLoading, employee } = useUser();

	useEffect(() => {
		if (!isLoading && !employee) router.replace("/auth/login");
	}, [isLoading, employee, router]);

	if (isLoading) {
		return (
			<div className='flex h-screen items-center justify-center'>
				<Loader2 className='h-8 w-8 animate-spin text-primary' />
			</div>
		);
	}
	if (!employee) return null;

	return (
		<SettingsProvider>
			<div className='flex min-h-screen bg-background'>
				<DashboardSidebar />
				<main className='min-h-screen flex-1 pb-16 md:ml-64 md:pb-0 flex flex-col'>
					<BirthdayProvider>
						<AnnouncementProvider>{children}</AnnouncementProvider>
					</BirthdayProvider>
				</main>
				<MobileBottomNav />
			</div>
		</SettingsProvider>
	);
}
