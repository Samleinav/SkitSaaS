import { type JsonRecord, type ModuleApiRouteHandlerContext, type ModuleRouteAccess } from '../server.js';
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
export type DataTableUpdateHandler<TUser, TId, TUpdateInput, TResult> = (context: {
    request: Request;
    id: TId;
    input: TUpdateInput;
    routeContext: ModuleApiRouteHandlerContext<TUser>;
}) => Promise<TResult> | TResult;
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
export type DataTableCrudPolicies = Partial<Record<DataTableCrudOperation, DataTableCrudPolicy>>;
export type DataTableCrudRevalidation = Partial<Record<Exclude<DataTableCrudOperation, 'list'>, string[]>>;
export type DataTableCrudRouterOptions<TUser = unknown, TItem = JsonRecord, TCreateInput = JsonRecord, TUpdateInput = JsonRecord, TId = string, TCreateResult = TItem, TUpdateResult = TItem, TDeleteResult = {
    id: TId;
}> = {
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
    onUnhandledError?: (error: unknown, operation: DataTableCrudOperation) => Response;
    handlers: {
        list: DataTableListHandler<TUser, TItem>;
        create?: DataTableCreateHandler<TUser, TCreateInput, TCreateResult>;
        update?: DataTableUpdateHandler<TUser, TId, TUpdateInput, TUpdateResult>;
        delete?: DataTableDeleteHandler<TUser, TId, TDeleteResult>;
    };
};
export declare function createDataTableCrudApiRouter<TUser = unknown, TItem = JsonRecord, TCreateInput = JsonRecord, TUpdateInput = JsonRecord, TId = string, TCreateResult = TItem, TUpdateResult = TItem, TDeleteResult = {
    id: TId;
}>(options: DataTableCrudRouterOptions<TUser, TItem, TCreateInput, TUpdateInput, TId, TCreateResult, TUpdateResult, TDeleteResult>): ModuleApiHandler;
