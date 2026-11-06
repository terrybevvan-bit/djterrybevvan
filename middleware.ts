import { next } from '@vercel/functions';
import { studioAuthError } from './lib/studio-auth';

const PROTECTED_PATH_PREFIXES = ['/admin', '/studio', '/api/song-creator'];

export default function middleware(request: Request) {
  const pathname = new URL(request.url).pathname;
  const protectedPath = PROTECTED_PATH_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
  return protectedPath ? studioAuthError(request) || next() : next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/studio', '/studio/:path*', '/api/song-creator', '/api/song-creator/:path*'],
};
