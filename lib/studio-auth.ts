// Shared by the existing studio middleware and the Song Creator functions.
export function studioAuthError(request: Request): Response | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return new Response('ADMIN_PASSWORD is not configured.', {
    status: 500, headers: { 'Cache-Control': 'no-store' },
  });
  const header = request.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const separator = decoded.indexOf(':');
      if (separator >= 0 && decoded.slice(0, separator) === (process.env.ADMIN_USER || 'admin')
        && decoded.slice(separator + 1) === password) return null;
    } catch { /* Reject malformed credentials. */ }
  }
  return new Response('Authentication required', { status: 401, headers: {
    'WWW-Authenticate': 'Basic realm="DJ Terry Bevvan Admin", charset="UTF-8"',
    'Cache-Control': 'no-store',
  } });
}
