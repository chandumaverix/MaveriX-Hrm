"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * When user lands from Supabase invite or recovery email, the link goes to
 * Site URL (e.g. /) with token in hash. Redirect to set-password page so they
 * can set their password and the token is processed there.
 */
export function InviteRecoveryRedirect() {
	const pathname = usePathname();

	useEffect(() => {
		if (typeof window === "undefined") return;
		const hash = window.location.hash || "";
		const isInviteOrRecovery =
			hash.includes("type=invite") || hash.includes("type=recovery");
		const isSetPasswordPage = pathname === "/auth/reset-password";

		if (isInviteOrRecovery && !isSetPasswordPage) {
			window.location.replace(
				`/auth/reset-password${
					hash ? `#${hash.replace(/^#/, "")}` : ""
				}`
			);
		}
	}, [pathname]);

	return null;
}
