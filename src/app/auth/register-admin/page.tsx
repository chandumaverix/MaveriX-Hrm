"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Shield, Eye, EyeOff, Building2, Users, Clock, CheckCircle2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
export default function RegisterAdminPage() {
	const router = useRouter();
	const [first_name, setFirstName] = useState("");
	const [last_name, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [checking, setChecking] = useState(true);
	const [hasAdmin, setHasAdmin] = useState(false);

	useEffect(() => {
		fetch("/api/setup/has-admin")
			.then((r) => r.json())
			.then((data) => {
				setHasAdmin(!!data.hasAdmin);
			})
			.catch(() => setHasAdmin(false))
			.finally(() => setChecking(false));
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const supabase = createClient();
			const { data, error: signUpError } = await supabase.auth.signUp({
				email: email.trim(),
				password,
				options: {
					data: {
						role: "admin",
						first_name: first_name.trim(),
						last_name: last_name.trim(),
						designation: "Administrator",
					},
				},
			});
			if (signUpError) throw signUpError;
			if (data?.user && data?.session) {
				router.replace("/admin/dashboard");
				return;
			}
			// Email confirmation required
			router.push("/auth/sign-up-success");
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err.message : "Registration failed"
			);
		} finally {
			setLoading(false);
		}
	};

	if (checking) {
		return (
			<div className='flex min-h-svh w-full items-center justify-center bg-linear-to-br from-primary/5 via-background to-primary/10 p-6'>
				<Loader2 className='h-8 w-8 animate-spin text-primary' />
			</div>
		);
	}

	if (hasAdmin) {
		return (
			<div className='grid min-h-svh grid-cols-1 bg-background lg:grid-cols-2'>
				<div className='relative hidden lg:block'>
					<Image
						src='/newloginbackground.png'
						alt='MaveriX HRM — simplify your HR workflows'
						fill
						priority
						className='object-cover'
					/>

				</div>
				<div className='flex items-center justify-center p-6 md:p-10'>
					<div className='w-full max-w-md'>
						<div>
							<CardHeader className='mb-5'>
								<Image className="mb-6"
								src='/maverix-logo.png'
								alt='MaveriX - Smart HRM'
								width={100}
								height={100}
							/>
								<CardTitle>Admin already exists <CheckCircle className="bg-green-500 text-white h-4 w-4 rounded-full inline-block" /></CardTitle>
								<CardDescription>
									An administrator account is already set up. Sign in or ask your admin to invite you.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Button asChild className='w-full'>
									<Link href='/auth/login'>Go to Sign in</Link>
								</Button>
							</CardContent>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='grid min-h-svh grid-cols-1 bg-background lg:grid-cols-2'>
			<div className='relative hidden lg:block'>
				<Image
					src='/loginbg.jpg'
					alt='MaveriX HRM — admin setup'
					fill
					priority
					className='object-cover'
				/>
				<div className='absolute inset-0 bg-gradient-to-tr from-black/60 via-black/30 to-transparent' />
				<div className='relative z-10 flex h-full flex-col justify-between p-10 text-white'>
					<div className='flex items-center gap-3'>
						<Image
							src='/maverix-whitelogo.png'
							alt='MaveriX'
							width={40}
							height={40}
							className='rounded-sm'
						/>
						<span className='text-xl font-semibold tracking-tight'>
							MaveriX HRM
						</span>
					</div>
					<div className='space-y-4'>
						<h2 className='text-3xl font-semibold leading-tight'>
							Create your administrator
						</h2>
						<p className='max-w-md text-white/80'>
							Set up the first admin to manage teams, attendance and payroll.
						</p>
						<div className='mt-6 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2'>
							<div className='flex items-center gap-3 rounded-lg bg-white/10 p-3 backdrop-blur'>
								<Shield className='h-5 w-5' />
								<span className='text-sm'>Role‑based access</span>
							</div>
							<div className='flex items-center gap-3 rounded-lg bg-white/10 p-3 backdrop-blur'>
								<Users className='h-5 w-5' />
								<span className='text-sm'>Team management</span>
							</div>
							<div className='flex items-center gap-3 rounded-lg bg-white/10 p-3 backdrop-blur'>
								<Clock className='h-5 w-5' />
								<span className='text-sm'>Attendance workflows</span>
							</div>
							<div className='flex items-center gap-3 rounded-lg bg-white/10 p-3 backdrop-blur'>
								<Building2 className='h-5 w-5' />
								<span className='text-sm'>Organization‑ready</span>
							</div>
						</div>
					</div>
					<p className='text-xs text-white/70'>
						© {new Date().getFullYear()} MaveriX. All rights reserved.
					</p>
				</div>
			</div>
			<div className='flex items-center justify-center p-6 md:p-10'>
				<div className='w-full max-w-md'>
					<div className='mb-6 flex items-center justify-center gap-2 lg:hidden'>
						<Image
							src='/maverix-logo.png'
							alt='MaveriX - Smart HRM'
							width={72}
							height={72}
						/>
						<span className='text-lg font-semibold'>MaveriX HRM</span>
					</div>
					<Card className='border-muted shadow-lg'>
						<CardHeader className='text-center'>
							<div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
								<Shield className='h-6 w-6 text-primary' />
							</div>
							<CardTitle>Create admin account</CardTitle>
							<CardDescription>
								First-time setup: register as administrator. Use this only when there are no users yet.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
								<div className='grid grid-cols-2 gap-3'>
									<div className='grid gap-2'>
										<Label htmlFor='first_name'>First name</Label>
										<Input
											id='first_name'
											value={first_name}
											onChange={(e) => setFirstName(e.target.value)}
											placeholder='John'
											required
											className='h-11'
										/>
									</div>
									<div className='grid gap-2'>
										<Label htmlFor='last_name'>Last name</Label>
										<Input
											id='last_name'
											value={last_name}
											onChange={(e) => setLastName(e.target.value)}
											placeholder='Doe'
											required
											className='h-11'
										/>
									</div>
								</div>
								<div className='grid gap-2'>
									<Label htmlFor='email'>Email</Label>
									<Input
										id='email'
										type='email'
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder='admin@company.com'
										required
										className='h-11'
									/>
								</div>
								<div className='grid gap-2'>
									<div className='flex items-center justify-between'>
										<Label htmlFor='password'>Password</Label>
									</div>
									<div className='relative'>
										<Input
											id='password'
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder='••••••••'
											required
											minLength={6}
											className='h-11 pr-10'
										/>
										<button
											type='button'
											aria-label={showPassword ? "Hide password" : "Show password"}
											onClick={() => setShowPassword((v) => !v)}
											className='absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground'
										>
											{showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
										</button>
									</div>
								</div>
								{error && (
									<div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
										{error}
									</div>
								)}
								<Button type='submit' className='h-11 w-full' disabled={loading}>
									{loading ? (
										<>
											<Loader2 className='mr-2 h-4 w-4 animate-spin' />
											Creating...
										</>
									) : (
										"Create admin account"
									)}
								</Button>
							</form>
							<p className='mt-4 text-center text-sm text-muted-foreground'>
								Already have an account?{" "}
								<Link href='/auth/login' className='font-medium text-primary hover:underline'>
									Sign in
								</Link>
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
