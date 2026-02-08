"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Loader2, ArrowLeft, Mail } from "lucide-react";
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
export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);

		try {
			const supabase = createClient();
			const origin =
				typeof window !== "undefined"
					? window.location.origin
					: "";
			const { error: resetError } =
				await supabase.auth.resetPasswordForEmail(email.trim(), {
					redirectTo: `${origin}/auth/reset-password`,
				});

			if (resetError) throw resetError;
			setSuccess(true);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setIsLoading(false);
		}
	};

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
								Forgot Password
							</CardTitle>
							<CardDescription>
								Enter your email and we&apos;ll send you a link
								to reset your password
							</CardDescription>
						</CardHeader>
						<CardContent>
							{success ? (
								<div className='space-y-4'>
									<div className='rounded-md bg-success/10 p-3 text-sm text-success'>
										Check your email for a reset link. It may
										take a few minutes. If you don&apos;t see
										it, check your spam folder.
									</div>
									<Button asChild variant='outline' className='w-full'>
										<Link href='/auth/login'>
											<ArrowLeft className='mr-2 h-4 w-4' />
											Back to Sign In
										</Link>
									</Button>
								</div>
							) : (
								<form onSubmit={handleSubmit}>
									<div className='flex flex-col gap-5'>
										<div className='grid gap-2'>
											<Label htmlFor='email'>Email</Label>
											<Input
												id='email'
												type='email'
												placeholder='you@company.com'
												required
												value={email}
												onChange={(e) =>
													setEmail(e.target.value)
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
													Sending...
												</>
											) : (
												<>
													<Mail className='mr-2 h-4 w-4' />
													Send Reset Link
												</>
											)}
										</Button>
										<Button asChild variant='ghost' className='w-full'>
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
