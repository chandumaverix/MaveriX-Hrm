import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { UserProvider } from "../contexts/user-context";
import { InviteRecoveryRedirect } from "@/components/auth/invite-recovery-redirect";

const poppins = Poppins({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
	variable: "--font-poppins",
});

export const metadata: Metadata = {
	title: "Maverix - Smart Human Resource Management System",
	description: "Maverix is a Smart Human Resource Management System",
	keywords: ["Maverix", "Smart HRM", "Smart Human Resource Management System"],
	authors: [{ name: "Iconic Chandu", url: "https://iconicchandu.online/" }],
	creator: "Iconic Chandu",
	publisher: "Iconic Chandu",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en' suppressHydrationWarning className={poppins.variable}>
			<body className="font-sans antialiased" suppressHydrationWarning>
				<UserProvider>
					<InviteRecoveryRedirect />
					{children}
					<Toaster position='top-right' />
				</UserProvider>
			</body>
		</html>
	);
}
