const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE !== 'false';

const ADMIN_API_PATHS = new Set([
  '/api/get-bookings',
  '/api/cancel-booking',
  '/api/dashboard-stats',
  '/api/get-booking-months',
]);

const MAINTENANCE_MESSAGE =
  'Site is currently under maintenance. Please call (860) 425-0751 to book.';

function getPathname(url) {
  if (!url) return '';
  if (url.startsWith('http')) return new URL(url).pathname;
  return url.split('?')[0];
}

function isMaintenanceBlocked(url) {
  if (!MAINTENANCE_MODE) {
    return false;
  }

  return !ADMIN_API_PATHS.has(getPathname(url));
}

function blockIfMaintenance(req, res) {
  if (!isMaintenanceBlocked(req.url)) {
    return false;
  }

  res.status(503).json({ error: MAINTENANCE_MESSAGE });
  return true;
}

function maintenanceJsonResponse() {
  return new Response(JSON.stringify({ error: MAINTENANCE_MESSAGE }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

module.exports = {
  isMaintenanceBlocked,
  blockIfMaintenance,
  maintenanceJsonResponse,
};
