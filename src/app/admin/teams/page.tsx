"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Plus,
	Users,
	Pencil,
	Trash2,
	UserPlus,
	Search,
	X,
	Crown,
	UserCheck,
	AlertTriangle,
	ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Team, Employee, TeamMember } from "@/lib/types";

interface TeamWithDetails extends Team {
	leader?: Employee;
	team_members?: Array<TeamMember & { employee: Employee }>;
}

// Curated color palette for team card accents
const TEAM_COLORS = [
	{ gradient: "from-blue-600 via-blue-500 to-indigo-500", bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-100 dark:border-blue-900/40", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
	{ gradient: "from-violet-600 via-purple-500 to-fuchsia-500", bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", border: "border-violet-100 dark:border-violet-900/40", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
	{ gradient: "from-emerald-600 via-emerald-500 to-teal-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-100 dark:border-emerald-900/40", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
	{ gradient: "from-orange-500 via-amber-500 to-yellow-500", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-100 dark:border-amber-900/40", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
	{ gradient: "from-rose-600 via-pink-500 to-fuchsia-500", bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", border: "border-rose-100 dark:border-rose-900/40", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
	{ gradient: "from-cyan-600 via-cyan-500 to-sky-500", bg: "bg-cyan-50 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-100 dark:border-cyan-900/40", badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
	{ gradient: "from-slate-700 via-slate-600 to-zinc-500", bg: "bg-slate-50 dark:bg-slate-950/30", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-800/40", badge: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300" },
	{ gradient: "from-indigo-600 via-indigo-500 to-blue-500", bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-100 dark:border-indigo-900/40", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
];

function getTeamColor(index: number) {
	return TEAM_COLORS[index % TEAM_COLORS.length];
}

export default function TeamsPage() {
	const [teams, setTeams] = useState<TeamWithDetails[]>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [editingTeam, setEditingTeam] = useState<TeamWithDetails | null>(
		null
	);
	const [addMemberTeam, setAddMemberTeam] = useState<TeamWithDetails | null>(
		null
	);
	const [selectedEmployee, setSelectedEmployee] = useState<string>("");
	const [memberSearch, setMemberSearch] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

	const toggleTeamExpanded = (teamId: string) => {
		setExpandedTeams((prev) => {
			const next = new Set(prev);
			if (next.has(teamId)) {
				next.delete(teamId);
			} else {
				next.add(teamId);
			}
			return next;
		});
	};

	const [formData, setFormData] = useState({
		name: "",
		description: "",
		leader_id: "",
	});

	useEffect(() => {
		fetchTeams();
		fetchEmployees();
	}, []);

	const fetchTeams = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("teams")
			.select(
				`
        *,
        leader:employees!teams_leader_id_fkey(*),
        team_members(*, employee:employees(*))
      `
			)
			.order("created_at", { ascending: false });

		setTeams((data as unknown as TeamWithDetails[]) || []);
		setIsLoading(false);
	};

	const fetchEmployees = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select("*")
			.order("first_name");
		setEmployees(data || []);
	};

	const handleCreateTeam = async () => {
		const supabase = createClient();
		const { error } = await supabase.from("teams").insert({
			name: formData.name,
			description: formData.description,
			leader_id: formData.leader_id || null,
		});

		if (!error) {
			await fetchTeams();
			setIsAddDialogOpen(false);
			resetForm();
		}
	};

	const handleUpdateTeam = async () => {
		if (!editingTeam) return;

		const supabase = createClient();
		const { error } = await supabase
			.from("teams")
			.update({
				name: formData.name,
				description: formData.description,
				leader_id: formData.leader_id || null,
			})
			.eq("id", editingTeam.id);

		if (!error) {
			await fetchTeams();
			setEditingTeam(null);
			resetForm();
		}
	};

	const handleDeleteTeam = async (id: string) => {
		const supabase = createClient();
		await supabase.from("teams").delete().eq("id", id);
		await fetchTeams();
	};

	const handleAddMember = async () => {
		if (!addMemberTeam || !selectedEmployee) return;

		const supabase = createClient();
		const { error } = await supabase.from("team_members").insert({
			team_id: addMemberTeam.id,
			employee_id: selectedEmployee,
		});

		if (!error) {
			await fetchTeams();
			setAddMemberTeam(null);
			setSelectedEmployee("");
			setMemberSearch("");
		}
	};

	const handleRemoveMember = async (memberId: string) => {
		const supabase = createClient();
		await supabase.from("team_members").delete().eq("id", memberId);
		await fetchTeams();
	};

	const resetForm = () => {
		setFormData({ name: "", description: "", leader_id: "" });
	};

	const openEditDialog = (team: TeamWithDetails) => {
		setEditingTeam(team);
		setFormData({
			name: team.name,
			description: team.description || "",
			leader_id: team.leader_id || "",
		});
	};

	// Employees who are not in any team as member or leader (one user = one team only)
	const getEmployeesNotInAnyTeam = () => {
		const memberIds = new Set(
			teams.flatMap(
				(t) => t.team_members?.map((m) => m.employee_id) ?? []
			)
		);
		const leaderIds = new Set(
			teams.map((t) => t.leader_id).filter(Boolean) as string[]
		);
		const inAnyTeam = new Set([...memberIds, ...leaderIds]);
		return employees.filter((e) => !inAnyTeam.has(e.id));
	};

	const getAvailableEmployeesForTeam = (team: TeamWithDetails) => {
		const notInAnyTeam = getEmployeesNotInAnyTeam();
		const alreadyInThisTeam = new Set(
			team.team_members?.map((m) => m.employee_id) ?? []
		);
		return notInAnyTeam.filter((e) => !alreadyInThisTeam.has(e.id));
	};

	const getFilteredAvailableForAddMember = () => {
		if (!addMemberTeam) return [];
		const list = getAvailableEmployeesForTeam(addMemberTeam);
		const q = memberSearch.trim().toLowerCase();
		if (!q) return list;
		return list.filter(
			(e) =>
				e.first_name?.toLowerCase().includes(q) ||
				e.last_name?.toLowerCase().includes(q) ||
				e.email?.toLowerCase().includes(q)
		);
	};

	// Stats
	const totalMembers = teams.reduce(
		(acc, t) => acc + (t.team_members?.length || 0),
		0
	);
	const teamsWithoutLeader = teams.filter((t) => !t.leader).length;

	return (
		<div className='flex flex-col'>
			<DashboardHeader title='Teams' description='Manage all teams' />

			<div className='flex-1 space-y-6 p-6'>
				{/* Summary Stats + Create Button */}
				<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
					{/* Stats Pills */}
					{!isLoading && teams.length > 0 && (
						<div className='flex flex-wrap items-center gap-2.5'>
							<div className='flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40'>
								<div className='flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10'>
									<Users className='h-3.5 w-3.5 text-primary' />
								</div>
								<div>
									<p className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Teams</p>
									<p className='text-sm font-extrabold text-slate-800 dark:text-white leading-none'>{teams.length}</p>
								</div>
							</div>
							<div className='flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40'>
								<div className='flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10'>
									<UserCheck className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
								</div>
								<div>
									<p className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Total Members</p>
									<p className='text-sm font-extrabold text-slate-800 dark:text-white leading-none'>{totalMembers}</p>
								</div>
							</div>
							{teamsWithoutLeader > 0 && (
								<div className='flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40'>
									<div className='flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10'>
										<AlertTriangle className='h-3.5 w-3.5 text-amber-600 dark:text-amber-400' />
									</div>
									<div>
										<p className='text-[10px] font-bold text-amber-500 uppercase tracking-wider'>No Leader</p>
										<p className='text-sm font-extrabold text-amber-700 dark:text-amber-300 leading-none'>{teamsWithoutLeader}</p>
									</div>
								</div>
							)}
						</div>
					)}

					<Dialog
						open={isAddDialogOpen}
						onOpenChange={setIsAddDialogOpen}>
						<DialogTrigger asChild>
							<Button className='rounded-xl px-5 h-10 font-bold shadow-sm'>
								<Plus className='mr-2 h-4 w-4' />
								Create Team
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create New Team</DialogTitle>
								<DialogDescription>
									Create a new team and assign a team leader
								</DialogDescription>
							</DialogHeader>
							<div className='space-y-4 py-4'>
								<div className='space-y-2'>
									<Label htmlFor='name'>Team Name</Label>
									<Input
										id='name'
										value={formData.name}
										onChange={(e) =>
											setFormData({
												...formData,
												name: e.target.value,
											})
										}
										placeholder='e.g., Engineering'
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='description'>
										Description
									</Label>
									<Textarea
										id='description'
										value={formData.description}
										onChange={(e) =>
											setFormData({
												...formData,
												description: e.target.value,
											})
										}
										placeholder='Team description...'
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='leader'>Team Leader</Label>
									<Select
										value={formData.leader_id}
										onValueChange={(value) =>
											setFormData({
												...formData,
												leader_id: value,
											})
										}>
										<SelectTrigger>
											<SelectValue placeholder='Select a leader' />
										</SelectTrigger>
										<SelectContent>
											{employees.map((emp) => (
												<SelectItem
													key={emp.id}
													value={emp.id}>
													{emp.first_name}{" "}
													{emp.last_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className='flex justify-end gap-3 pt-4'>
									<Button
										variant='outline'
										onClick={() =>
											setIsAddDialogOpen(false)
										}>
										Cancel
									</Button>
									<Button
										onClick={handleCreateTeam}
										disabled={!formData.name}>
										Create Team
									</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>
				</div>

				{/* Teams Grid */}
				{isLoading ? (
					<div className='flex flex-col items-center justify-center py-20'>
						<div className='w-10 h-10 rounded-full border-2 border-slate-200 border-t-primary animate-spin mb-4' />
						<p className='text-sm font-medium text-muted-foreground'>
							Loading teams...
						</p>
					</div>
				) : teams.length === 0 ? (
					<Card className='border-dashed border-2'>
						<CardContent className='flex flex-col items-center justify-center py-16'>
							<div className='w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5'>
								<Users className='h-8 w-8 text-slate-400' />
							</div>
							<h3 className='text-lg font-bold text-slate-800 dark:text-white'>
								No teams yet
							</h3>
							<p className='text-sm text-muted-foreground mt-1 mb-6 max-w-sm text-center'>
								Create your first team to organize employees and assign team leaders
							</p>
							<Button onClick={() => setIsAddDialogOpen(true)} className='rounded-xl px-6'>
								<Plus className='mr-2 h-4 w-4' />
								Create Your First Team
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
						{teams.map((team, index) => {
							const color = getTeamColor(index);
							const memberCount = team.team_members?.length || 0;

							return (
								<motion.div
									key={team.id}
									initial={{ opacity: 0, y: 16 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.35, delay: index * 0.05 }}
								>
									<Card className='group flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800/40 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl'>

										<CardHeader className='pb-3 pt-5 px-5'>
											<div className='flex items-start justify-between'>
												<div className='flex-1 min-w-0'>
													<CardTitle className='text-base font-extrabold text-slate-800 dark:text-white tracking-tight truncate'>
														{team.name}
													</CardTitle>
													{team.description && (
														<CardDescription className='mt-0.5 text-xs line-clamp-2'>
															{team.description}
														</CardDescription>
													)}
												</div>
												<div className='flex items-center gap-0.5 ml-3 shrink-0'>
													<Button
														variant='ghost'
														size='icon'
														className='h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
														onClick={() =>
															openEditDialog(team)
														}>
														<Pencil className='h-3.5 w-3.5' />
													</Button>
													<Button
														variant='ghost'
														size='icon'
														className='h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
														onClick={() =>
															handleDeleteTeam(team.id)
														}>
														<Trash2 className='h-3.5 w-3.5' />
													</Button>
												</div>
											</div>

											{/* Member count badge */}
											<div className='flex items-center gap-2 mt-3'>
												<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${color.badge}`}>
													<Users className='w-3 h-3' />
													{memberCount + (team.leader ? 1 : 0)} {memberCount + (team.leader ? 1 : 0) === 1 ? 'Person' : 'People'}
												</span>
											</div>
										</CardHeader>

										<CardContent className='flex-1 space-y-4 px-5 pb-5'>
											{/* Team Leader */}
											{team.leader && (
												<div className={`flex items-center gap-3 rounded-xl p-3 ${color.bg} border ${color.border}`}>
													<div className='relative'>
														<Avatar className='h-10 w-10 ring-2 ring-white dark:ring-slate-900 shadow-sm'>
															{team.leader.avatar_url && (
																<AvatarImage
																	height={40}
																	width={40}
																	className='object-cover'
																	src={team.leader.avatar_url}
																	alt='Profile Pic'
																/>
															)}
															<AvatarFallback className={`text-xs font-bold ${color.text} bg-white dark:bg-slate-800`}>
																{team.leader.first_name?.[0]}
																{team.leader.last_name?.[0]}
															</AvatarFallback>
														</Avatar>
														<div className='absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm'>
															<Crown className='w-2.5 h-2.5 text-white' />
														</div>
													</div>
													<div className='flex-1 min-w-0'>
														<p className='font-bold text-sm text-slate-800 dark:text-white truncate'>
															{team.leader.first_name}{" "}
															{team.leader.last_name}
														</p>
														<p className={`text-[11px] font-semibold ${color.text}`}>
															Team Leader
														</p>
													</div>
												</div>
											)}

											{/* Team Members — Accordion */}
											<div className='rounded-xl border border-slate-100 dark:border-slate-800/40 overflow-hidden'>
												<button
													type='button'
													onClick={() => toggleTeamExpanded(team.id)}
													className='flex items-center justify-between w-full px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors'
												>
													<div className='flex items-center gap-2'>
														<Users className='h-3.5 w-3.5 text-slate-400' />
														<span className='text-xs font-bold text-slate-600 dark:text-slate-300'>
															Members ({memberCount})
														</span>
													</div>
													<div className='flex items-center gap-1'>
														<span
															className='h-6 px-2 inline-flex items-center text-[10px] font-semibold text-slate-500 hover:text-primary rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
															onClick={(e) => {
																e.stopPropagation();
																setAddMemberTeam(team);
															}}
														>
															<UserPlus className='h-3 w-3 mr-1' />
															Add
														</span>
														<motion.div
															animate={{ rotate: expandedTeams.has(team.id) ? 180 : 0 }}
															transition={{ duration: 0.2 }}
														>
															<ChevronDown className='h-3.5 w-3.5 text-slate-400' />
														</motion.div>
													</div>
												</button>

												<AnimatePresence initial={false}>
													{expandedTeams.has(team.id) && (
														<motion.div
															initial={{ height: 0, opacity: 0 }}
															animate={{ height: 'auto', opacity: 1 }}
															exit={{ height: 0, opacity: 0 }}
															transition={{ duration: 0.25, ease: 'easeInOut' }}
															className='overflow-hidden'
														>
															<div className='px-3.5 pb-3 pt-1'>
																{team.team_members &&
																team.team_members.length > 0 ? (
																	<div className='flex flex-wrap gap-2'>
																		{team.team_members.map((member) => (
																			<div
																				key={member.id}
																				className='group/member inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 pl-1 pr-2 py-1 hover:border-slate-300 dark:hover:border-slate-600 transition-colors'
																			>
																				<Avatar className='h-5 w-5 shrink-0'>
																					{member.employee?.avatar_url && (
																						<AvatarImage
																							height={20}
																							width={20}
																							className='object-cover'
																							src={member.employee.avatar_url}
																							alt='Profile Pic'
																						/>
																					)}
																					<AvatarFallback className='text-[8px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'>
																						{member.employee?.first_name?.[0]}
																						{member.employee?.last_name?.[0]}
																					</AvatarFallback>
																				</Avatar>
																				<span className='text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap'>
																					{member.employee?.first_name}{" "}
																					{member.employee?.last_name}
																				</span>
																				<button
																					onClick={() =>
																						handleRemoveMember(member.id)
																					}
																					className='opacity-0 group-hover/member:opacity-100 h-4 w-4 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shrink-0 -mr-0.5'
																				>
																					<X className='h-2.5 w-2.5' />
																				</button>
																			</div>
																		))}
																	</div>
																) : (
																	<div className='flex flex-col items-center justify-center py-4'>
																		<p className='text-[11px] text-slate-400 dark:text-slate-500 font-medium'>
																			No members yet
																		</p>
																	</div>
																)}
															</div>
														</motion.div>
													)}
												</AnimatePresence>
											</div>
										</CardContent>
									</Card>
								</motion.div>
							);
						})}
					</div>
				)}

				{/* Edit Team Dialog */}
				<Dialog
					open={!!editingTeam}
					onOpenChange={(open) => !open && setEditingTeam(null)}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Edit Team</DialogTitle>
							<DialogDescription>
								Update team information
							</DialogDescription>
						</DialogHeader>
						<div className='space-y-4 py-4'>
							<div className='space-y-2'>
								<Label htmlFor='edit-name'>Team Name</Label>
								<Input
									id='edit-name'
									value={formData.name}
									onChange={(e) =>
										setFormData({
											...formData,
											name: e.target.value,
										})
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='edit-description'>
									Description
								</Label>
								<Textarea
									id='edit-description'
									value={formData.description}
									onChange={(e) =>
										setFormData({
											...formData,
											description: e.target.value,
										})
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='edit-leader'>Team Leader</Label>
								<Select
									value={formData.leader_id}
									onValueChange={(value) =>
										setFormData({
											...formData,
											leader_id: value,
										})
									}>
									<SelectTrigger>
										<SelectValue placeholder='Select a leader' />
									</SelectTrigger>
									<SelectContent>
										{employees.map((emp) => (
											<SelectItem
												key={emp.id}
												value={emp.id}>
												{emp.first_name} {emp.last_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='flex justify-end gap-3 pt-4'>
								<Button
									variant='outline'
									onClick={() => setEditingTeam(null)}>
									Cancel
								</Button>
								<Button onClick={handleUpdateTeam}>
									Save Changes
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>

				{/* Add Member Dialog */}
				<Dialog
					open={!!addMemberTeam}
					onOpenChange={(open) => {
						if (!open) {
							setAddMemberTeam(null);
							setSelectedEmployee("");
							setMemberSearch("");
						}
					}}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add Team Member</DialogTitle>
							<DialogDescription>
								Add a member to {addMemberTeam?.name}. Each
								employee can be in only one team.
							</DialogDescription>
						</DialogHeader>
						<div className='space-y-4 py-4'>
							<div className='space-y-2'>
								<Label>Search and select employee</Label>
								<div className='relative'>
									<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
									<Input
										placeholder='Search by name or email...'
										value={memberSearch}
										onChange={(e) =>
											setMemberSearch(e.target.value)
										}
										className='pl-9'
									/>
								</div>
								<div className='border rounded-md max-h-[220px] overflow-y-auto'>
									{getFilteredAvailableForAddMember()
										.length === 0 ? (
										<p className='p-4 text-sm text-muted-foreground text-center'>
											{memberSearch.trim()
												? "No matching employees (or all are already in a team)"
												: "No employees available (everyone is already in a team)"}
										</p>
									) : (
										<ul className='p-1'>
											{getFilteredAvailableForAddMember().map(
												(emp) => (
													<li key={emp.id}>
														<button
															type='button'
															onClick={() =>
																setSelectedEmployee(
																	emp.id
																)
															}
															className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${selectedEmployee ===
																emp.id
																? "bg-accent"
																: ""
																}`}>
															<Avatar className='h-8 w-8'>
																{emp.avatar_url && (
																	<AvatarImage
																		height={32}
																		width={32}
																		className='object-cover'
																		src={emp.avatar_url}
																		alt='Profile Pic'
																	/>
																)}
																<AvatarFallback className='text-xs'>
																	{
																		emp
																			.first_name?.[0]
																	}
																	{
																		emp
																			.last_name?.[0]
																	}
																</AvatarFallback>
															</Avatar>
															<div className='flex-1 min-w-0'>
																<span className='font-medium'>
																	{
																		emp.first_name
																	}{" "}
																	{
																		emp.last_name
																	}
																</span>
																{emp.email && (
																	<span className='block text-xs text-muted-foreground truncate'>
																		{
																			emp.email
																		}
																	</span>
																)}
															</div>
														</button>
													</li>
												)
											)}
										</ul>
									)}
								</div>
								{selectedEmployee && (
									<p className='text-xs text-muted-foreground'>
										Selected:{" "}
										{
											employees.find(
												(e) => e.id === selectedEmployee
											)?.first_name
										}{" "}
										{
											employees.find(
												(e) => e.id === selectedEmployee
											)?.last_name
										}
									</p>
								)}
							</div>
							<div className='flex justify-end gap-3 pt-2'>
								<Button
									variant='outline'
									onClick={() => {
										setAddMemberTeam(null);
										setSelectedEmployee("");
										setMemberSearch("");
									}}>
									Cancel
								</Button>
								<Button
									onClick={handleAddMember}
									disabled={!selectedEmployee}>
									Add Member
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
