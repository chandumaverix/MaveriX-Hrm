"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar, MobileBottomNav } from "./sidebar";
import { AnnouncementProvider } from "@/components/announcement/announcement-provider";
import { BirthdayProvider } from "@/components/birthday/birthday-provider";
import { SettingsProvider } from "@/contexts/settings-context";
import { useUser } from "../../contexts/user-context";
import { Loader2, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
	children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
	const router = useRouter();
	const { isLoading, employee, signOut } = useUser();

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

	// Blocked employees shouldn't be able to access any employee dashboard routes.
	if (employee.is_active === false) {
		return (
			<div className='flex min-h-screen items-center justify-center p-6 bg-background'>
				<Card className='w-full max-w-md border-none shadow-sm'>
					<CardContent className='p-6 space-y-5'>
						<div className='flex items-start gap-4'>
							<div className='h-11 w-11 rounded-lg bg-destructive/10 flex items-center justify-center'>
								<Lock className='h-5 w-5 text-destructive' />
							</div>
							<div className='space-y-1'>
								<p className='text-lg font-semibold'>Access blocked</p>
								<p className='text-sm text-muted-foreground'>
									Your account has been blocked. Please contact HR for assistance.
								</p>
							</div>
						</div>

						<div className='flex justify-end gap-3 pt-2'>
							<Button variant='outline' onClick={() => router.replace("/auth/login")}>
								Go to login
							</Button>
							<Button onClick={() => signOut()}>Sign out</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

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
