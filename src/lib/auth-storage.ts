/**
 * Client-side auth persistence.
 * Supabase already persists session (access/refresh tokens) via its client.
 * We persist user + employee profile for fast rehydration and consistent UX.
 */

const STORAGE_KEYS = {
	USER: "hrm_user",
	EMPLOYEE: "hrm_employee",
	SESSION_AT: "hrm_session_at",
} as const;

/** Minimal serializable user (Supabase User has non-JSON-serializable fields). */
export interface StoredUser {
	id: string;
	email: string;
}

export type { Employee } from "@/lib/types";
import type { Employee } from "@/lib/types";

const isClient = typeof window !== "undefined";

export function getStoredUser(): StoredUser | null {
	if (!isClient) return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEYS.USER);
		if (!raw) return null;
		const data = JSON.parse(raw) as StoredUser;
		return data?.id && data?.email ? data : null;
	} catch {
		return null;
	}
}

export function getStoredEmployee(): Employee | null {
	if (!isClient) return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEE);
		if (!raw) return null;
		return JSON.parse(raw) as Employee;
	} catch {
		return null;
	}
}

export function getStoredSessionAt(): number | null {
	if (!isClient) return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEYS.SESSION_AT);
		if (!raw) return null;
		const n = parseInt(raw, 10);
		return Number.isFinite(n) ? n : null;
	} catch {
		return null;
	}
}

/** Persist user and employee after successful auth. */
export function setStoredAuth(
	user: StoredUser,
	employee: Employee | null,
): void {
	if (!isClient) return;
	try {
		localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
		localStorage.setItem(
			STORAGE_KEYS.EMPLOYEE,
			employee ? JSON.stringify(employee) : "",
		);
		localStorage.setItem(STORAGE_KEYS.SESSION_AT, String(Date.now()));
	} catch {
		// quota or disabled localStorage
	}
}

/** Clear persisted auth (on sign out). */
export function clearStoredAuth(): void {
	if (!isClient) return;
	try {
		localStorage.removeItem(STORAGE_KEYS.USER);
		localStorage.removeItem(STORAGE_KEYS.EMPLOYEE);
		localStorage.removeItem(STORAGE_KEYS.SESSION_AT);
	} catch {
		// ignore
	}
}
