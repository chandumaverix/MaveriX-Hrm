import React from "react";
import { UserProvider } from "../../contexts/user-context";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<DashboardLayout>{children}</DashboardLayout>
		</>
	);
}
