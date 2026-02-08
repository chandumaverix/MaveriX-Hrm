"use client";

import React from "react";
import {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
	getStoredEmployee,
	setStoredAuth,
	clearStoredAuth,
} from "@/lib/auth-storage";
import type { Employee } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

interface UserContextType {
	user: User | null;
	employee: Employee | null;
	isLoading: boolean;
	refreshUser: () => Promise<void>;
	signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
	// Rehydrate from localStorage for fast initial display; Supabase session is source of truth
	const [user, setUser] = useState<User | null>(() => null);
	const [employee, setEmployee] = useState<Employee | null>(() => null);
	const [isLoading, setIsLoading] = useState(true);

	// Persist to localStorage when we have both user and (optionally) employee
	const persistAuth = useCallback(
		(authUser: User | null, authEmployee: Employee | null) => {
			if (authUser) {
				setStoredAuth(
					{ id: authUser.id, email: authUser.email ?? "" },
					authEmployee ?? null,
				);
			} else {
				clearStoredAuth();
			}
		},
		[],
	);

	const fetchEmployee = useCallback(
		async (userId: string): Promise<Employee | null> => {
			const supabase = createClient();
			const { data } = await supabase
				.from("employees")
				.select("*")
				.eq("id", userId)
				.single();

			const emp = data ? (data as Employee) : null;
			setEmployee(emp);
			return emp;
		},
		[],
	);

	const refreshUser = useCallback(async () => {
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		setUser(user);
		if (user) {
			const emp = await fetchEmployee(user.id);
			persistAuth(user, emp);
		} else {
			setEmployee(null);
			clearStoredAuth();
		}
	}, [fetchEmployee, persistAuth]);

	const signOut = useCallback(async () => {
		clearStoredAuth();
		const supabase = createClient();
		await supabase.auth.signOut();
		setUser(null);
		setEmployee(null);
		window.location.href = "/auth/login";
	}, []);

	useEffect(() => {
		const supabase = createClient();

		// Rehydrate employee from localStorage for instant display; user comes from Supabase session
		const storedEmployee = getStoredEmployee();
		if (storedEmployee) {
			setEmployee(storedEmployee);
		}

		// Initial fetch – Supabase session (token) is source of truth
		supabase.auth
			.getUser()
			.then(({ data: { user } }: { data: { user: User | null } }) => {
				setUser(user);
				if (user) {
					fetchEmployee(user.id)
						.then((emp) => {
							persistAuth(user, emp);
						})
						.finally(() => setIsLoading(false));
				} else {
					clearStoredAuth();
					setEmployee(null);
					setIsLoading(false);
				}
			});

		// Periodic session refresh so token doesn’t expire (e.g. JWT ~1h default).
		// Refresh every 50 min so we stay logged in across days.
		const REFRESH_INTERVAL_MS = 50 * 60 * 1000;
		const refreshInterval = setInterval(() => {
			supabase.auth.getSession().then(({ data: { session } }) => {
				if (session?.user) {
					// Trigger refresh; Supabase client will use refresh token and update session
					supabase.auth.getUser().then(({ data: { user } }) => {
						if (user) {
							setUser(user);
							fetchEmployee(user.id)
								.then((emp) => persistAuth(user, emp))
								.catch(() => persistAuth(user, null));
						}
					});
				}
			});
		}, REFRESH_INTERVAL_MS);

		// Listen for auth changes (login, token refresh, sign out).
		// IMPORTANT: Do not await fetchEmployee here – Supabase awaits this callback
		// before signInWithPassword resolves. If we block, login never returns.
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(
			(event: string, session: { user?: User } | null) => {
				const authUser = session?.user ?? null;
				setUser(authUser);
				if (authUser) {
					fetchEmployee(authUser.id)
						.then((emp) => persistAuth(authUser, emp))
						.catch(() => persistAuth(authUser, null));
				} else {
					setEmployee(null);
					clearStoredAuth();
				}
			},
		);

		return () => {
			subscription.unsubscribe();
			clearInterval(refreshInterval);
		};
	}, [fetchEmployee, persistAuth]);

	return (
		<UserContext.Provider
			value={{ user, employee, isLoading, refreshUser, signOut }}>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
}
