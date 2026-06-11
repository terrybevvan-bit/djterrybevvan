import { next } from '@vercel/functions';

declare const process: {
  env: Record<string, string | undefined>;
};

const ADMIN_PATH_PREFIX = '/admin';
const REALM = 'DJ Terry Bevvan Admin';

function unauthorized(message = 'Authentication required') {
  return new Response(message, {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
    },
  });
}

function parseBasicAuth(header: string | null) {
  if (!header?.startsWith('Basic ')) return null;

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(':');
    if (separator === -1) return null;

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const protectsAdmin =
    url.pathname === ADMIN_PATH_PREFIX ||
    url.pathname.startsWith(`${ADMIN_PATH_PREFIX}/`);

  if (!protectsAdmin) {
    return next();
  }

  const expectedUsername = process.env.ADMIN_USER || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    return new Response('ADMIN_PASSWORD is not configured.', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const credentials = parseBasicAuth(request.headers.get('authorization'));
  if (
    credentials?.username !== expectedUsername ||
    credentials.password !== expectedPassword
  ) {
    return unauthorized();
  }

  return next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
