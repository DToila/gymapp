import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type AppRole = 'admin' | 'staff' | 'coach'

const ROLE_RULES: Array<{ pattern: RegExp; allowed: AppRole[] }> = [
  { pattern: /^\/settings(?:\/.*)?$/, allowed: ['admin'] },
  { pattern: /^\/(payments|leads)(?:\/.*)?$/, allowed: ['admin', 'staff'] },
  { pattern: /^\/(dashboard|members|attendance|schedule)(?:\/.*)?$/, allowed: ['admin', 'staff', 'coach'] },
  { pattern: /^\/api\/admin\/.+$/, allowed: ['admin'] },
]

const isProtectedPath = (pathname: string): boolean => {
  return ROLE_RULES.some((rule) => rule.pattern.test(pathname))
}

const allowedRolesForPath = (pathname: string): AppRole[] | null => {
  const matched = ROLE_RULES.find((rule) => rule.pattern.test(pathname))
  return matched?.allowed || null
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response = NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        request.cookies.set({ name, value, ...options })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        request.cookies.set({ name, value: '', ...options })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  if (!isProtectedPath(pathname)) {
    return response
  }

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = (profile?.role || 'coach') as AppRole
  const allowed = allowedRolesForPath(pathname)

  if (allowed && !allowed.includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/members/:path*',
    '/attendance/:path*',
    '/schedule/:path*',
    '/payments/:path*',
    '/leads/:path*',
    '/settings/:path*',
    '/api/admin/:path*',
  ],
}
