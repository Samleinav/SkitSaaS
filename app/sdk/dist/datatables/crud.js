import { createModuleApiRouter, parseJsonBody, revalidatePaths } from '../server.js';
function normalizePath(value) {
    const raw = value.trim();
    if (!raw || raw === '/') {
        return '/';
    }
    const prefixed = raw.startsWith('/') ? raw : `/${raw}`;
    return prefixed.replace(/\/+$/, '') || '/';
}
function buildItemPath(basePath, idParam) {
    if (basePath === '/') {
        return `/:${idParam}`;
    }
    return `${basePath}/:${idParam}`;
}
function defaultInvalidJsonBodyResponse(operation) {
    return Response.json({
        ok: false,
        error: `${operation}.invalid_json_body`
    }, { status: 400 });
}
function defaultInvalidInputResponse(operation) {
    return Response.json({
        ok: false,
        error: `${operation}.invalid_input`
    }, { status: 400 });
}
function defaultInvalidIdResponse() {
    return Response.json({
        ok: false,
        error: 'invalid_id'
    }, { status: 400 });
}
function defaultUnhandledErrorResponse(error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({
        ok: false,
        error: 'internal_error',
        message
    }, { status: 500 });
}
function parseDefaultId(raw) {
    const normalized = raw.trim();
    return normalized.length > 0 ? normalized : null;
}
async function runRevalidationIfNeeded(paths) {
    if (!paths?.length) {
        return;
    }
    await revalidatePaths(paths);
}
async function parseOperationInput({ request, routeContext, operation, parseInput, onInvalidJsonBody, onInvalidInput }) {
    const body = await parseJsonBody(request);
    if (!body) {
        return {
            ok: false,
            response: onInvalidJsonBody(operation)
        };
    }
    if (!parseInput) {
        return {
            ok: true,
            input: body
        };
    }
    const input = await parseInput({
        body,
        request,
        routeContext
    });
    if (input == null) {
        return {
            ok: false,
            response: onInvalidInput(operation)
        };
    }
    return {
        ok: true,
        input
    };
}
function resolvePolicy({ policies, operation }) {
    return policies?.[operation] ?? {};
}
export function createDataTableCrudApiRouter(options) {
    const basePath = normalizePath(options.basePath ?? '/');
    const idParam = options.idParam?.trim() || 'id';
    const itemPath = buildItemPath(basePath, idParam);
    const onInvalidJsonBody = options.onInvalidJsonBody ?? defaultInvalidJsonBodyResponse;
    const onInvalidInput = options.onInvalidInput ?? defaultInvalidInputResponse;
    const onInvalidId = options.onInvalidId ?? defaultInvalidIdResponse;
    const onUnhandledError = options.onUnhandledError ?? defaultUnhandledErrorResponse;
    const parseId = options.parseId ?? parseDefaultId;
    const routes = [];
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
            }
            catch (error) {
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
                    const created = await options.handlers.create({
                        request: routeContext.request,
                        input: parsedInput.input,
                        routeContext
                    });
                    await runRevalidationIfNeeded(options.revalidateByOperation?.create);
                    return Response.json({
                        ok: true,
                        operation: 'create',
                        data: created
                    }, { status: 201 });
                }
                catch (error) {
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
                    const updated = await options.handlers.update({
                        request: routeContext.request,
                        id: resolvedId,
                        input: parsedInput.input,
                        routeContext
                    });
                    await runRevalidationIfNeeded(options.revalidateByOperation?.update);
                    return Response.json({
                        ok: true,
                        operation: 'update',
                        data: updated
                    });
                }
                catch (error) {
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
                    const deleted = await options.handlers.delete({
                        request: routeContext.request,
                        id: resolvedId,
                        routeContext
                    });
                    await runRevalidationIfNeeded(options.revalidateByOperation?.delete);
                    return Response.json({
                        ok: true,
                        operation: 'delete',
                        data: deleted ?? null
                    });
                }
                catch (error) {
                    return onUnhandledError(error, 'delete');
                }
            }
        });
    }
    return createModuleApiRouter({
        routes
    });
}
