import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll().map((cookie) => ({
                    name: cookie.name,
                    value: cookie.value,
                }));
            },
            setAll(
                cookiesToSet: {
                    name: string;
                    value: string;
                    options: CookieOptions;
                }[]
            ) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                );
                response = NextResponse.next({
                    request: {
                        headers: request.headers,
                    },
                });
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                );
            },
        },
    });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Allow public routes (exact match or prefix for marketplace)
    const isPublic =
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/signup" ||
        pathname.startsWith("/marketplace");

    if (isPublic) {
        // If logged in and trying to access login/signup, redirect to /projects
        if (user && (pathname === "/login" || pathname === "/signup")) {
            return NextResponse.redirect(new URL("/projects", request.url));
        }
        return response;
    }

    // Allow auth callback
    if (pathname.startsWith("/auth/callback")) {
        return response;
    }

    // Allow API routes (they handle their own auth)
    if (pathname.startsWith("/api/")) {
        return response;
    }

    // Redirect unauthenticated users to login
    if (!user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Admin route protection
    if (pathname.startsWith("/admin")) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.redirect(new URL("/projects", request.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        // Skip: Next.js static files, image optimizer, API routes, auth callbacks, and all static assets
        "/((?!_next/static|_next/image|favicon.ico|api/|auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
