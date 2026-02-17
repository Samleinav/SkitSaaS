import type {
  EventDispatchResult,
  EventEmitContext,
  EventHook,
  EventPayload
} from './events/types.js';
import type { ReactNode } from 'react';
import type {
  ModuleApiHandler,
  ModulePageHandler,
  ModuleRouteContext
} from './modules/manifest.js';

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export type EventEmitterAdapter = {
  emitEvent: <TPayload extends EventPayload>(
    hook: EventHook,
    payload: TPayload,
    context?: EventEmitContext
  ) => Promise<EventDispatchResult>;
  emitEventAsync?: <TPayload extends EventPayload>(
    hook: EventHook,
    payload: TPayload,
    context?: EventEmitContext
  ) => Promise<EventDispatchResult>;
};

let eventEmitterAdapter: EventEmitterAdapter | null = null;

export function configureEventEmitter(adapter: EventEmitterAdapter) {
  eventEmitterAdapter = adapter;
}

export async function emitEvent<TPayload extends EventPayload>(
  hook: EventHook,
  payload: TPayload,
  context?: EventEmitContext
): Promise<EventDispatchResult> {
  if (!eventEmitterAdapter) {
    throw new Error('Module SDK event emitter not configured.');
  }

  return eventEmitterAdapter.emitEvent(hook, payload, context);
}

export async function emitEventAsync<TPayload extends EventPayload>(
  hook: EventHook,
  payload: TPayload,
  context?: EventEmitContext
): Promise<EventDispatchResult> {
  if (!eventEmitterAdapter) {
    throw new Error('Module SDK event emitter not configured.');
  }

  if (eventEmitterAdapter.emitEventAsync) {
    return eventEmitterAdapter.emitEventAsync(hook, payload, context);
  }

  return eventEmitterAdapter.emitEvent(hook, payload, context);
}

export type ModuleConfigAdapter = {
  getConfigValue: (namespace: string, configKey: string) => Promise<string | null>;
  setConfigValue: (
    namespace: string,
    configKey: string,
    configValue: string | null
  ) => Promise<void>;
};

let moduleConfigAdapter: ModuleConfigAdapter | null = null;

export function configureModuleConfig(adapter: ModuleConfigAdapter) {
  moduleConfigAdapter = adapter;
}

export async function getModuleConfigValue(
  namespace: string,
  configKey: string
) {
  if (!moduleConfigAdapter) {
    throw new Error('Module SDK config adapter not configured.');
  }

  return moduleConfigAdapter.getConfigValue(namespace, configKey);
}

export async function setModuleConfigValue(
  namespace: string,
  configKey: string,
  configValue: string | null
) {
  if (!moduleConfigAdapter) {
    throw new Error('Module SDK config adapter not configured.');
  }

  return moduleConfigAdapter.setConfigValue(namespace, configKey, configValue);
}

export type DatabaseAdapter = {
  getDb: () => unknown;
  getTable?: (tableId: string) => unknown | null | undefined;
  listTables?: () => Iterable<string>;
};

let databaseAdapter: DatabaseAdapter | null = null;

export function configureDatabase(adapter: DatabaseAdapter) {
  databaseAdapter = adapter;
}

function readDatabaseAdapter() {
  if (!databaseAdapter) {
    throw new Error(
      'Module SDK database adapter not configured. Call configureDatabase(...) in host bootstrap.'
    );
  }

  return databaseAdapter;
}

export function getDb<TDb = unknown>() {
  const adapter = readDatabaseAdapter();
  return adapter.getDb() as TDb;
}

function normalizeDatabaseTableId(tableId: string) {
  return toTrimmedString(tableId).toLowerCase();
}

export function listTables() {
  const adapter = readDatabaseAdapter();
  if (!adapter.listTables) {
    return [] as string[];
  }

  return Array.from(adapter.listTables())
    .map((entry) => normalizeDatabaseTableId(entry))
    .filter(Boolean)
    .sort();
}

export function findTable<TTable = unknown>(tableId: string) {
  const normalized = normalizeDatabaseTableId(tableId);
  if (!normalized) {
    return null;
  }

  const adapter = readDatabaseAdapter();
  if (!adapter.getTable) {
    throw new Error(
      'Module SDK database adapter does not provide getTable(tableId).'
    );
  }

  const table = adapter.getTable(normalized);
  return (table ?? null) as TTable | null;
}

export function getTable<TTable = unknown>(tableId: string) {
  const normalized = normalizeDatabaseTableId(tableId);
  const table = findTable<TTable>(normalized);
  if (table) {
    return table;
  }

  const available = listTables();
  const suffix = available.length
    ? ` Available tables: ${available.join(', ')}.`
    : '';
  throw new Error(
    `Module SDK database table not found: "${normalized}".${suffix}`
  );
}

export type AuthAdapter = {
  getUser: () => Promise<unknown | null>;
  requireUser?: () => Promise<unknown>;
  requireAdmin?: () => Promise<unknown>;
  setSessionForUser?: (
    userId: number,
    options?: {
      ipAddress?: string | null;
      userAgent?: string | null;
      metadata?: Record<string, unknown> | null;
    }
  ) => Promise<void>;
};

let authAdapter: AuthAdapter | null = null;

export function configureAuth(adapter: AuthAdapter) {
  authAdapter = adapter;
}

function readAuthAdapter() {
  if (!authAdapter) {
    throw new Error(
      'Module SDK auth adapter not configured. Call configureAuth(...) in host bootstrap.'
    );
  }

  return authAdapter;
}

export async function getUser<TUser = unknown>() {
  const adapter = readAuthAdapter();
  return (await adapter.getUser()) as TUser | null;
}

export async function requireUser<TUser = unknown>() {
  const adapter = readAuthAdapter();
  if (adapter.requireUser) {
    return (await adapter.requireUser()) as TUser;
  }

  const user = await adapter.getUser();
  if (!user) {
    throw new Error(
      'Module SDK auth adapter does not provide requireUser and no user is available.'
    );
  }

  return user as TUser;
}

export async function requireAdmin<TUser = unknown>() {
  const adapter = readAuthAdapter();
  if (!adapter.requireAdmin) {
    throw new Error(
      'Module SDK auth adapter does not provide requireAdmin.'
    );
  }

  return (await adapter.requireAdmin()) as TUser;
}

export async function setSessionForUser(
  userId: number,
  options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  const adapter = readAuthAdapter();
  if (!adapter.setSessionForUser) {
    throw new Error(
      'Module SDK auth adapter does not provide setSessionForUser.'
    );
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('setSessionForUser requires a positive integer userId.');
  }

  await adapter.setSessionForUser(userId, options);
}

export type RevalidationAdapter = {
  revalidatePath: (path: string) => void | Promise<void>;
};

let revalidationAdapter: RevalidationAdapter | null = null;

export function configureRevalidation(adapter: RevalidationAdapter) {
  revalidationAdapter = adapter;
}

function readRevalidationAdapter() {
  if (!revalidationAdapter) {
    throw new Error(
      'Module SDK revalidation adapter not configured. Call configureRevalidation(...) in host bootstrap.'
    );
  }

  return revalidationAdapter;
}

export async function revalidatePath(path: string) {
  const normalized = toTrimmedString(path);
  if (!normalized) {
    return;
  }

  const adapter = readRevalidationAdapter();
  await adapter.revalidatePath(normalized);
}

export async function revalidatePaths(paths: Iterable<string>) {
  const seen = new Set<string>();
  for (const path of paths) {
    const normalized = toTrimmedString(path);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    await revalidatePath(normalized);
  }
}

type RevalidateHandler = () => void | Promise<void>;

export type FormReader = {
  value: (field: string) => FormDataEntryValue | null;
  string: (field: string) => string;
  lower: (field: string) => string;
  number: (field: string) => number | null;
  integer: (field: string) => number | null;
  positiveInt: (field: string) => number | null;
  strings: (field: string) => string[];
};

export type ControllerContext<TUser> = {
  user: TUser;
  formData: FormData;
  form: FormReader;
};

type ControllerAction<TUser> = (
  context: ControllerContext<TUser>
) => Promise<void | boolean>;

type ControllerOptions<TUser> = {
  requireUser: () => Promise<TUser>;
};

type ActionOptions = {
  revalidate?: RevalidateHandler | RevalidateHandler[];
  revalidatePaths?: string[];
};

function normalizeString(value: FormDataEntryValue | null) {
  return toTrimmedString(value);
}

export function createFormReader(formData: FormData): FormReader {
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

async function runRevalidation(options?: ActionOptions) {
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

export function createServerActionController<TUser>({
  requireUser
}: ControllerOptions<TUser>) {
  return function withController(
    handler: ControllerAction<TUser>,
    options?: ActionOptions
  ) {
    return async function controlledAction(formData: FormData) {
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

export type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function hasOwn(source: JsonRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

export async function parseJsonBody<TBody extends JsonRecord = JsonRecord>(
  request: Request
) {
  try {
    const parsed = await request.json();
    if (!isJsonRecord(parsed)) {
      return null;
    }

    return parsed as TBody;
  } catch {
    return null;
  }
}

export type ModuleRouteParams = Record<string, string>;

export type ModuleRouteAccess = 'public' | 'user' | 'admin';

export type ModuleRoleReader<TUser> = (
  user: TUser
) => string | string[] | null | undefined;

export type ModuleApiMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | 'ANY';

export type ModuleApiRouteHandlerContext<TUser = unknown> = {
  request: Request;
  context: ModuleRouteContext;
  params: ModuleRouteParams;
  user: TUser | null;
};

export type ModuleApiRoute<TUser = unknown> = {
  method?: ModuleApiMethod | ModuleApiMethod[];
  path?: string;
  auth?: ModuleRouteAccess;
  roles?: string[];
  resolveUser?: boolean;
  canAccess?: (
    context: ModuleApiRouteHandlerContext<TUser>
  ) => boolean | Response | Promise<boolean | Response>;
  handler: (
    context: ModuleApiRouteHandlerContext<TUser>
  ) => Promise<Response> | Response;
};

export type ModuleApiDeniedContext<TUser = unknown> = {
  request: Request;
  context: ModuleRouteContext;
  params: ModuleRouteParams;
  user: TUser | null;
  route: ModuleApiRoute<TUser>;
};

export type ModuleApiRouterOptions<TUser = unknown> = {
  routes: ModuleApiRoute<TUser>[];
  readRoles?: ModuleRoleReader<TUser>;
  adminRoles?: string[];
  onUnauthorized?: (
    context: ModuleApiDeniedContext<TUser>
  ) => Promise<Response> | Response;
  onForbidden?: (
    context: ModuleApiDeniedContext<TUser>
  ) => Promise<Response> | Response;
  onMethodNotAllowed?: (
    request: Request,
    context: ModuleRouteContext,
    allowedMethods: ModuleApiMethod[]
  ) => Promise<Response> | Response;
  onNotFound?: (
    request: Request,
    context: ModuleRouteContext
  ) => Promise<Response> | Response;
};

export type ModulePageRouteHandlerContext<TUser = unknown> = {
  context: ModuleRouteContext;
  params: ModuleRouteParams;
  user: TUser | null;
};

export type ModulePageRoute<TUser = unknown> = {
  path?: string;
  auth?: ModuleRouteAccess;
  roles?: string[];
  resolveUser?: boolean;
  canAccess?: (
    context: ModulePageRouteHandlerContext<TUser>
  ) => boolean | Promise<boolean>;
  handler: (
    context: ModulePageRouteHandlerContext<TUser>
  ) => Promise<ReactNode | null> | ReactNode | null;
};

export type ModulePageDeniedContext<TUser = unknown> = {
  context: ModuleRouteContext;
  params: ModuleRouteParams;
  user: TUser | null;
  route: ModulePageRoute<TUser>;
};

export type ModulePageRouterOptions<TUser = unknown> = {
  routes: ModulePageRoute<TUser>[];
  readRoles?: ModuleRoleReader<TUser>;
  adminRoles?: string[];
  onUnauthorized?: (
    context: ModulePageDeniedContext<TUser>
  ) => Promise<ReactNode | null> | ReactNode | null;
  onForbidden?: (
    context: ModulePageDeniedContext<TUser>
  ) => Promise<ReactNode | null> | ReactNode | null;
  onNotFound?: (
    context: ModuleRouteContext
  ) => Promise<ReactNode | null> | ReactNode | null;
};

type CompiledRouteSegment =
  | { kind: 'literal'; value: string }
  | { kind: 'param'; value: string };

type CompiledApiRoute<TUser> = {
  route: ModuleApiRoute<TUser>;
  path: CompiledRouteSegment[];
  methods: Set<ModuleApiMethod>;
  roles: Set<string>;
};

type CompiledPageRoute<TUser> = {
  route: ModulePageRoute<TUser>;
  path: CompiledRouteSegment[];
  roles: Set<string>;
};

const MODULE_API_METHODS = new Set<ModuleApiMethod>([
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

function normalizeRoleValues(values: Iterable<string>) {
  const normalized = new Set<string>();
  for (const value of values) {
    const role = toTrimmedString(value).toLowerCase();
    if (!role) {
      continue;
    }

    normalized.add(role);
  }

  return normalized;
}

function normalizeApiMethod(value: string): ModuleApiMethod | null {
  const normalized = toTrimmedString(value).toUpperCase();
  if (!normalized) {
    return null;
  }

  if (!MODULE_API_METHODS.has(normalized as ModuleApiMethod)) {
    return null;
  }

  return normalized as ModuleApiMethod;
}

function normalizeApiMethods(method?: ModuleApiMethod | ModuleApiMethod[]) {
  const source = Array.isArray(method) ? method : method ? [method] : ['GET'];
  const methods = new Set<ModuleApiMethod>();
  for (const value of source) {
    const normalized = normalizeApiMethod(value);
    if (!normalized) {
      continue;
    }

    if (normalized === 'ANY') {
      return new Set<ModuleApiMethod>(['ANY']);
    }

    methods.add(normalized);
  }

  if (!methods.size) {
    methods.add('GET');
  }

  return methods;
}

function normalizePathSegments(path?: string) {
  const raw = toTrimmedString(path ?? '');
  if (!raw || raw === '/') {
    return [] as string[];
  }

  const normalizedPath = raw.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!normalizedPath) {
    return [] as string[];
  }

  return normalizedPath
    .split('/')
    .map((segment) => toTrimmedString(segment))
    .filter(Boolean);
}

function compileRoutePath(path?: string) {
  return normalizePathSegments(path).map((segment) => {
    if (segment.startsWith(':') && segment.length > 1) {
      return {
        kind: 'param',
        value: segment.slice(1)
      } satisfies CompiledRouteSegment;
    }

    return {
      kind: 'literal',
      value: segment
    } satisfies CompiledRouteSegment;
  });
}

function matchRoutePath(
  compiledPath: CompiledRouteSegment[],
  slug: string[]
): ModuleRouteParams | null {
  if (compiledPath.length !== slug.length) {
    return null;
  }

  const params: ModuleRouteParams = {};
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

function methodMatchesRoute(
  routeMethods: Set<ModuleApiMethod>,
  requestMethod: string
) {
  if (routeMethods.has('ANY')) {
    return true;
  }

  const normalizedRequestMethod = normalizeApiMethod(requestMethod);
  return normalizedRequestMethod
    ? routeMethods.has(normalizedRequestMethod)
    : false;
}

function defaultReadRoles<TUser>(user: TUser): string[] {
  if (!user || typeof user !== 'object') {
    return [];
  }

  const source = user as Record<string, unknown>;
  const roleValues: string[] = [];

  if (typeof source.role === 'string') {
    roleValues.push(source.role);
  }

  if (Array.isArray(source.roles)) {
    roleValues.push(
      ...source.roles.filter((entry): entry is string => typeof entry === 'string')
    );
  }

  return roleValues;
}

function getRoleSet<TUser>({
  user,
  readRoles
}: {
  user: TUser;
  readRoles?: ModuleRoleReader<TUser>;
}) {
  const roleValues = readRoles ? readRoles(user) : defaultReadRoles(user);
  const normalizedValues = Array.isArray(roleValues)
    ? roleValues
    : typeof roleValues === 'string'
      ? [roleValues]
      : [];
  return normalizeRoleValues(normalizedValues);
}

function hasRequiredRole(userRoles: Set<string>, requiredRoles: Set<string>) {
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

function methodNotAllowedApiResponse(allowedMethods: ModuleApiMethod[]) {
  const allowValue = allowedMethods.join(', ');
  return Response.json(
    { error: 'Method not allowed.' },
    {
      status: 405,
      headers: allowValue ? { Allow: allowValue } : undefined
    }
  );
}

function notFoundApiResponse() {
  return Response.json({ error: 'Module API route not found.' }, { status: 404 });
}

function compileApiRoutes<TUser>(routes: ModuleApiRoute<TUser>[]) {
  return routes.map(
    (route) =>
      ({
        route,
        path: compileRoutePath(route.path),
        methods: normalizeApiMethods(route.method),
        roles: normalizeRoleValues(route.roles ?? [])
      }) satisfies CompiledApiRoute<TUser>
  );
}

function compilePageRoutes<TUser>(routes: ModulePageRoute<TUser>[]) {
  return routes.map(
    (route) =>
      ({
        route,
        path: compileRoutePath(route.path),
        roles: normalizeRoleValues(route.roles ?? [])
      }) satisfies CompiledPageRoute<TUser>
  );
}

export function createModuleApiRouter<TUser = unknown>({
  routes,
  readRoles,
  adminRoles = DEFAULT_ADMIN_ROLES,
  onUnauthorized,
  onForbidden,
  onMethodNotAllowed,
  onNotFound
}: ModuleApiRouterOptions<TUser>): ModuleApiHandler {
  const compiledRoutes = compileApiRoutes(routes);
  const adminRoleSet = normalizeRoleValues(adminRoles);

  return async function moduleApiRouter(request, context) {
    const requestMethod = toTrimmedString(request.method).toUpperCase();
    const allowedMethods = new Set<ModuleApiMethod>();

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

      let user: TUser | null = null;
      let cachedUserRoles: Set<string> | null = null;
      const shouldResolveUser =
        Boolean(compiledRoute.route.resolveUser) ||
        compiledRoute.route.auth === 'user' ||
        compiledRoute.route.auth === 'admin' ||
        compiledRoute.roles.size > 0 ||
        Boolean(compiledRoute.route.canAccess);
      if (shouldResolveUser) {
        user = await getUser<TUser>();
      }

      const handlerContext: ModuleApiRouteHandlerContext<TUser> = {
        request,
        context,
        params,
        user
      };

      const deniedContext: ModuleApiDeniedContext<TUser> = {
        ...handlerContext,
        route: compiledRoute.route
      };

      const readUserRoles = () => {
        if (!user) {
          return new Set<string>();
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
      const orderedAllowedMethods = Array.from(allowedMethods).sort(
        (left, right) => left.localeCompare(right)
      ) as ModuleApiMethod[];
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

export function createModulePageRouter<TUser = unknown>({
  routes,
  readRoles,
  adminRoles = DEFAULT_ADMIN_ROLES,
  onUnauthorized,
  onForbidden,
  onNotFound
}: ModulePageRouterOptions<TUser>): ModulePageHandler {
  const compiledRoutes = compilePageRoutes(routes);
  const adminRoleSet = normalizeRoleValues(adminRoles);

  return async function modulePageRouter(context) {
    for (const compiledRoute of compiledRoutes) {
      const params = matchRoutePath(compiledRoute.path, context.slug);
      if (!params) {
        continue;
      }

      let user: TUser | null = null;
      let cachedUserRoles: Set<string> | null = null;
      const shouldResolveUser =
        Boolean(compiledRoute.route.resolveUser) ||
        compiledRoute.route.auth === 'user' ||
        compiledRoute.route.auth === 'admin' ||
        compiledRoute.roles.size > 0 ||
        Boolean(compiledRoute.route.canAccess);
      if (shouldResolveUser) {
        user = await getUser<TUser>();
      }

      const handlerContext: ModulePageRouteHandlerContext<TUser> = {
        context,
        params,
        user
      };

      const deniedContext: ModulePageDeniedContext<TUser> = {
        ...handlerContext,
        route: compiledRoute.route
      };

      const readUserRoles = () => {
        if (!user) {
          return new Set<string>();
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
