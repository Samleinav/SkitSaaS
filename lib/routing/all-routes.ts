/**
 * Route registry entry point — imported by proxy.ts to ensure all routes
 * are registered (and area proxy defaults configured) before any request.
 *
 * core/routes.ts imports '@/lib/routing/area-setup' as its FIRST import,
 * which calls configureAreaDefaults({ admin: [proxyAdmin], dashboard: [proxyAuth] })
 * before any RouteAdmin/RouteDashboard calls execute.
 *
 * HOW TO ADD A MODULE'S ROUTES:
 * Import the module's routes.ts file here. Each module routes.ts should also
 * import '@/lib/routing/area-setup' as its first import when it needs proxies.
 *
 * @example
 * // After creating modules/mod.my-feature/src/routes.ts:
 * import '@/../modules/mod.my-feature/src/routes';
 */

// Core routes (includes area-setup as its first import)
import '@/core/routes';

// Module routes — uncomment to include per-route proxy chains in proxy.ts
// import '@/../modules/mod.example.suite/src/routes';
// import '@/../modules/mod.example.portal/src/routes';
