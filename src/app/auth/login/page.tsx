"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/user-context";
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
export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const { refreshUser } = useUser();

	const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const supabase = createClient();
		setIsLoading(true);
		setError(null);

		try {
			const { data: authData, error: authError } =
				await supabase.auth.signInWithPassword({
					email: email.trim(),
					password,
				});

			if (authError) throw authError;
			if (!authData?.user)
				throw new Error("Sign in succeeded but no user returned");

			// Get role from employees (same client – session already in memory)
			const { data: employee } = await supabase
				.from("employees")
				.select("role")
				.eq("id", authData.user.id)
				.maybeSingle();

			const path =
				employee?.role === "admin"
					? "/admin/dashboard"
					: employee?.role === "hr"
					? "/hr/dashboard"
					: "/employee/dashboard";

			// Context updates via onAuthStateChange (non-blocking); redirect
			refreshUser().catch(() => {});
			window.location.href = path;
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className='flex min-h-svh w-full items-center justify-center bg-linear-to-br from-primary/5 via-background to-primary/10 p-6 md:p-10'>
			<div className='w-full max-w-md'>
				<div className='flex flex-col gap-6'>
					<div className='flex items-center justify-center gap-2 text-primary'>
						<Image src="/maverix-logo.png" alt="MaveriX - Smart HRM" width={100} height={100} />
					</div>
					<Card className='shadow-lg'>
						<CardHeader className='text-center'>
							<CardTitle className='text-2xl'>
								Welcome Back
							</CardTitle>
							<CardDescription>
								Enter your credentials to access your account
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleLogin}>
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
									<div className='grid gap-2'>
										<div className='flex items-center justify-between'>
											<Label htmlFor='password'>
												Password
											</Label>
											<Link
												href='/auth/forgot-password'
												className='text-sm text-primary hover:underline'>
												Forgot password?
											</Link>
										</div>
										<Input
											id='password'
											type='password'
											placeholder='********'
											required
											value={password}
											onChange={(e) =>
												setPassword(e.target.value)
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
												Signing in...
											</>
										) : (
											"Sign In"
										)}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
