"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Settings } from "@/lib/types";

interface SettingsContextValue {
	settings: Settings | null;
	isLoading: boolean;
	companyAnniversary: string | null;
	refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
	undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
	const [settings, setSettings] = useState<Settings | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const fetchSettings = async () => {
		try {
			const supabase = createClient();
			const { data } = await supabase
				.from("settings")
				.select("*")
				.limit(1)
				.single();
			setSettings((data as Settings) || null);
		} catch {
			setSettings(null);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchSettings();
	}, []);

	const companyAnniversary = (() => {
		if (!settings || !Array.isArray(settings.company_address)) return null;
		const item = settings.company_address.find((addr) =>
			addr.startsWith("ANNIVERSARY:")
		);
		return item ? item.replace("ANNIVERSARY:", "") : null;
	})();

	return (
		<SettingsContext.Provider
			value={{
				settings,
				isLoading,
				companyAnniversary,
				refreshSettings: fetchSettings,
			}}>
			{children}
		</SettingsContext.Provider>
	);
}

export function useSettings() {
	const ctx = useContext(SettingsContext);
	if (!ctx)
		throw new Error("useSettings must be used within a SettingsProvider");
	return ctx;
}
