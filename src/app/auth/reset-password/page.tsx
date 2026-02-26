"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
export default function ResetPasswordPage() {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [hasRecoverySession, setHasRecoverySession] = useState<
		boolean | null
	>(null);

	// Recover session from URL hash (invite/recovery links put tokens in hash)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const supabase = createClient();
		const hash = window.location.hash.slice(1);
		const params = new URLSearchParams(hash);
		const accessToken = params.get("access_token");
		const refreshToken = params.get("refresh_token");
		const isInviteOrRecovery =
			params.get("type") === "invite" ||
			params.get("type") === "recovery";

		async function init() {
			if (isInviteOrRecovery && accessToken && refreshToken) {
				const { error } = await supabase.auth.setSession({
					access_token: accessToken,
					refresh_token: refreshToken,
				});
				if (!error)
					window.history.replaceState(
						null,
						"",
						window.location.pathname
					);
			}
			const {
				data: { session },
			} = await supabase.auth.getSession();
			setHasRecoverySession(!!session);
		}
		init();
	}, []);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		if (password.length < 6) {
			setError("Password must be at least 6 characters");
			return;
		}
		setIsLoading(true);

		try {
			const supabase = createClient();
			const { error: updateError } = await supabase.auth.updateUser({
				password,
			});

			if (updateError) throw updateError;
			setSuccess(true);
			// Clear hash and redirect after a short delay
			if (typeof window !== "undefined") {
				window.history.replaceState(null, "", window.location.pathname);
			}
			setTimeout(() => router.push("/auth/login"), 2000);
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err.message : "Failed to update password"
			);
		} finally {
			setIsLoading(false);
		}
	};

	if (hasRecoverySession === null) {
		return (
			<div className='flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6'>
				<p className='text-muted-foreground'>Loading...</p>
			</div>
		);
	}

	if (!hasRecoverySession) {
		return (
			<div className='flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6'>
				<Card className='w-full max-w-md'>
					<CardContent className='pt-6'>
						<p className='text-center text-muted-foreground mb-4'>
							Invalid or expired reset link. Request a new one.
						</p>
						<Button asChild className='w-full'>
							<Link href='/auth/forgot-password'>
								Request Reset Link
							</Link>
						</Button>
						<Button
							asChild
							variant='outline'
							className='w-full mt-2'>
							<Link href='/auth/login'>Back to Sign In</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className='flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-10'>
			<div className='w-full max-w-md'>
				<div className='flex flex-col gap-6'>
					<div className='flex items-center justify-center gap-2 text-primary'>
						<Image src="/maverix-logo.png" alt="MaveriX - Smart HRM" width={100} height={100} />
					</div>
					<Card className='shadow-lg'>
						<CardHeader className='text-center'>
							<CardTitle className='text-2xl'>
								Set New Password
							</CardTitle>
							<CardDescription>
								Enter your new password below
							</CardDescription>
						</CardHeader>
						<CardContent>
							{success ? (
								<div className='space-y-4'>
									<div className='rounded-md bg-success/10 p-3 text-sm text-success'>
										Password updated. Redirecting to sign
										in...
									</div>
								</div>
							) : (
								<form onSubmit={handleSubmit}>
									<div className='flex flex-col gap-5'>
										<div className='grid gap-2'>
											<Label htmlFor='password'>
												New Password
											</Label>
											<Input
												id='password'
												type='password'
												placeholder='********'
												required
												minLength={6}
												value={password}
												onChange={(e) =>
													setPassword(e.target.value)
												}
												className='h-11'
											/>
										</div>
										<div className='grid gap-2'>
											<Label htmlFor='confirm'>
												Confirm Password
											</Label>
											<Input
												id='confirm'
												type='password'
												placeholder='********'
												required
												minLength={6}
												value={confirmPassword}
												onChange={(e) =>
													setConfirmPassword(
														e.target.value
													)
												}
												className='h-11'
											/>
										</div>
										{error && (
											<div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
												{error}
											</div>
										)}
										<Button
											type='submit'
											className='h-11 w-full'
											disabled={isLoading}>
											{isLoading ? (
												<>
													<Loader2 className='mr-2 h-4 w-4 animate-spin' />
													Updating...
												</>
											) : (
												<>
													<Lock className='mr-2 h-4 w-4' />
													Update Password
												</>
											)}
										</Button>
										<Button
											asChild
											variant='ghost'
											className='w-full'>
											<Link href='/auth/login'>
												<ArrowLeft className='mr-2 h-4 w-4' />
												Back to Sign In
											</Link>
										</Button>
									</div>
								</form>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
