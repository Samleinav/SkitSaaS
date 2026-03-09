export { configureApiAuthProxies, getApiAuthConfig, configureApiCors, getApiCorsConfig, matchApiPath, dispatchApiRoutes, ApiRouteBuilder, ApiMethodRouteBuilder, } from './api-route.js';
export { registerRoute, getRegisteredRoute, getAllRegisteredRoutes, RouteNotFoundError, route } from './registry.js';
export { RouteBuilder } from './builder.js';
export { RouteArea, RouteAdmin, RouteDashboard, RouteFrontend, RouteApi, configureAreaDefaults, getAreaDefaults, configureAreaBases, getAreaBases, } from './area.js';
export { matchRouteProxyChain, resolveAreaFallbackChain } from './matcher.js';
export { configureRateLimitBackend, resolveClientIp, checkRateLimit, withRateLimit } from './rate-limit.js';
