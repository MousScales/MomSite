import os

MAINTENANCE_MODE = os.getenv('MAINTENANCE_MODE', 'true').lower() in ('1', 'true', 'yes')

ADMIN_PAGE_PATHS = frozenset({'/admin', '/admin.html'})

ADMIN_ASSET_FILES = frozenset({'admin.css', 'admin.js', 'config.js'})

MAINTENANCE_ASSET_FILES = frozenset({'header.png'})

ADMIN_API_PATHS = frozenset({
    '/api/get-bookings',
    '/api/cancel-booking',
    '/api/dashboard-stats',
    '/api/get-booking-months',
})

MAINTENANCE_PAGE = '/maintenance.html'


def normalize_path(path):
    if not path or path == '/':
        return '/'
    return path.rstrip('/') or '/'


def is_admin_allowed(path):
    normalized = normalize_path(path)

    if normalized in ADMIN_PAGE_PATHS:
        return True

    if normalized == MAINTENANCE_PAGE:
        return True

    filename = normalized.lstrip('/')
    if filename in ADMIN_ASSET_FILES or filename in MAINTENANCE_ASSET_FILES:
        return True

    if normalized in ADMIN_API_PATHS:
        return True

    return False
