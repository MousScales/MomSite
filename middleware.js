const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE !== 'false';

const ADMIN_PATHS = new Set([
  '/admin',
  '/admin.html',
  '/admin.css',
  '/admin.js',
  '/config.js',
  '/maintenance.html',
  '/header.png',
]);

const ADMIN_API_PATHS = new Set([
  '/api/get-bookings',
  '/api/cancel-booking',
  '/api/dashboard-stats',
  '/api/get-booking-months',
]);

export default function middleware(request) {
  if (!MAINTENANCE_MODE) {
    return;
  }

  const { pathname } = new URL(request.url);

  if (ADMIN_PATHS.has(pathname) || ADMIN_API_PATHS.has(pathname)) {
    return;
  }

  if (pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'Site is currently under maintenance. Please call (860) 425-0751 to book.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return Response.redirect(new URL('/maintenance.html', request.url), 307);
}

export const config = {
  matcher: ['/((?!_vercel/).*)'],
};
