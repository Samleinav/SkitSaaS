import {
  createModuleApiRouter,
  parseJsonBody,
  revalidatePaths,
  type JsonRecord,
  type ModuleApiRoute,
  type ModuleApiRouteHandlerContext,
  type ModuleRouteAccess
} from '../server.js';
import type { ModuleApiHandler } from '../modules/manifest.js';

export type DataTableCrudOperation = 'list' | 'create' | 'update' | 'delete';

export type DataTableListResult<TItem> = {
  items: TItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
};

export type DataTableListHandler<TUser, TItem> = (context: {
  request: Request;
  searchParams: URLSearchParams;
  routeContext: ModuleApiRouteHandlerContext<TUser>;
}) => Promise<DataTableListResult<TItem>> | DataTableListResult<TItem>;

export type DataTableCreateHandler<TUser, TCreateInput, TResult> = (context: {
  request: Request;
  input: TCreateInput;
  routeContext: ModuleApiRouteHandlerContext<TUser>;
}) => Promise<TResult> | TResult;

export type DataTableUpdateHandler<TUser, TId, TUpdateInput, TResult> = (
  context: {
    request: Request;
    id: TId;
    input: TUpdateInput;
    routeContext: ModuleApiRouteHandlerContext<TUser>;
  }
) => Promise<TResult> | TResult;

export type DataTableDeleteHandler<TUser, TId, TResult> = (context: {
  request: Request;
  id: TId;
  routeContext: ModuleApiRouteHandlerContext<TUser>;
}) => Promise<TResult> | TResult;

export type DataTableCrudPolicy = {
  auth?: ModuleRouteAccess;
  roles?: string[];
  resolveUser?: boolean;
};

export type DataTableCrudPolicies = Partial<
  Record<DataTableCrudOperation, DataTableCrudPolicy>
>;

export type DataTableCrudRevalidation = Partial<
  Record<Exclude<DataTableCrudOperation, 'list'>, string[]>
>;

export type DataTableCrudRouterOptions<
  TUser = unknown,
  TItem = JsonRecord,
  TCreateInput = JsonRecord,
  TUpdateInput = JsonRecord,
  TId = string,
  TCreateResult = TItem,
  TUpdateResult = TItem,
  TDeleteResult = { id: TId }
> = {
  basePath?: string;
  idParam?: string;
  policies?: DataTableCrudPolicies;
  revalidateByOperation?: DataTableCrudRevalidation;
  parseId?: (raw: string) => TId | null;
  parseCreateInput?: (context: {
    body: JsonRecord;
    request: Request;
    routeContext: ModuleApiRouteHandlerContext<TUser>;
  }) => Promise<TCreateInput | null> | TCreateInput | null;
  parseUpdateInput?: (context: {
    body: JsonRecord;
    request: Request;
    routeContext: ModuleApiRouteHandlerContext<TUser>;
  }) => Promise<TUpdateInput | null> | TUpdateInput | null;
  onInvalidJsonBody?: (operation: 'create' | 'update') => Response;
  onInvalidInput?: (operation: 'create' | 'update') => Response;
  onInvalidId?: () => Response;
  onUnhandledError?: (
    error: unknown,
    operation: DataTableCrudOperation
  ) => Response;
  handlers: {
    list: DataTableListHandler<TUser, TItem>;
    create?: DataTableCreateHandler<TUser, TCreateInput, TCreateResult>;
    update?: DataTableUpdateHandler<TUser, TId, TUpdateInput, TUpdateResult>;
    delete?: DataTableDeleteHandler<TUser, TId, TDeleteResult>;
  };
};

function normalizePath(value: string) {
  const raw = value.trim();
  if (!raw || raw === '/') {
    return '/';
  }

  const prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  return prefixed.replace(/\/+$/, '') || '/';
}

function buildItemPath(basePath: string, idParam: string) {
  if (basePath === '/') {
    return `/:${idParam}`;
  }

  return `${basePath}/:${idParam}`;
}

function defaultInvalidJsonBodyResponse(operation: 'create' | 'update') {
  return Response.json(
    {
      ok: false,
      error: `${operation}.invalid_json_body`
    },
    { status: 400 }
  );
}

function defaultInvalidInputResponse(operation: 'create' | 'update') {
  return Response.json(
    {
      ok: false,
      error: `${operation}.invalid_input`
    },
    { status: 400 }
  );
}

function defaultInvalidIdResponse() {
  return Response.json(
    {
      ok: false,
      error: 'invalid_id'
    },
    { status: 400 }
  );
}

function defaultUnhandledErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return Response.json(
    {
      ok: false,
      error: 'internal_error',
      message
    },
    { status: 500 }
  );
}

function parseDefaultId(raw: string) {
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : null;
}

async function runRevalidationIfNeeded(paths: string[] | undefined) {
  if (!paths?.length) {
    return;
  }

  await revalidatePaths(paths);
}

type BodyParseContext<TUser, TInput> = {
  request: Request;
  routeContext: ModuleApiRouteHandlerContext<TUser>;
  operation: 'create' | 'update';
  parseInput?: (context: {
    body: JsonRecord;
    request: Request;
    routeContext: ModuleApiRouteHandlerContext<TUser>;
  }) => Promise<TInput | null> | TInput | null;
  onInvalidJsonBody: (operation: 'create' | 'update') => Response;
  onInvalidInput: (operation: 'create' | 'update') => Response;
};

async function parseOperationInput<TUser, TInput>({
  request,
  routeContext,
  operation,
  parseInput,
  onInvalidJsonBody,
  onInvalidInput
}: BodyParseContext<TUser, TInput>) {
  const body = await parseJsonBody(request);
  if (!body) {
    return {
      ok: false as const,
      response: onInvalidJsonBody(operation)
    };
  }

  if (!parseInput) {
    return {
      ok: true as const,
      input: body as TInput
    };
  }

  const input = await parseInput({
    body,
    request,
    routeContext
  });
  if (input == null) {
    return {
      ok: false as const,
      response: onInvalidInput(operation)
    };
  }

  return {
    ok: true as const,
    input
  };
}

function resolvePolicy({
  policies,
  operation
}: {
  policies: DataTableCrudPolicies | undefined;
  operation: DataTableCrudOperation;
}) {
  return policies?.[operation] ?? {};
}

export function createDataTableCrudApiRouter<
  TUser = unknown,
  TItem = JsonRecord,
  TCreateInput = JsonRecord,
  TUpdateInput = JsonRecord,
  TId = string,
  TCreateResult = TItem,
  TUpdateResult = TItem,
  TDeleteResult = { id: TId }
>(
  options: DataTableCrudRouterOptions<
    TUser,
    TItem,
    TCreateInput,
    TUpdateInput,
    TId,
    TCreateResult,
    TUpdateResult,
    TDeleteResult
  >
): ModuleApiHandler {
  const basePath = normalizePath(options.basePath ?? '/');
  const idParam = options.idParam?.trim() || 'id';
  const itemPath = buildItemPath(basePath, idParam);

  const onInvalidJsonBody =
    options.onInvalidJsonBody ?? defaultInvalidJsonBodyResponse;
  const onInvalidInput = options.onInvalidInput ?? defaultInvalidInputResponse;
  const onInvalidId = options.onInvalidId ?? defaultInvalidIdResponse;
  const onUnhandledError =
    options.onUnhandledError ?? defaultUnhandledErrorResponse;
  const parseId = options.parseId ?? (parseDefaultId as (raw: string) => TId | null);

  const routes: ModuleApiRoute<TUser>[] = [];

  const listPolicy = resolvePolicy({
    policies: options.policies,
    operation: 'list'
  });
  routes.push({
    method: 'GET',
    path: basePath,
    auth: listPolicy.auth,
    roles: listPolicy.roles,
    resolveUser: listPolicy.resolveUser,
    handler: async (routeContext) => {
      try {
        const searchParams = new URL(routeContext.request.url).searchParams;
        const result = await options.handlers.list({
          request: routeContext.request,
          searchParams,
          routeContext
        });

        return Response.json({
          ok: true,
          operation: 'list',
          data: result
        });
      } catch (error) {
        return onUnhandledError(error, 'list');
      }
    }
  });

  if (options.handlers.create) {
    const createPolicy = resolvePolicy({
      policies: options.policies,
      operation: 'create'
    });
    routes.push({
      method: 'POST',
      path: basePath,
      auth: createPolicy.auth,
      roles: createPolicy.roles,
      resolveUser: createPolicy.resolveUser,
      handler: async (routeContext) => {
        try {
          const parsedInput = await parseOperationInput({
            request: routeContext.request,
            routeContext,
            operation: 'create',
            parseInput: options.parseCreateInput,
            onInvalidJsonBody,
            onInvalidInput
          });
          if (!parsedInput.ok) {
            return parsedInput.response;
          }

          const created = await options.handlers.create!({
            request: routeContext.request,
            input: parsedInput.input,
            routeContext
          });
          await runRevalidationIfNeeded(
            options.revalidateByOperation?.create
          );

          return Response.json(
            {
              ok: true,
              operation: 'create',
              data: created
            },
            { status: 201 }
          );
        } catch (error) {
          return onUnhandledError(error, 'create');
        }
      }
    });
  }

  if (options.handlers.update) {
    const updatePolicy = resolvePolicy({
      policies: options.policies,
      operation: 'update'
    });
    routes.push({
      method: ['PUT', 'PATCH'],
      path: itemPath,
      auth: updatePolicy.auth,
      roles: updatePolicy.roles,
      resolveUser: updatePolicy.resolveUser,
      handler: async (routeContext) => {
        try {
          const rawId = routeContext.params[idParam];
          const resolvedId = rawId ? parseId(rawId) : null;
          if (resolvedId === null) {
            return onInvalidId();
          }

          const parsedInput = await parseOperationInput({
            request: routeContext.request,
            routeContext,
            operation: 'update',
            parseInput: options.parseUpdateInput,
            onInvalidJsonBody,
            onInvalidInput
          });
          if (!parsedInput.ok) {
            return parsedInput.response;
          }

          const updated = await options.handlers.update!({
            request: routeContext.request,
            id: resolvedId,
            input: parsedInput.input,
            routeContext
          });
          await runRevalidationIfNeeded(
            options.revalidateByOperation?.update
          );

          return Response.json({
            ok: true,
            operation: 'update',
            data: updated
          });
        } catch (error) {
          return onUnhandledError(error, 'update');
        }
      }
    });
  }

  if (options.handlers.delete) {
    const deletePolicy = resolvePolicy({
      policies: options.policies,
      operation: 'delete'
    });
    routes.push({
      method: 'DELETE',
      path: itemPath,
      auth: deletePolicy.auth,
      roles: deletePolicy.roles,
      resolveUser: deletePolicy.resolveUser,
      handler: async (routeContext) => {
        try {
          const rawId = routeContext.params[idParam];
          const resolvedId = rawId ? parseId(rawId) : null;
          if (resolvedId === null) {
            return onInvalidId();
          }

          const deleted = await options.handlers.delete!({
            request: routeContext.request,
            id: resolvedId,
            routeContext
          });
          await runRevalidationIfNeeded(
            options.revalidateByOperation?.delete
          );

          return Response.json({
            ok: true,
            operation: 'delete',
            data: deleted ?? null
          });
        } catch (error) {
          return onUnhandledError(error, 'delete');
        }
      }
    });
  }

  return createModuleApiRouter<TUser>({
    routes
  });
}
