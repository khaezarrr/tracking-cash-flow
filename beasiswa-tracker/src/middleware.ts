import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS   = ['/login', '/register'];
const PUBLIC_PREFIXES = ['/r/'];

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
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

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

  if (user && isAuthPage) {
  const next = request.nextUrl.searchParams.get('next');

  if (next && next.startsWith('/') && !next.startsWith('//')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = next;
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  const { data: { session } } = await supabase.auth.getSession();
  const role = session?.user?.app_metadata?.role;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = role === 'admin' ? '/admin' : '/dashboard';
  redirectUrl.search = '';
  return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
  const next = request.nextUrl.searchParams.get('next');

  if (next && next.startsWith('/') && !next.startsWith('//')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = next;
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  // Cek role untuk default redirect
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = profile?.role === 'admin' ? '/admin' : '/dashboard';
  redirectUrl.search = '';
  return NextResponse.redirect(redirectUrl);
  }

  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
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
