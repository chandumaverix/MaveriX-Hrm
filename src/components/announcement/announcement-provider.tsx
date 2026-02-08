"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AnnouncementAlert } from "./announcement-alert";
import { AnnouncementBar } from "./announcement-bar";
import type { Announcement } from "@/lib/types";

const SEEN_KEY = "announcement-seen-date";

function todayStr() {
	return new Date().toISOString().slice(0, 10);
}

export function AnnouncementProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [todayAnnouncements, setTodayAnnouncements] = useState<
		Announcement[]
	>([]);
	const [overlayOpen, setOverlayOpen] = useState(false);
	const [index, setIndex] = useState(0);

	const fetchToday = useCallback(async () => {
		const supabase = createClient();
		const today = todayStr();
		const { data } = await supabase
			.from("announcements")
			.select("*")
			.eq("date", today)
			.order("created_at", { ascending: false });
		setTodayAnnouncements((data as Announcement[]) || []);
	}, []);

	useEffect(() => {
		fetchToday();
	}, [fetchToday]);

	// Auto-show overlay once per day when there are announcements
	useEffect(() => {
		if (todayAnnouncements.length === 0) return;
		const seen =
			typeof window !== "undefined"
				? sessionStorage.getItem(SEEN_KEY)
				: null;
		if (seen !== todayStr()) setOverlayOpen(true);
	}, [todayAnnouncements.length]);

	const handleDismiss = useCallback(() => {
		if (typeof window !== "undefined")
			sessionStorage.setItem(SEEN_KEY, todayStr());
		if (index < todayAnnouncements.length - 1) {
			setIndex((i) => i + 1);
		} else {
			setOverlayOpen(false);
			setIndex(0);
		}
	}, [index, todayAnnouncements.length]);

	const showOverlay = useCallback(() => {
		setIndex(0);
		setOverlayOpen(true);
	}, []);

	const current = todayAnnouncements[index];

	return (
		<>
			{todayAnnouncements.length > 0 && (
				<AnnouncementBar
					count={todayAnnouncements.length}
					onView={showOverlay}
				/>
			)}
			{children}
			{overlayOpen && current && (
				<AnnouncementAlert
					announcement={current}
					onDismiss={handleDismiss}
					badge={
						todayAnnouncements.length > 1
							? `${index + 1} of ${todayAnnouncements.length}`
							: undefined
					}
				/>
			)}
		</>
	);
}
