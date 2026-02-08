import React from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function HRLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<DashboardLayout>{children}</DashboardLayout>
		</>
	);
}
