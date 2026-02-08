"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";
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
			<div className='flex min-h-svh w-full items-center justify-center bg-linear-to-br from-primary/5 via-background to-primary/10 p-6 md:p-10'>
				<div className='w-full max-w-md text-center'>
					<div className='flex flex-col gap-6'>
						<div className='flex items-center justify-center gap-2 text-primary'>
							<Image src="/maverix-logo.png" alt="MaveriX - Smart HRM" width={100} height={100} />
						</div>
						<Card className='shadow-lg'>
							<CardHeader>
								<CardTitle>Admin already exists</CardTitle>
								<CardDescription>
									An administrator account is already set up.
									Sign in or ask your admin to invite you.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Button asChild className='w-full'>
									<Link href='/auth/login'>
										Go to Sign in
									</Link>
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='flex min-h-svh w-full items-center justify-center bg-linear-to-br from-primary/5 via-background to-primary/10 p-6 md:p-10'>
			<div className='w-full max-w-md'>
				<div className='flex flex-col gap-6'>
					<div className='flex items-center justify-center gap-2 text-primary'>
						<Image src="/maverix-logo.png" alt="MaveriX - Smart HRM" width={100} height={100} />
					</div>
					<Card className='shadow-lg'>
						<CardHeader className='text-center'>
							<div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
								<Shield className='h-6 w-6 text-primary' />
							</div>
							<CardTitle>Create admin account</CardTitle>
							<CardDescription>
								First-time setup: register as administrator. Use
								this only when there are no users yet.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={handleSubmit}
								className='flex flex-col gap-4'>
								<div className='grid grid-cols-2 gap-3'>
									<div className='grid gap-2'>
										<Label htmlFor='first_name'>
											First name
										</Label>
										<Input
											id='first_name'
											value={first_name}
											onChange={(e) =>
												setFirstName(e.target.value)
											}
											placeholder='John'
											required
											className='h-11'
										/>
									</div>
									<div className='grid gap-2'>
										<Label htmlFor='last_name'>
											Last name
										</Label>
										<Input
											id='last_name'
											value={last_name}
											onChange={(e) =>
												setLastName(e.target.value)
											}
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
										onChange={(e) =>
											setEmail(e.target.value)
										}
										placeholder='admin@company.com'
										required
										className='h-11'
									/>
								</div>
								<div className='grid gap-2'>
									<Label htmlFor='password'>Password</Label>
									<Input
										id='password'
										type='password'
										value={password}
										onChange={(e) =>
											setPassword(e.target.value)
										}
										placeholder='••••••••'
										required
										minLength={6}
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
									disabled={loading}>
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
								<Link
									href='/auth/login'
									className='font-medium text-primary hover:underline'>
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
