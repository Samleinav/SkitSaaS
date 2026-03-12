/**
 * Portal page registry bootstrap — Node.js server context.
 *
 * This file is imported by lib/portals/runtime.tsx to ensure all portal page
 * registrations are loaded before the dispatcher resolves any portal request.
 *
 * HOW TO ADD A MODULE'S PORTAL PAGES:
 * Create a portal-init.ts in your module that calls .page() and .register() on
 * the RoutePortal factory, then import it here.
 *
 * The module's routes.ts (edge-safe) handles middleware proxy enforcement via .name().
 * This file handles page resolution in the Node.js server context.
 *
 * @example
 * // After creating modules/mod.school/src/portal-init.ts:
 * import '@/../modules/mod.school/src/portal-init';
 */

// Module portal-init files — uncomment to register portal pages:
// import '@/../modules/mod.example.portal/src/portal-init';
