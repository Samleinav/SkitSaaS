export { configureApiAuthProxies, getApiAuthConfig, configureApiCors, getApiCorsConfig, matchApiPath, dispatchApiRoutes, ApiRouteBuilder, ApiMethodRouteBuilder, } from './api-route.js';
export { registerRoute, getRegisteredRoute, getAllRegisteredRoutes, RouteNotFoundError, route } from './registry.js';
export { RouteBuilder, configureRouteBuilderProxies, getRouteBuilderProxyConfig } from './builder.js';
export { RouteArea, RouteAdmin, RouteDashboard, RouteFrontend, RouteApi, configureAreaDefaults, getAreaDefaults, configureAreaBases, getAreaBases, } from './area.js';
export { matchRouteProxyChain, resolveAreaFallbackChain } from './matcher.js';
export { RoutePortal, RouteApiPortal, PortalRouteBuilder, portalMetaRegistry, portalPrefixSet, dashboardPortalSet, getPortalMeta, getAllPortalNames, getPortalPages, } from './portal.js';
export { configureRateLimitBackend, resolveClientIp, checkRateLimit, withRateLimit } from './rate-limit.js';
