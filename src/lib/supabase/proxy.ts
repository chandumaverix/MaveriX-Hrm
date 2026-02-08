import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value)
					);
					supabaseResponse = NextResponse.next({
						request,
					});
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options)
					);
				},
			},
		}
	);

	// Refresh session if expired (keeps cookies up to date)
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Protected routes: /admin/*, /hr/*, /employee/* — redirect to login if not authenticated
	const pathname = request.nextUrl.pathname;
	const isProtectedPath =
		pathname.startsWith("/admin") ||
		pathname.startsWith("/hr") ||
		pathname.startsWith("/employee") ||
		pathname === "/dashboard";

	if (isProtectedPath && !user) {
		const url = request.nextUrl.clone();
		url.pathname = "/auth/login";
		return NextResponse.redirect(url);
	}

	// Redirect logged-in users away from any auth route (/auth/*) so they cannot hit login, sign-up, forgot-password, reset-password, etc.
	const isAuthRoute = pathname.startsWith("/auth/");

	if (isAuthRoute && user) {
		const { data: employee } = await supabase
			.from("employees")
			.select("role")
			.eq("id", user.id)
			.single();

		const url = request.nextUrl.clone();

		if (employee?.role === "admin") {
			url.pathname = "/admin/dashboard";
		} else if (employee?.role === "hr") {
			url.pathname = "/hr/dashboard";
		} else {
			url.pathname = "/employee/dashboard";
		}
		return NextResponse.redirect(url);
	}

	return supabaseResponse;
}
