import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // NextAuth v4 with database sessions uses a session cookie, not a JWT.
  const secureSession = request.cookies.get('__Secure-next-auth.session-token');
  const legacySession = request.cookies.get('next-auth.session-token');
  const hasSession = Boolean(secureSession ?? legacySession);

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|login).*)']
};
