function toTrimmedString(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim();
}
let eventEmitterAdapter = null;
export function configureEventEmitter(adapter) {
    eventEmitterAdapter = adapter;
}
export async function emitEvent(hook, payload, context) {
    if (!eventEmitterAdapter) {
        throw new Error('Module SDK event emitter not configured.');
    }
    return eventEmitterAdapter.emitEvent(hook, payload, context);
}
export async function emitEventAsync(hook, payload, context) {
    if (!eventEmitterAdapter) {
        throw new Error('Module SDK event emitter not configured.');
    }
    if (eventEmitterAdapter.emitEventAsync) {
        return eventEmitterAdapter.emitEventAsync(hook, payload, context);
    }
    return eventEmitterAdapter.emitEvent(hook, payload, context);
}
let moduleConfigAdapter = null;
export function configureModuleConfig(adapter) {
    moduleConfigAdapter = adapter;
}
export async function getModuleConfigValue(namespace, configKey) {
    if (!moduleConfigAdapter) {
        throw new Error('Module SDK config adapter not configured.');
    }
    return moduleConfigAdapter.getConfigValue(namespace, configKey);
}
export async function setModuleConfigValue(namespace, configKey, configValue) {
    if (!moduleConfigAdapter) {
        throw new Error('Module SDK config adapter not configured.');
    }
    return moduleConfigAdapter.setConfigValue(namespace, configKey, configValue);
}
let databaseAdapter = null;
export function configureDatabase(adapter) {
    databaseAdapter = adapter;
}
function readDatabaseAdapter() {
    if (!databaseAdapter) {
        throw new Error('Module SDK database adapter not configured. Call configureDatabase(...) in host bootstrap.');
    }
    return databaseAdapter;
}
export function getDb() {
    const adapter = readDatabaseAdapter();
    return adapter.getDb();
}
function normalizeDatabaseTableId(tableId) {
    return toTrimmedString(tableId).toLowerCase();
}
export function listTables() {
    const adapter = readDatabaseAdapter();
    if (!adapter.listTables) {
        return [];
    }
    return Array.from(adapter.listTables())
        .map((entry) => normalizeDatabaseTableId(entry))
        .filter(Boolean)
        .sort();
}
export function findTable(tableId) {
    const normalized = normalizeDatabaseTableId(tableId);
    if (!normalized) {
        return null;
    }
    const adapter = readDatabaseAdapter();
    if (!adapter.getTable) {
        throw new Error('Module SDK database adapter does not provide getTable(tableId).');
    }
    const table = adapter.getTable(normalized);
    return (table ?? null);
}
export function getTable(tableId) {
    const normalized = normalizeDatabaseTableId(tableId);
    const table = findTable(normalized);
    if (table) {
        return table;
    }
    const available = listTables();
    const suffix = available.length
        ? ` Available tables: ${available.join(', ')}.`
        : '';
    throw new Error(`Module SDK database table not found: "${normalized}".${suffix}`);
}
let authAdapter = null;
export function configureAuth(adapter) {
    authAdapter = adapter;
}
function readAuthAdapter() {
    if (!authAdapter) {
        throw new Error('Module SDK auth adapter not configured. Call configureAuth(...) in host bootstrap.');
    }
    return authAdapter;
}
export async function getUser() {
    const adapter = readAuthAdapter();
    return (await adapter.getUser());
}
export async function requireUser() {
    const adapter = readAuthAdapter();
    if (adapter.requireUser) {
        return (await adapter.requireUser());
    }
    const user = await adapter.getUser();
    if (!user) {
        throw new Error('Module SDK auth adapter does not provide requireUser and no user is available.');
    }
    return user;
}
export async function requireAdmin() {
    const adapter = readAuthAdapter();
    if (!adapter.requireAdmin) {
        throw new Error('Module SDK auth adapter does not provide requireAdmin.');
    }
    return (await adapter.requireAdmin());
}
export async function setSessionForUser(userId, options) {
    const adapter = readAuthAdapter();
    if (!adapter.setSessionForUser) {
        throw new Error('Module SDK auth adapter does not provide setSessionForUser.');
    }
    if (!Number.isInteger(userId) || userId <= 0) {
        throw new Error('setSessionForUser requires a positive integer userId.');
    }
    await adapter.setSessionForUser(userId, options);
}
let revalidationAdapter = null;
export function configureRevalidation(adapter) {
    revalidationAdapter = adapter;
}
function readRevalidationAdapter() {
    if (!revalidationAdapter) {
        throw new Error('Module SDK revalidation adapter not configured. Call configureRevalidation(...) in host bootstrap.');
    }
    return revalidationAdapter;
}
export async function revalidatePath(path) {
    const normalized = toTrimmedString(path);
    if (!normalized) {
        return;
    }
    const adapter = readRevalidationAdapter();
    await adapter.revalidatePath(normalized);
}
export async function revalidatePaths(paths) {
    const seen = new Set();
    for (const path of paths) {
        const normalized = toTrimmedString(path);
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        await revalidatePath(normalized);
    }
}
function normalizeString(value) {
    return toTrimmedString(value);
}
export function createFormReader(formData) {
    return {
        value(field) {
            return formData.get(field);
        },
        string(field) {
            return normalizeString(formData.get(field));
        },
        lower(field) {
            return normalizeString(formData.get(field)).toLowerCase();
        },
        number(field) {
            const raw = normalizeString(formData.get(field));
            if (!raw) {
                return null;
            }
            const parsed = Number(raw);
            return Number.isNaN(parsed) ? null : parsed;
        },
        integer(field) {
            const parsed = this.number(field);
            if (parsed === null || !Number.isInteger(parsed)) {
                return null;
            }
            return parsed;
        },
        positiveInt(field) {
            const parsed = this.integer(field);
            if (parsed === null || parsed <= 0) {
                return null;
            }
            return parsed;
        },
        strings(field) {
            return formData
                .getAll(field)
                .map((entry) => normalizeString(entry))
                .filter(Boolean);
        }
    };
}
async function runRevalidation(options) {
    const revalidate = options?.revalidate;
    if (revalidate) {
        const handlers = Array.isArray(revalidate) ? revalidate : [revalidate];
        for (const handler of handlers) {
            await handler();
        }
    }
    if (!options?.revalidatePaths?.length) {
        return;
    }
    await revalidatePaths(options.revalidatePaths);
}
export function createServerActionController({ requireUser }) {
    return function withController(handler, options) {
        return async function controlledAction(formData) {
            const user = await requireUser();
            const result = await handler({
                user,
                formData,
                form: createFormReader(formData)
            });
            if (result === false) {
                return;
            }
            await runRevalidation(options);
        };
    };
}
export function isJsonRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
export function hasOwn(source, key) {
    return Object.prototype.hasOwnProperty.call(source, key);
}
export async function parseJsonBody(request) {
    try {
        const parsed = await request.json();
        if (!isJsonRecord(parsed)) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
const MODULE_API_METHODS = new Set([
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'HEAD',
    'OPTIONS',
    'ANY'
]);
const DEFAULT_ADMIN_ROLES = ['admin'];
function normalizeRoleValues(values) {
    const normalized = new Set();
    for (const value of values) {
        const role = toTrimmedString(value).toLowerCase();
        if (!role) {
            continue;
        }
        normalized.add(role);
    }
    return normalized;
}
function normalizeApiMethod(value) {
    const normalized = toTrimmedString(value).toUpperCase();
    if (!normalized) {
        return null;
    }
    if (!MODULE_API_METHODS.has(normalized)) {
        return null;
    }
    return normalized;
}
function normalizeApiMethods(method) {
    const source = Array.isArray(method) ? method : method ? [method] : ['GET'];
    const methods = new Set();
    for (const value of source) {
        const normalized = normalizeApiMethod(value);
        if (!normalized) {
            continue;
        }
        if (normalized === 'ANY') {
            return new Set(['ANY']);
        }
        methods.add(normalized);
    }
    if (!methods.size) {
        methods.add('GET');
    }
    return methods;
}
function normalizePathSegments(path) {
    const raw = toTrimmedString(path ?? '');
    if (!raw || raw === '/') {
        return [];
    }
    const normalizedPath = raw.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!normalizedPath) {
        return [];
    }
    return normalizedPath
        .split('/')
        .map((segment) => toTrimmedString(segment))
        .filter(Boolean);
}
function compileRoutePath(path) {
    return normalizePathSegments(path).map((segment) => {
        if (segment.startsWith(':') && segment.length > 1) {
            return {
                kind: 'param',
                value: segment.slice(1)
            };
        }
        return {
            kind: 'literal',
            value: segment
        };
    });
}
function matchRoutePath(compiledPath, slug) {
    if (compiledPath.length !== slug.length) {
        return null;
    }
    const params = {};
    for (let index = 0; index < compiledPath.length; index += 1) {
        const compiledSegment = compiledPath[index];
        const slugSegment = slug[index];
        if (!compiledSegment || !slugSegment) {
            return null;
        }
        if (compiledSegment.kind === 'literal') {
            if (compiledSegment.value !== slugSegment) {
                return null;
            }
            continue;
        }
        params[compiledSegment.value] = slugSegment;
    }
    return params;
}
function methodMatchesRoute(routeMethods, requestMethod) {
    if (routeMethods.has('ANY')) {
        return true;
    }
    const normalizedRequestMethod = normalizeApiMethod(requestMethod);
    return normalizedRequestMethod
        ? routeMethods.has(normalizedRequestMethod)
        : false;
}
function defaultReadRoles(user) {
    if (!user || typeof user !== 'object') {
        return [];
    }
    const source = user;
    const roleValues = [];
    if (typeof source.role === 'string') {
        roleValues.push(source.role);
    }
    if (Array.isArray(source.roles)) {
        roleValues.push(...source.roles.filter((entry) => typeof entry === 'string'));
    }
    return roleValues;
}
function getRoleSet({ user, readRoles }) {
    const roleValues = readRoles ? readRoles(user) : defaultReadRoles(user);
    const normalizedValues = Array.isArray(roleValues)
        ? roleValues
        : typeof roleValues === 'string'
            ? [roleValues]
            : [];
    return normalizeRoleValues(normalizedValues);
}
function hasRequiredRole(userRoles, requiredRoles) {
    if (!requiredRoles.size) {
        return true;
    }
    for (const role of requiredRoles) {
        if (userRoles.has(role)) {
            return true;
        }
    }
    return false;
}
function unauthorizedApiResponse() {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
}
function forbiddenApiResponse() {
    return Response.json({ error: 'Forbidden.' }, { status: 403 });
}
function methodNotAllowedApiResponse(allowedMethods) {
    const allowValue = allowedMethods.join(', ');
    return Response.json({ error: 'Method not allowed.' }, {
        status: 405,
        headers: allowValue ? { Allow: allowValue } : undefined
    });
}
function notFoundApiResponse() {
    return Response.json({ error: 'Module API route not found.' }, { status: 404 });
}
function compileApiRoutes(routes) {
    return routes.map((route) => ({
        route,
        path: compileRoutePath(route.path),
        methods: normalizeApiMethods(route.method),
        roles: normalizeRoleValues(route.roles ?? [])
    }));
}
function compilePageRoutes(routes) {
    return routes.map((route) => ({
        route,
        path: compileRoutePath(route.path),
        roles: normalizeRoleValues(route.roles ?? [])
    }));
}
export function createModuleApiRouter({ routes, readRoles, adminRoles = DEFAULT_ADMIN_ROLES, onUnauthorized, onForbidden, onMethodNotAllowed, onNotFound }) {
    const compiledRoutes = compileApiRoutes(routes);
    const adminRoleSet = normalizeRoleValues(adminRoles);
    return async function moduleApiRouter(request, context) {
        const requestMethod = toTrimmedString(request.method).toUpperCase();
        const allowedMethods = new Set();
        for (const compiledRoute of compiledRoutes) {
            const params = matchRoutePath(compiledRoute.path, context.slug);
            if (!params) {
                continue;
            }
            if (!methodMatchesRoute(compiledRoute.methods, requestMethod)) {
                for (const method of compiledRoute.methods) {
                    if (method !== 'ANY') {
                        allowedMethods.add(method);
                    }
                }
                continue;
            }
            let user = null;
            let cachedUserRoles = null;
            const shouldResolveUser = Boolean(compiledRoute.route.resolveUser) ||
                compiledRoute.route.auth === 'user' ||
                compiledRoute.route.auth === 'admin' ||
                compiledRoute.roles.size > 0 ||
                Boolean(compiledRoute.route.canAccess);
            if (shouldResolveUser) {
                user = await getUser();
            }
            const handlerContext = {
                request,
                context,
                params,
                user
            };
            const deniedContext = {
                ...handlerContext,
                route: compiledRoute.route
            };
            const readUserRoles = () => {
                if (!user) {
                    return new Set();
                }
                if (!cachedUserRoles) {
                    cachedUserRoles = getRoleSet({ user, readRoles });
                }
                return cachedUserRoles;
            };
            if (compiledRoute.route.auth === 'user' && !user) {
                if (onUnauthorized) {
                    return onUnauthorized(deniedContext);
                }
                return unauthorizedApiResponse();
            }
            if (compiledRoute.route.auth === 'admin') {
                if (!user) {
                    if (onUnauthorized) {
                        return onUnauthorized(deniedContext);
                    }
                    return unauthorizedApiResponse();
                }
                if (!hasRequiredRole(readUserRoles(), adminRoleSet)) {
                    if (onForbidden) {
                        return onForbidden(deniedContext);
                    }
                    return forbiddenApiResponse();
                }
            }
            if (compiledRoute.roles.size > 0) {
                if (!user) {
                    if (onUnauthorized) {
                        return onUnauthorized(deniedContext);
                    }
                    return unauthorizedApiResponse();
                }
                if (!hasRequiredRole(readUserRoles(), compiledRoute.roles)) {
                    if (onForbidden) {
                        return onForbidden(deniedContext);
                    }
                    return forbiddenApiResponse();
                }
            }
            if (compiledRoute.route.canAccess) {
                const canAccessResult = await compiledRoute.route.canAccess(handlerContext);
                if (canAccessResult instanceof Response) {
                    return canAccessResult;
                }
                if (!canAccessResult) {
                    if (onForbidden) {
                        return onForbidden(deniedContext);
                    }
                    return forbiddenApiResponse();
                }
            }
            return compiledRoute.route.handler(handlerContext);
        }
        if (allowedMethods.size > 0) {
            const orderedAllowedMethods = Array.from(allowedMethods).sort((left, right) => left.localeCompare(right));
            if (onMethodNotAllowed) {
                return onMethodNotAllowed(request, context, orderedAllowedMethods);
            }
            return methodNotAllowedApiResponse(orderedAllowedMethods);
        }
        if (onNotFound) {
            return onNotFound(request, context);
        }
        return notFoundApiResponse();
    };
}
export function createModulePageRouter({ routes, readRoles, adminRoles = DEFAULT_ADMIN_ROLES, onUnauthorized, onForbidden, onNotFound }) {
    const compiledRoutes = compilePageRoutes(routes);
    const adminRoleSet = normalizeRoleValues(adminRoles);
    return async function modulePageRouter(context) {
        for (const compiledRoute of compiledRoutes) {
            const params = matchRoutePath(compiledRoute.path, context.slug);
            if (!params) {
                continue;
            }
            let user = null;
            let cachedUserRoles = null;
            const shouldResolveUser = Boolean(compiledRoute.route.resolveUser) ||
                compiledRoute.route.auth === 'user' ||
                compiledRoute.route.auth === 'admin' ||
                compiledRoute.roles.size > 0 ||
                Boolean(compiledRoute.route.canAccess);
            if (shouldResolveUser) {
                user = await getUser();
            }
            const handlerContext = {
                context,
                params,
                user
            };
            const deniedContext = {
                ...handlerContext,
                route: compiledRoute.route
            };
            const readUserRoles = () => {
                if (!user) {
                    return new Set();
                }
                if (!cachedUserRoles) {
                    cachedUserRoles = getRoleSet({ user, readRoles });
                }
                return cachedUserRoles;
            };
            if (compiledRoute.route.auth === 'user' && !user) {
                if (onUnauthorized) {
                    return onUnauthorized(deniedContext);
                }
                return null;
            }
            if (compiledRoute.route.auth === 'admin') {
                if (!user) {
                    if (onUnauthorized) {
                        return onUnauthorized(deniedContext);
                    }
                    return null;
                }
                if (!hasRequiredRole(readUserRoles(), adminRoleSet)) {
                    if (onForbidden) {
                        return onForbidden(deniedContext);
                    }
                    return null;
                }
            }
            if (compiledRoute.roles.size > 0) {
                if (!user) {
                    if (onUnauthorized) {
                        return onUnauthorized(deniedContext);
                    }
                    return null;
                }
                if (!hasRequiredRole(readUserRoles(), compiledRoute.roles)) {
                    if (onForbidden) {
                        return onForbidden(deniedContext);
                    }
                    return null;
                }
            }
            if (compiledRoute.route.canAccess) {
                const canAccessResult = await compiledRoute.route.canAccess(handlerContext);
                if (!canAccessResult) {
                    if (onForbidden) {
                        return onForbidden(deniedContext);
                    }
                    return null;
                }
            }
            return compiledRoute.route.handler(handlerContext);
        }
        if (onNotFound) {
            return onNotFound(context);
        }
        return null;
    };
}
