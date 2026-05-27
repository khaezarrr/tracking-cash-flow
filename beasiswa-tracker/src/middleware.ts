import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS   = ['/login', '/register'];
const PUBLIC_PREFIXES = ['/r/']; // shareable report links

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() — bukan getSession() — validasi ke server, tidak bisa di-spoof dari cookie
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error('[Middleware] Auth error:', authError.message);
  }

  const { pathname } = request.nextUrl;

  const isAuthPage     = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const isPublicPrefix = PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
  const isStaticAsset  = pathname.startsWith('/_next') || pathname.includes('.');
  const isAdminRoute   = pathname.startsWith('/admin');

  if (isStaticAsset) return supabaseResponse;

  // Tidak login + bukan auth page + bukan public link → redirect ke login
  if (!user && !isAuthPage && !isPublicPrefix) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Login + di auth page → redirect ke dashboard (atau intended destination)
  if (user && isAuthPage) {
    const next = request.nextUrl.searchParams.get('next') ?? '/dashboard';
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = safeNext;
    dashUrl.search = '';
    return NextResponse.redirect(dashUrl);
  }

  // Admin route: cek role dari DB — hanya berjalan untuk /admin/* saja
  // agar tidak memperlambat semua request user biasa
  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      // Bukan admin → redirect ke dashboard tanpa expose error detail
      const dashUrl = request.nextUrl.clone();
      dashUrl.pathname = '/dashboard';
      dashUrl.search = '';
      return NextResponse.redirect(dashUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
