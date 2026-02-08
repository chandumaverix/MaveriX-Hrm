"use client";

import Link from "next/link";
import Image from "next/image";
export default function SignUpPage() {
	return (
		<div className='flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-10'>
			<div className='w-full max-w-md text-center'>
				<div className='flex flex-col gap-6'>
					<div className='flex items-center justify-center gap-2 text-primary'>
						<Image src="/maverix-logo.png" alt="MaveriX - Smart HRM" width={100} height={100} />
					</div>
					<p className='text-muted-foreground'>
						Redirecting to sign in...
					</p>
					<p className='text-sm text-muted-foreground'>
						New accounts are created by your administrator or HR.
						Contact them to get access.
					</p>
					<Link
						href='/auth/login'
						className='font-medium text-primary underline-offset-4 hover:underline'>
						Go to Sign in
					</Link>
				</div>
			</div>
		</div>
	);
}
