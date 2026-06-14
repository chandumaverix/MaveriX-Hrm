"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/user-context";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import {
	Send,
	Rss,
	Trash2,
	MessageCircle,
	Heart,
	Share2,
	MoreHorizontal,
	Users,
	Sparkles,
	Loader2,
	User,
	Shield,
	Briefcase,
	ExternalLink,
	Mail,
	Phone,
	Cake
} from "lucide-react";
import type { Post, PostLike, PostReply } from "@/lib/types";
import type { Employee } from "@/lib/types";
import { toast } from "react-hot-toast";

type EmployeeMention = Pick<
	Employee,
	"id" | "first_name" | "last_name" | "avatar_url" | "designation" | "role" | "email" | "phone" | "date_of_birth"
>;

export function FeedPage() {
	const { employee } = useUser();
	const [posts, setPosts] = useState<Post[]>([]);
	const [expandedPostReplies, setExpandedPostReplies] = useState<Record<string, boolean>>({});
	const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
	const [isLikesDialogOpen, setIsLikesDialogOpen] = useState(false);
	const [likesList, setLikesList] = useState<PostLike[]>([]);
	const [newPost, setNewPost] = useState("");
	const [isPosting, setIsPosting] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedPost, setSelectedPost] = useState<Post | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [employees, setEmployees] = useState<EmployeeMention[]>([]);
	const [mentionOpen, setMentionOpen] = useState(false);
	const [mentionQuery, setMentionQuery] = useState("");
	const [mentionIndex, setMentionIndex] = useState(0);
	const [mentionStartPos, setMentionStartPos] = useState(0);
	const [selectedMentionEmployee, setSelectedMentionEmployee] = useState<EmployeeMention | null>(null);
	const [mentionDetailsOpen, setMentionDetailsOpen] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const mentionListRef = useRef<HTMLDivElement>(null);

	const fetchPosts = useCallback(async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("posts")
			.select("*, author:employees(*), post_likes(*, employee:employees(id, first_name, last_name, avatar_url)), post_replies(*, author:employees(id, first_name, last_name, avatar_url))")
			.order("created_at", { ascending: false })
			.limit(50);
		setPosts((data as unknown as Post[]) || []);
		setIsLoading(false);
	}, []);

	useEffect(() => {
		fetchPosts();
	}, [fetchPosts]);

	useEffect(() => {
		const supabase = createClient();
		supabase
			.from("employees")
			.select("id, first_name, last_name, avatar_url, designation, role, email, phone, date_of_birth")
			.eq("is_active", true)
			.then(({ data }) => setEmployees(data || []));
	}, []);

	// Filter employees for @mention (by name or designation)
	const mentionCandidates = mentionQuery.trim()
		? employees.filter((emp) => {
			const full = `${emp.first_name} ${emp.last_name}`.toLowerCase();
			const des = (emp.designation || "").toLowerCase();
			const q = mentionQuery.toLowerCase();
			return full.includes(q) || des.includes(q);
		})
		: employees.slice(0, 8);

	const openMentionAt = (value: string, cursorPos: number) => {
		const before = value.slice(0, cursorPos);
		const lastAt = before.lastIndexOf("@");
		if (lastAt === -1) {
			setMentionOpen(false);
			return;
		}
		const afterAt = before.slice(lastAt + 1);
		// Allow spaces but don't open if it's just a space or too many spaces
		if (afterAt.startsWith(" ") || afterAt.includes("  ")) {
			setMentionOpen(false);
			return;
		}
		setMentionStartPos(lastAt);
		setMentionQuery(afterAt);
		setMentionOpen(true);
		setMentionIndex(0);
	};

	const insertMention = (emp: EmployeeMention) => {
		const name = `@${emp.first_name} ${emp.last_name} `;
		const before = newPost.slice(0, mentionStartPos);
		const after = newPost.slice(
			textareaRef.current?.selectionStart ?? newPost.length
		);
		setNewPost(before + name + after);
		setMentionOpen(false);
		setMentionQuery("");
		setTimeout(() => {
			const pos = before.length + name.length;
			textareaRef.current?.setSelectionRange(pos, pos);
			textareaRef.current?.focus();
		}, 0);
	};

	const handlePost = async () => {
		if (!newPost.trim() || !employee) return;
		setIsPosting(true);
		setMentionOpen(false);
		const supabase = createClient();
		const { data, error } = await supabase
			.from("posts")
			.insert({ author_id: employee.id, content: newPost })
			.select("*, author:employees(*)")
			.single();
		if (!error && data) {
			setPosts([data as unknown as Post, ...posts]);
			setNewPost("");
		}
		setIsPosting(false);
	};

	const handleDeletePost = async (postId: string) => {
		if (!employee) return;
		const supabase = createClient();
		await supabase.from("posts").delete().eq("id", postId);
		setPosts((prev) => prev.filter((p) => p.id !== postId));
		if (selectedPost?.id === postId) {
			setDialogOpen(false);
			setSelectedPost(null);
		}
	};

	const handleToggleLike = async (postId: string) => {
		if (!employee) return;
		const supabase = createClient();
		const post = posts.find(p => p.id === postId);
		if (!post) return;

		const existingLike = post.post_likes?.find(l => l.employee_id === employee.id);
		if (existingLike) {
			const { error } = await supabase
				.from("post_likes")
				.delete()
				.eq("id", existingLike.id);
			if (error) {
				toast.error(error.message);
				return;
			}
		} else {
			const { error } = await supabase
				.from("post_likes")
				.insert({
					post_id: postId,
					employee_id: employee.id
				});
			if (error) {
				toast.error(error.message);
				return;
			}
		}
		await fetchPosts();
	};

	const handleCreateReply = async (postId: string) => {
		if (!employee) return;
		const content = replyInputs[postId] || "";
		if (!content.trim()) return;

		const supabase = createClient();
		const { error } = await supabase
			.from("post_replies")
			.insert({
				post_id: postId,
				author_id: employee.id,
				content: content.trim()
			});

		if (error) {
			toast.error(error.message);
			return;
		}

		setReplyInputs(prev => ({ ...prev, [postId]: "" }));
		await fetchPosts();
	};

	const handleDeleteReply = async (replyId: string) => {
		const supabase = createClient();
		const { error } = await supabase
			.from("post_replies")
			.delete()
			.eq("id", replyId);

		if (error) {
			toast.error(error.message);
			return;
		}

		await fetchPosts();
	};

	const canDeletePost = (post: Post) => {
		if (!employee) return false;
		const authorId = (post as { author_id?: string }).author_id;
		return employee.id === authorId || employee.role === "admin";
	};

	const onViewFullPost = (post: Post) => {
		setSelectedPost(post);
		setDialogOpen(true);
	};

	const initials = employee
		? `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""
			}`.toUpperCase()
		: "U";

	// Simple regex to highlight @mentions
	const handleMentionClick = (name: string) => {
		const cleanName = name.startsWith("@") ? name.slice(1) : name;
		const matchedEmp = employees.find(emp =>
			`${emp.first_name} ${emp.last_name}`.toLowerCase() === cleanName.toLowerCase()
		);
		if (matchedEmp) {
			setSelectedMentionEmployee(matchedEmp);
			setMentionDetailsOpen(true);
		}
	};

	const formatPostContent = (content: string, isMe?: boolean) => {
		const parts = content.split(/(@\w+(?:\s\w+)?)/g);
		return parts.map((part, i) => {
			if (part.startsWith("@")) {
				return (
					<button
						key={i}
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleMentionClick(part);
						}}
						className={`font-bold hover:underline cursor-pointer transition-all focus:outline-none ${isMe
							? 'text-white font-extrabold'
							: 'text-primary'
							}`}>
						{part.slice(1)}
					</button>
				);
			}
			return part;
		});
	};

	return (
		<div className='flex flex-col min-h-screen bg-[#f1f5f9] relative'>
			{/* Soft ambient background */}
			<div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
				<div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px]" />
				<div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[80px]" />
			</div>

			<DashboardHeader title='Social Feed' description='Global team conversation' />

			<div className='flex-1 flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full'>
				{/* Top Composer Section */}
				<div className="mb-8 w-full sticky top-0 z-10">
					<Card className='border-none bg-white/80 backdrop-blur-lg shadow-xl shadow-slate-200/50 p-0 rounded-[20px] ring-1 ring-white/20'>
						<CardContent className='p-4'>
							<div className='flex gap-3'>

								<div className='flex-1 space-y-3'>
									<div className="relative">
										<Textarea
											ref={textareaRef}
											placeholder="Use '@' to mention someone..."
											value={newPost}
											onChange={(e) => {
												const v = e.target.value;
												setNewPost(v);
												openMentionAt(
													v,
													e.target.selectionStart ??
													v.length
												);
											}}
											onSelect={(e) => {
												const t =
													e.target as HTMLTextAreaElement;
												openMentionAt(
													newPost,
													t.selectionStart ?? 0
												);
											}}
											onKeyDown={(e) => {
												if (!mentionOpen) return;
												if (e.key === "ArrowDown") {
													e.preventDefault();
													setMentionIndex((i) =>
														Math.min(
															i + 1,
															mentionCandidates.length -
															1
														)
													);
													return;
												}
												if (e.key === "ArrowUp") {
													e.preventDefault();
													setMentionIndex((i) =>
														Math.max(0, i - 1)
													);
													return;
												}
												if (
													e.key === "Enter" &&
													mentionCandidates.length > 0
												) {
													e.preventDefault();
													insertMention(
														mentionCandidates[
														mentionIndex
														]
													);
													return;
												}
												if (e.key === "Escape") {
													setMentionOpen(false);
												}
											}}
											className='min-h-[100px] max-h-[200px] resize-none rounded-[16px] border-none bg-slate-50 px-4 py-3 focus-visible:ring-1 focus-visible:ring-primary/20'
										/>
										{mentionOpen &&
											mentionCandidates.length > 0 && (
												<div
													ref={mentionListRef}
													className='absolute left-0 right-0 top-full z-[100] mt-1 max-h-[220px] overflow-auto rounded-xl border border-slate-100 bg-white shadow-2xl'>
													{mentionCandidates.map(
														(emp, i) => (
															<button
																key={emp.id}
																type='button'
																onClick={() =>
																	insertMention(
																		emp
																	)
																}
																className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${i ===
																	mentionIndex
																	? "bg-slate-50"
																	: ""
																	}`}>
																<Avatar className='h-6 w-6 shrink-0'>
																	{emp?.avatar_url && (
																		<AvatarImage className="object-cover"
																			src={emp.avatar_url}
																		/>
																	)}
																	<AvatarFallback className='text-[10px] font-bold'>
																		{emp.first_name?.[0]}{emp.last_name?.[0]}
																	</AvatarFallback>
																</Avatar>
																<p className='font-bold truncate text-slate-700'>
																	{emp.first_name} {emp.last_name}
																</p>
															</button>
														)
													)}
												</div>
											)}
									</div>
									<div className='flex items-center justify-end'>
										<Button
											onClick={handlePost}
											disabled={
												!newPost.trim() || isPosting
											}
											className='w-full h-10 rounded-xl bg-primary px-6 shadow-md hover:shadow-lg transition-all text-xs font-bold gap-2'>
											{isPosting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className='h-3 w-3' />}
											Post
										</Button>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Conversation Feed */}
				<div className='flex-1 space-y-8 pb-10'>
					{isLoading ? (
						<div className='flex flex-col items-center justify-center py-20 gap-4'>
							<Loader2 className='h-8 w-8 animate-spin text-primary/40' />
							<p className='text-xs font-bold text-slate-400 uppercase tracking-widest'>
								Syncing Conversations...
							</p>
						</div>
					) : posts.length === 0 ? (
						<div className='text-center py-20 bg-white/40 rounded-[32px] border-2 border-dashed border-slate-200'>
							<Rss className="h-10 w-10 text-slate-300 mx-auto mb-3" />
							<p className='text-sm font-bold text-slate-400'>
								The feed is quiet today.
							</p>
						</div>
					) : (
						<div className='flex flex-col gap-8'>
							{[...posts].reverse().map((post) => {
								const anyPost = post as any;
								const createdAt = new Date(anyPost.created_at);
								const isMe = anyPost.author_id === employee?.id;

								return (
									<div key={post.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group w-full`}>
										<div className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
											{/* Avatar */}
											<Avatar className='h-9 w-9 shrink-0 border-2 border-white shadow-sm mt-1'>
												{anyPost.author?.avatar_url ? (
													<AvatarImage
														src={anyPost.author.avatar_url}
														className="object-cover"
													/>
												) : null}
												<AvatarFallback className='bg-slate-200 text-slate-600 text-[10px] font-bold'>
													{anyPost.author?.first_name?.[0]}{anyPost.author?.last_name?.[0]}
												</AvatarFallback>
											</Avatar>

											{/* Message Content */}
											<div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
												{/* Name & Time */}
												<div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
													{canDeletePost(post) && (
														<button
															onClick={() => handleDeletePost(post.id)}
															className="bg-white hover:bg-slate-50 text-destructive rounded-full shadow-sm p-1 border border-slate-100 transition-all active:scale-95"
															title="Delete Update">
															<Trash2 className="h-3 w-3" />
														</button>
													)}
													<span className='text-[11px] font-black text-slate-800 tracking-tight'>
														{anyPost.author?.first_name} {anyPost.author?.last_name}
													</span>
													<span className='text-[10px] font-bold text-slate-400 uppercase tracking-tighter'>
														{createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
													</span>

													<span className="text-[10px] text-slate-300">•</span>

													{/* Like Button & Count */}
													<div className="flex items-center gap-1">
														<button
															onClick={() => handleToggleLike(post.id)}
															className="hover:scale-110 active:scale-95 transition-all cursor-pointer focus:outline-none"
														>
															{post.post_likes?.some(l => l.employee_id === employee?.id) ? (
																<Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
															) : (
																<Heart className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500 transition-colors" />
															)}
														</button>
														<span
															onClick={() => {
																if (post.post_likes && post.post_likes.length > 0) {
																	setLikesList(post.post_likes);
																	setIsLikesDialogOpen(true);
																}
															}}
															className={`text-[11px] font-bold text-slate-400 dark:text-slate-500 ${post.post_likes && post.post_likes.length > 0 ? "hover:underline cursor-pointer" : ""}`}
														>
															{post.post_likes?.length || 0}
														</span>
													</div>

													{/* Reply Button & Count */}
													<button
														onClick={() => setExpandedPostReplies(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
														className="flex items-center gap-1 hover:scale-105 transition-all text-slate-400 hover:text-primary cursor-pointer focus:outline-none"
													>
														<MessageCircle className="h-3.5 w-3.5" />
														<span className="text-[11px] font-bold text-slate-400">
															{post.post_replies?.length || 0}
														</span>
													</button>
												</div>

												{/* Bubble */}
												<div className={`relative px-4 py-3 rounded-[20px] shadow-sm ${isMe
													? 'bg-primary text-white rounded-tr-none'
													: 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
													}`}>
													<div className={`text-[14px] leading-relaxed whitespace-pre-wrap font-medium ${isMe ? 'text-white' : 'text-slate-600'}`}>
														{formatPostContent(anyPost.content, isMe)}
													</div>
												</div>

												{/* Collapsible Replies Section */}
												{expandedPostReplies[post.id] && (
													<div className="mt-3 space-y-3 w-full border-t border-slate-100 dark:border-slate-800/40 pt-3">
														{/* Replies List */}
														<div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
															{post.post_replies && post.post_replies.length > 0 ? (
																[...post.post_replies]
																	.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
																	.map((reply) => {
																		const isReplyMe = reply.author_id === employee?.id;
																		return (
																			<div key={reply.id} className="flex gap-2.5 items-start">
																				<Avatar className="h-6 w-6 border border-white shadow-xs shrink-0">
																					{reply.author?.avatar_url && (
																						<AvatarImage src={reply.author.avatar_url} className="object-cover" />
																					)}
																					<AvatarFallback className="text-[8px] font-bold">
																						{reply.author?.first_name?.[0]}{reply.author?.last_name?.[0]}
																					</AvatarFallback>
																				</Avatar>
																				<div className="flex-1 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-[16px] text-xs">
																					<div className="flex items-center justify-between gap-2 mb-1">
																						<span className="font-bold text-slate-700 dark:text-slate-300">
																							{reply.author?.first_name} {reply.author?.last_name}
																						</span>
																						<div className="flex items-center gap-1.5">
																							<span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
																								{new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
																							</span>
																							{(isReplyMe || employee?.role === 'admin') && (
																								<button
																									onClick={() => handleDeleteReply(reply.id)}
																									className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
																									title="Delete Reply"
																								>
																									<Trash2 className="h-3 w-3" />
																								</button>
																							)}
																						</div>
																					</div>
																					<p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
																						{reply.content}
																					</p>
																				</div>
																			</div>
																		);
																	})
															) : (
																<p className="text-[10px] text-slate-400 font-bold text-center py-2 uppercase tracking-wider">No replies yet</p>
															)}
														</div>

														{/* Reply Input Composer */}
														<div className="flex gap-2 w-full mt-1.5 items-center">
															<input
																type="text"
																placeholder="Write a reply..."
																value={replyInputs[post.id] || ""}
																onChange={(e) => setReplyInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
																onKeyDown={(e) => {
																	if (e.key === "Enter") {
																		handleCreateReply(post.id);
																	}
																}}
																className="flex-1 h-8 px-3 rounded-full text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200"
															/>
															<Button
																size="sm"
																onClick={() => handleCreateReply(post.id)}
																disabled={!(replyInputs[post.id] || "").trim()}
																className="h-8 rounded-full px-3.5 bg-primary text-white hover:bg-primary/95 text-[10px] font-bold"
															>
																Reply
															</Button>
														</div>
													</div>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className='max-w-lg rounded-2xl'>
					{selectedPost && (
						<>
							<DialogHeader>
								<DialogTitle className='flex items-center justify-between gap-2 text-sm font-bold'>
									Post Conversation
								</DialogTitle>
							</DialogHeader>
							<div className='mt-4 p-4 bg-slate-50 rounded-xl text-sm text-slate-600 leading-relaxed whitespace-pre-wrap'>
								{formatPostContent((selectedPost as any).content, false)}
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={mentionDetailsOpen} onOpenChange={setMentionDetailsOpen}>
				<DialogContent className='w-[280px] p-4 overflow-hidden border-none bg-white rounded-[24px] shadow-2xl'>
					<DialogHeader className="sr-only">
						<DialogTitle>Employee Profile</DialogTitle>
					</DialogHeader>
					{selectedMentionEmployee && (
						<div className="flex flex-col items-center text-center">
							<div className="relative mb-4">
								<Avatar className='h-20 w-20 border-4 border-slate-50 shadow-lg bg-white'>
									{selectedMentionEmployee.avatar_url ? (
										<AvatarImage
											src={selectedMentionEmployee.avatar_url}
											className="object-cover"
										/>
									) : null}
									<AvatarFallback className='bg-primary/5 text-primary text-2xl font-black'>
										{selectedMentionEmployee.first_name?.[0]}{selectedMentionEmployee.last_name?.[0]}
									</AvatarFallback>
								</Avatar>
							</div>

							<div className="space-y-1">
								<h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
									{selectedMentionEmployee.first_name} {selectedMentionEmployee.last_name}
								</h3>
								<p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 opacity-80">
									{selectedMentionEmployee.designation || 'Team Member'}
								</p>
							</div>

							<Button
								className="w-full mt-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-[10px] h-8 shadow-sm"
								onClick={() => setMentionDetailsOpen(false)}
							>
								Close
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={isLikesDialogOpen} onOpenChange={setIsLikesDialogOpen}>
				<DialogContent className='max-w-md rounded-2xl p-6'>
					<DialogHeader>
						<DialogTitle className="text-lg font-black text-slate-900 tracking-tight">
							Likes
						</DialogTitle>
						<DialogDescription className="text-xs text-slate-500 font-bold uppercase tracking-wider">
							People who liked this post
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 max-h-[300px] overflow-y-auto space-y-4 pr-1">
						{likesList.map((like) => {
							const emp = like.employee;
							if (!emp) return null;
							return (
								<div key={like.id} className="flex items-center gap-3">
									<Avatar className='h-9 w-9 shrink-0 border border-slate-100 shadow-sm'>
										{emp.avatar_url && (
											<AvatarImage
												src={emp.avatar_url}
												className="object-cover"
											/>
										)}
										<AvatarFallback className='bg-primary/5 text-primary text-[10px] font-black'>
											{emp.first_name?.[0]}{emp.last_name?.[0]}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-bold text-slate-800 truncate">
											{emp.first_name} {emp.last_name}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
