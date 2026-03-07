import vine, { ValidationError } from '@vinejs/vine';
import { createBuildFormValidationResultFromFieldErrors, createBuildFormValidationResult, createBuildFormValidationIssue, getBuildFormValidationRulesForFieldRuntime, getBuildFormFieldByName, listBuildFormFields, normalizeBuildFormValuesFromFormData } from './form-validation.js';
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
export function getAdminDb() {
    const adapter = readDatabaseAdapter();
    return (adapter.getAdminDb ? adapter.getAdminDb() : adapter.getDb());
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
let buildFormDbValidationAdapter = null;
export function configureRevalidation(adapter) {
    revalidationAdapter = adapter;
}
export function configureBuildFormDbValidation(adapter) {
    buildFormDbValidationAdapter = adapter;
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
function resolveControllerActionFormData(args) {
    if (args[0] instanceof FormData) {
        return args[0];
    }
    if (args[1] instanceof FormData) {
        return args[1];
    }
    throw new Error('Server action controller expected FormData payload.');
}
function isBuildFormFieldRef(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return value.kind === 'field_ref';
}
function resolveBuildFormDbConditionValue(value, values) {
    if (isBuildFormFieldRef(value)) {
        return values[value.field];
    }
    return value;
}
function resolveBuildFormDbConditions(conditions, values) {
    if (!conditions?.length) {
        return [];
    }
    return conditions.map((condition) => {
        if (condition.operator === 'eq' || condition.operator === 'ne') {
            return {
                field: condition.field,
                operator: condition.operator,
                value: resolveBuildFormDbConditionValue(condition.value, values)
            };
        }
        if (condition.operator === 'in' || condition.operator === 'not_in') {
            return {
                field: condition.field,
                operator: condition.operator,
                values: condition.values.map((entry) => resolveBuildFormDbConditionValue(entry, values))
            };
        }
        return {
            field: condition.field,
            operator: condition.operator
        };
    });
}
export function createFormReader(formData) {
    return {
        value(field) {
            const values = formData.getAll(field);
            return values.length > 0 ? values[values.length - 1] ?? null : null;
        },
        values(field) {
            return formData.getAll(field);
        },
        string(field) {
            return normalizeString(this.value(field));
        },
        lower(field) {
            return normalizeString(this.value(field)).toLowerCase();
        },
        number(field) {
            const raw = normalizeString(this.value(field));
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
        async function controlledAction(...args) {
            const formData = resolveControllerActionFormData(args);
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
        }
        return controlledAction;
    };
}
function createBuildFormValidationResultFromVineError(error, values) {
    const fieldErrors = {};
    let formError = null;
    const messages = Array.isArray(error.messages) ? error.messages : [];
    for (const entry of messages) {
        if (!entry || typeof entry !== 'object') {
            continue;
        }
        const record = entry;
        const message = toTrimmedString(record.message);
        const field = toTrimmedString(record.field);
        if (!message) {
            continue;
        }
        if (!field) {
            formError = formError ?? message;
            continue;
        }
        if (!fieldErrors[field]) {
            fieldErrors[field] = [];
        }
        fieldErrors[field].push(message);
    }
    return createBuildFormValidationResultFromFieldErrors({
        values,
        fieldErrors,
        formError,
        source: 'server'
    });
}
function hasBuildFormRequiredValidation(rules) {
    return rules.some((rule) => rule.type === 'required' || rule.type === 'accepted');
}
function normalizeBuildFormServerFieldValue({ field, value, rules }) {
    if (field.kind === 'checkbox') {
        return value;
    }
    if (!hasBuildFormRequiredValidation(rules)) {
        if (value === '' || value === null || value === undefined) {
            return undefined;
        }
    }
    return value;
}
function normalizeBuildFormValuesForServerValidation(definition, values) {
    const normalizedValues = {};
    for (const field of listBuildFormFields(definition)) {
        const rules = getBuildFormValidationRulesForFieldRuntime(definition, field.name, 'server', values);
        normalizedValues[field.name] = normalizeBuildFormServerFieldValue({
            field,
            value: values[field.name],
            rules
        });
    }
    return normalizedValues;
}
function createBuildFormVineFieldSchema(field, rules) {
    if (field.kind === 'checkbox') {
        const mustAccept = rules.some((rule) => rule.type === 'accepted' || rule.type === 'required');
        const checkboxSchema = mustAccept ? vine.accepted() : vine.boolean();
        return mustAccept ? checkboxSchema : checkboxSchema.optional();
    }
    if (field.kind === 'number') {
        let schema = vine.number();
        for (const rule of rules) {
            switch (rule.type) {
                case 'integer':
                    schema = schema.withoutDecimals();
                    break;
                case 'min':
                    schema = schema.min(rule.value);
                    break;
                case 'max':
                    schema = schema.max(rule.value);
                    break;
            }
        }
        return hasBuildFormRequiredValidation(rules) ? schema : schema.optional();
    }
    let schema = vine.string();
    for (const rule of rules) {
        switch (rule.type) {
            case 'email':
                schema = schema.email();
                break;
            case 'url':
                schema = schema.url();
                break;
            case 'min_length':
                schema = schema.minLength(rule.value);
                break;
            case 'max_length':
                schema = schema.maxLength(rule.value);
                break;
            case 'regex':
                schema = schema.regex(new RegExp(rule.pattern, rule.flags));
                break;
            case 'confirmed':
                schema = schema.sameAs(rule.field);
                break;
            case 'min':
            case 'max':
            case 'integer':
            case 'accepted':
            case 'required':
            case 'unique':
            case 'exists':
                break;
        }
    }
    return hasBuildFormRequiredValidation(rules) ? schema : schema.optional();
}
function createBuildFormServerValidator(definition, values) {
    const properties = {};
    for (const field of listBuildFormFields(definition)) {
        properties[field.name] = createBuildFormVineFieldSchema(field, getBuildFormValidationRulesForFieldRuntime(definition, field.name, 'server', values));
    }
    return vine.create(properties);
}
function isBuildFormDbRule(rule) {
    return rule.type === 'unique' || rule.type === 'exists';
}
function isMissingBuildFormValue(value) {
    if (value === undefined || value === null) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim().length === 0;
    }
    if (typeof value === 'boolean') {
        return value === false;
    }
    return false;
}
function resolveBuildFormDbRuleMessage({ field, rule, fallback }) {
    if (rule.message) {
        return rule.message;
    }
    if (fallback) {
        return fallback;
    }
    const label = field.label || field.name;
    return rule.type === 'unique'
        ? `${label} must be unique.`
        : `${label} references an invalid record.`;
}
export async function validateBuildFormDbRules({ definition, values, user, runtime, field }) {
    const issues = [];
    const fields = field
        ? [getBuildFormFieldByName(definition, field)].filter(Boolean)
        : listBuildFormFields(definition);
    for (const currentField of fields) {
        if (!currentField) {
            continue;
        }
        const rules = getBuildFormValidationRulesForFieldRuntime(definition, currentField.name, runtime, values);
        for (const rule of rules) {
            if (!isBuildFormDbRule(rule)) {
                continue;
            }
            const value = values[currentField.name];
            if (isMissingBuildFormValue(value)) {
                continue;
            }
            const resolvedIgnore = rule.type === 'unique' && rule.ignore !== undefined
                ? resolveBuildFormDbConditionValue(rule.ignore, values)
                : undefined;
            const lookup = buildFormDbValidationAdapter
                ? await buildFormDbValidationAdapter.lookup({
                    operator: rule.type,
                    runtime,
                    formId: typeof definition.id === 'string' && definition.id.trim()
                        ? definition.id.trim()
                        : null,
                    fieldName: currentField.name,
                    target: rule.target,
                    value,
                    ignore: resolvedIgnore,
                    conditions: resolveBuildFormDbConditions(rule.where, values),
                    values,
                    user
                })
                : null;
            if (!lookup) {
                issues.push(createBuildFormValidationIssue({
                    field: currentField.name,
                    code: 'db_validation_unavailable',
                    message: 'Validation service is unavailable.',
                    rule: rule.type,
                    source: runtime
                }));
                continue;
            }
            const invalid = rule.type === 'unique'
                ? lookup.exists
                : !lookup.exists;
            if (!invalid) {
                continue;
            }
            issues.push(createBuildFormValidationIssue({
                field: currentField.name,
                code: rule.type,
                message: resolveBuildFormDbRuleMessage({
                    field: currentField,
                    rule
                }),
                rule: rule.type,
                source: runtime
            }));
        }
    }
    return createBuildFormValidationResult({
        values,
        issues
    });
}
export async function validateBuildFormWithHandler({ definition, formData, user, validator }) {
    const form = createFormReader(formData);
    const values = normalizeBuildFormValuesFromFormData(definition, formData);
    return validator({
        user,
        formData,
        form,
        definition,
        values
    });
}
export async function validateBuildFormOnServer({ definition, formData, user, validator }) {
    const form = createFormReader(formData);
    const rawValues = normalizeBuildFormValuesFromFormData(definition, formData);
    let values = normalizeBuildFormValuesForServerValidation(definition, rawValues);
    try {
        const compiledValidator = createBuildFormServerValidator(definition, rawValues);
        values = (await compiledValidator.validate(values));
    }
    catch (error) {
        if (error instanceof ValidationError) {
            return createBuildFormValidationResultFromVineError(error, rawValues);
        }
        throw error;
    }
    const dbValidation = await validateBuildFormDbRules({
        definition,
        values,
        user,
        runtime: 'server'
    });
    if (!dbValidation.valid) {
        return dbValidation;
    }
    if (!validator) {
        return createValidBuildFormResult(values);
    }
    return validator({
        user,
        formData,
        form,
        definition,
        values
    });
}
export function createValidatedServerActionController({ requireUser }) {
    return function withValidatedController(definition, handler, options) {
        async function controlledValidatedAction(...args) {
            const formData = resolveControllerActionFormData(args);
            const user = await requireUser();
            const validation = await validateBuildFormOnServer({
                definition,
                formData,
                user,
                validator: options?.validator
            });
            if (!validation.valid) {
                return validation;
            }
            const result = await handler({
                user,
                formData,
                form: createFormReader(formData),
                definition,
                values: validation.values
            });
            if (result === false) {
                return createBuildFormValidationResult({
                    values: validation.values,
                    formError: options?.failureFormError ?? 'Unable to process form.'
                });
            }
            if (result && typeof result === 'object' && 'valid' in result) {
                if (result.valid) {
                    await runRevalidation(options);
                }
                return result;
            }
            await runRevalidation(options);
            return createValidBuildFormResult(validation.values);
        }
        return controlledValidatedAction;
    };
}
export function createValidBuildFormResult(values) {
    return createBuildFormValidationResult({
        values
    });
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
