"use client";

import { Award } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Employee } from "@/lib/types";

interface AnniversaryBarProps {
	anniversaryEmployees: Employee[];
}

function getDuration(joiningDate: string): { years: number; months: number; days: number } {
	const start = new Date(joiningDate);
	const now = new Date();

	let years = now.getFullYear() - start.getFullYear();
	let months = now.getMonth() - start.getMonth();
	let days = now.getDate() - start.getDate();

	if (days < 0) {
		months--;
		const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
		days += prevMonth.getDate();
	}
	if (months < 0) {
		years--;
		months += 12;
	}

	return { years, months, days };
}

export function AnniversaryBar({ anniversaryEmployees }: AnniversaryBarProps) {
	if (anniversaryEmployees.length === 0) return null;

	return (
		<div className='relative shrink-0 z-40 flex justify-center w-full border-b border-amber-500/20 bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-amber-950/40 backdrop-blur-md px-3 py-1.5 shadow-sm transition-all overflow-hidden'>
			<div className='flex items-center gap-1.5 max-w-full overflow-hidden text-amber-900 dark:text-amber-100'>
				<Award className='h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 fill-amber-500/20' />
				<p className='text-xs sm:text-sm font-medium truncate flex flex-wrap items-center gap-1'>
					<span className="font-semibold text-amber-700 dark:text-amber-400 mr-0.5">Celebrate work Anniversary of</span>
					{anniversaryEmployees.map((emp, idx) => {
						const { years } = getDuration(emp.joining_date!);
						return (
							<span key={emp.id} className="inline-flex items-center gap-1">
								{idx > 0 && <span className="text-amber-600/50 mx-0.5">&amp;</span>}
								<span className="inline-flex items-center gap-1.5 rounded-full pl-0.5 pr-2 py-0.5 bg-white/60 dark:bg-amber-900/40 border border-amber-200/60 dark:border-amber-700/50 shadow-sm">
									<Avatar className='h-4 w-4 border border-amber-200 dark:border-amber-700'>
										{emp.avatar_url ? (
											<AvatarImage
												className='object-cover'
												src={emp.avatar_url}
												alt={`${emp.first_name} ${emp.last_name}`}
											/>
										) : null}
										<AvatarFallback className='text-[8px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold'>
											{emp.first_name?.[0]}
											{emp.last_name?.[0]}
										</AvatarFallback>
									</Avatar>
									<span className="flex items-baseline gap-1">
										<span className='font-bold text-amber-900 dark:text-amber-100'>{emp.first_name} {emp.last_name},</span>
										<span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
											({years} Year{years !== 1 ? 's' : ''} Completed)
										</span>
									</span>
								</span>
							</span>
						);
					})}
				</p>
			</div>
		</div>
	);
}
