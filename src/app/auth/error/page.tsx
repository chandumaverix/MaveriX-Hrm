import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle, Building2 } from "lucide-react";

export default async function AuthErrorPage({
	searchParams,
}: {
	searchParams: Promise<{ error: string }>;
}) {
	const params = await searchParams;

	return (
		<div className='flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-10'>
			<div className='w-full max-w-md'>
				<div className='flex flex-col gap-6'>
					<div className='flex items-center justify-center gap-2 text-primary'>
						<Building2 className='h-8 w-8' />
						<span className='text-2xl font-bold'>MaveriX - Smart HRM</span>
					</div>
					<Card className='shadow-lg'>
						<CardHeader className='text-center'>
							<div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10'>
								<AlertTriangle className='h-8 w-8 text-destructive' />
							</div>
							<CardTitle className='text-2xl'>
								Something Went Wrong
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='rounded-lg bg-muted p-4'>
								{params?.error ? (
									<p className='text-sm text-muted-foreground'>
										Error: {params.error}
									</p>
								) : (
									<p className='text-sm text-muted-foreground'>
										An unspecified error occurred during
										authentication.
									</p>
								)}
							</div>
							<Button asChild className='w-full'>
								<Link href='/auth/login'>Back to Sign In</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
