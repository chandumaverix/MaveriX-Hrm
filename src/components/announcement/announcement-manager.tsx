"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";
import { CreateAnnouncementDialog } from "./create-announcement-dialog";
import type { Announcement } from "@/lib/types";

function todayStr() {
	return new Date().toISOString().slice(0, 10);
}

export function AnnouncementManager() {
	const { employee } = useUser();
	const [list, setList] = useState<Announcement[]>([]);
	const [createOpen, setCreateOpen] = useState(false);

	const canCreate = employee?.role === "admin" || employee?.role === "hr";

	const fetchList = useCallback(async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("announcements")
			.select("*")
			.order("date", { ascending: false })
			.limit(50);
		setList((data as Announcement[]) || []);
	}, []);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const handleDelete = async (id: string) => {
		const supabase = createClient();
		await supabase.from("announcements").delete().eq("id", id);
		setList((prev) => prev.filter((a) => a.id !== id));
	};

	return (
		<div className='space-y-6'>
			<Card>
				<CardHeader className='flex flex-col md:flex-row gap-4 items-center justify-between space-y-0 p-4'>
					<div>
						<CardTitle>Announcements</CardTitle>
						<p className='text-sm text-muted-foreground mt-1'>
							Announcements show on the chosen date in the
							dashboard top bar and as a full-screen alert. After
							that day they are hidden.
						</p>
					</div>
					{canCreate && (
						<Button onClick={() => setCreateOpen(true)}>
							<Megaphone className='h-4 w-4 mr-2' />
							Create Announcement
						</Button>
					)}
				</CardHeader>
				<CardContent>
					{list.length === 0 ? (
						<p className='text-sm text-muted-foreground py-4'>
							No announcements yet.
						</p>
					) : (
						<ul className='space-y-3'>
							{list.map((a) => {
								const isToday = a.date === todayStr();
								const isPast = a.date < todayStr();
								return (
									<li
										key={a.id}
										className='flex flex-col gap-1 rounded-lg border p-3'>
										<div className='flex items-center justify-between gap-2'>
											<span className='text-sm font-medium text-muted-foreground'>
												{new Date(
													a.date + "Z"
												).toLocaleDateString("en-US", {
													weekday: "short",
													month: "short",
													day: "numeric",
													year: "numeric",
												})}
												{isToday && (
													<span className='ml-2 text-amber-600 dark:text-amber-400'>
														(Today)
													</span>
												)}
												{isPast && (
													<span className='ml-2 text-muted-foreground'>
														(Past)
													</span>
												)}
											</span>
											{canCreate && (
												<Button
													size='sm'
													variant='ghost'
													className='text-destructive hover:text-destructive'
													onClick={() =>
														handleDelete(a.id)
													}>
													Delete
												</Button>
											)}
										</div>
										{a.title && (
											<p className='font-medium text-foreground'>
												{a.title}
											</p>
										)}
										<p className='text-sm whitespace-pre-wrap text-muted-foreground'>
											{a.content}
										</p>
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>

			{canCreate && (
				<CreateAnnouncementDialog
					open={createOpen}
					onOpenChange={setCreateOpen}
					onCreated={fetchList}
					canCreate={canCreate}
					createdBy={employee?.id ?? null}
				/>
			)}
		</div>
	);
}
