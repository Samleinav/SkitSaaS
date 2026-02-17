import type { EventDispatchResult, EventEmitContext, EventHook, EventPayload } from './events/types.js';
import type { ReactNode } from 'react';
import type { ModuleApiHandler, ModulePageHandler, ModuleRouteContext } from './modules/manifest.js';
export type EventEmitterAdapter = {
    emitEvent: <TPayload extends EventPayload>(hook: EventHook, payload: TPayload, context?: EventEmitContext) => Promise<EventDispatchResult>;
    emitEventAsync?: <TPayload extends EventPayload>(hook: EventHook, payload: TPayload, context?: EventEmitContext) => Promise<EventDispatchResult>;
};
export declare function configureEventEmitter(adapter: EventEmitterAdapter): void;
export declare function emitEvent<TPayload extends EventPayload>(hook: EventHook, payload: TPayload, context?: EventEmitContext): Promise<EventDispatchResult>;
export declare function emitEventAsync<TPayload extends EventPayload>(hook: EventHook, payload: TPayload, context?: EventEmitContext): Promise<EventDispatchResult>;
export type ModuleConfigAdapter = {
    getConfigValue: (namespace: string, configKey: string) => Promise<string | null>;
    setConfigValue: (namespace: string, configKey: string, configValue: string | null) => Promise<void>;
};
export declare function configureModuleConfig(adapter: ModuleConfigAdapter): void;
export declare function getModuleConfigValue(namespace: string, configKey: string): Promise<string | null>;
export declare function setModuleConfigValue(namespace: string, configKey: string, configValue: string | null): Promise<void>;
export type DatabaseAdapter = {
    getDb: () => unknown;
    getTable?: (tableId: string) => unknown | null | undefined;
    listTables?: () => Iterable<string>;
};
export declare function configureDatabase(adapter: DatabaseAdapter): void;
export declare function getDb<TDb = unknown>(): TDb;
export declare function listTables(): string[];
export declare function findTable<TTable = unknown>(tableId: string): TTable | null;
export declare function getTable<TTable = unknown>(tableId: string): NonNullable<TTable>;
export type AuthAdapter = {
    getUser: () => Promise<unknown | null>;
    requireUser?: () => Promise<unknown>;
    requireAdmin?: () => Promise<unknown>;
    setSessionForUser?: (userId: number, options?: {
        ipAddress?: string | null;
        userAgent?: string | null;
        metadata?: Record<string, unknown> | null;
    }) => Promise<void>;
};
export declare function configureAuth(adapter: AuthAdapter): void;
export declare function getUser<TUser = unknown>(): Promise<TUser | null>;
export declare function requireUser<TUser = unknown>(): Promise<TUser>;
export declare function requireAdmin<TUser = unknown>(): Promise<TUser>;
export declare function setSessionForUser(userId: number, options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
}): Promise<void>;
export type RevalidationAdapter = {
    revalidatePath: (path: string) => void | Promise<void>;
};
export declare function configureRevalidation(adapter: RevalidationAdapter): void;
export declare function revalidatePath(path: string): Promise<void>;
export declare function revalidatePaths(paths: Iterable<string>): Promise<void>;
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
type ControllerAction<TUser> = (context: ControllerContext<TUser>) => Promise<void | boolean>;
type ControllerOptions<TUser> = {
    requireUser: () => Promise<TUser>;
};
type ActionOptions = {
    revalidate?: RevalidateHandler | RevalidateHandler[];
    revalidatePaths?: string[];
};
export declare function createFormReader(formData: FormData): FormReader;
export declare function createServerActionController<TUser>({ requireUser }: ControllerOptions<TUser>): (handler: ControllerAction<TUser>, options?: ActionOptions) => (formData: FormData) => Promise<void>;
export type JsonRecord = Record<string, unknown>;
export declare function isJsonRecord(value: unknown): value is JsonRecord;
export declare function hasOwn(source: JsonRecord, key: string): boolean;
export declare function parseJsonBody<TBody extends JsonRecord = JsonRecord>(request: Request): Promise<TBody | null>;
export type ModuleRouteParams = Record<string, string>;
export type ModuleRouteAccess = 'public' | 'user' | 'admin';
export type ModuleRoleReader<TUser> = (user: TUser) => string | string[] | null | undefined;
export type ModuleApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'ANY';
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
    canAccess?: (context: ModuleApiRouteHandlerContext<TUser>) => boolean | Response | Promise<boolean | Response>;
    handler: (context: ModuleApiRouteHandlerContext<TUser>) => Promise<Response> | Response;
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
    onUnauthorized?: (context: ModuleApiDeniedContext<TUser>) => Promise<Response> | Response;
    onForbidden?: (context: ModuleApiDeniedContext<TUser>) => Promise<Response> | Response;
    onMethodNotAllowed?: (request: Request, context: ModuleRouteContext, allowedMethods: ModuleApiMethod[]) => Promise<Response> | Response;
    onNotFound?: (request: Request, context: ModuleRouteContext) => Promise<Response> | Response;
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
    canAccess?: (context: ModulePageRouteHandlerContext<TUser>) => boolean | Promise<boolean>;
    handler: (context: ModulePageRouteHandlerContext<TUser>) => Promise<ReactNode | null> | ReactNode | null;
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
    onUnauthorized?: (context: ModulePageDeniedContext<TUser>) => Promise<ReactNode | null> | ReactNode | null;
    onForbidden?: (context: ModulePageDeniedContext<TUser>) => Promise<ReactNode | null> | ReactNode | null;
    onNotFound?: (context: ModuleRouteContext) => Promise<ReactNode | null> | ReactNode | null;
};
export declare function createModuleApiRouter<TUser = unknown>({ routes, readRoles, adminRoles, onUnauthorized, onForbidden, onMethodNotAllowed, onNotFound }: ModuleApiRouterOptions<TUser>): ModuleApiHandler;
export declare function createModulePageRouter<TUser = unknown>({ routes, readRoles, adminRoles, onUnauthorized, onForbidden, onNotFound }: ModulePageRouterOptions<TUser>): ModulePageHandler;
export {};
