"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Monitor, Smartphone } from "lucide-react";
import { useUser } from "../contexts/user-context";

export function MobileBlock({ children }: { children: React.ReactNode }) {
	const { employee } = useUser();
	const [isMobile, setIsMobile] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};
		checkMobile();
		setMounted(true);
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// Prevent flash: don't render anything until we know the screen size
	if (!mounted) return null;

	if (isMobile) {
		return (
			<div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden">
				{/* Decorative background elements */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
					<div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/3 blur-3xl" />
				</div>

				{/* Content */}
				<div className="relative z-10 flex flex-col items-center px-8 text-center max-w-sm">
					{/* Logo */}
					<div className="mb-8 animate-fade-in">
						<Image
							src="/maverix-logo.png"
							alt="MaveriX - Smart HRM"
							width={140}
							height={140}
							className="drop-shadow-2xl"
							priority
						/>
					</div>

					{/* Icon */}
					<div className="mb-6 flex items-center gap-3">
						<div className="h-12 w-12 rounded-2xl bg-red-500/15 flex items-center justify-center border border-red-500/20">
							<Smartphone className="h-6 w-6 text-red-400" />
						</div>
						<div className="h-px w-8 bg-gradient-to-r from-transparent to-black/20" />
						<div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/20">
							<Monitor className="h-6 w-6 text-primary" />
						</div>
					</div>

					{/* Greeting */}
					<h1 className="text-xl font-bold text-black mb-2">
						Hi{employee ? ` ${employee.first_name}` : ""} 👋
					</h1>

					{/* Message */}
					<p className="text-sm text-slate-600 leading-relaxed mb-6">
						MaveriX HRM is designed for desktop and laptop devices.
						Please switch to a larger screen for the best experience.
					</p>

					{/* Divider */}
					<div className="w-12 h-px bg-gradient-to-r from-transparent via-black/20 to-transparent mb-6" />
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
