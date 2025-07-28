import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Always allow access to _next files and api routes
    if (
        request.nextUrl.pathname.includes('/_next/') ||
        request.nextUrl.pathname.includes('/api/')
    ) {
        return NextResponse.next();
    }

    // Let client-side auth handle the protection
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
