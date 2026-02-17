import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
function assertCondition(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
function normalizeModuleId(moduleId) {
    const normalized = typeof moduleId === 'string' ? moduleId.trim() : '';
    return normalized;
}
function ensureStringField(source, fieldName, errorPrefix) {
    const rawValue = source[fieldName];
    assertCondition(typeof rawValue === 'string' && rawValue.trim().length > 0, `${errorPrefix} manifest.${fieldName} must be a non-empty string.`);
    return rawValue.trim();
}
function ensureOptionalFunctionField(source, fieldName, errorPrefix) {
    const rawValue = source[fieldName];
    if (rawValue === undefined) {
        return;
    }
    assertCondition(typeof rawValue === 'function', `${errorPrefix} manifest.${fieldName} must be a function when defined.`);
}
function ensureOptionalAliasField(source, fieldName, errorPrefix) {
    const rawValue = source[fieldName];
    if (rawValue === undefined) {
        return;
    }
    assertCondition(Array.isArray(rawValue), `${errorPrefix} manifest.${fieldName} must be an array of strings when defined.`);
    for (const entry of rawValue) {
        assertCondition(typeof entry === 'string' && entry.trim().length > 0, `${errorPrefix} manifest.${fieldName} must contain non-empty strings.`);
    }
}
function ensureOptionalRouteAccessField(source, errorPrefix) {
    const rawValue = source.frontendRouteAccess;
    if (rawValue === undefined) {
        return;
    }
    assertCondition(rawValue === 'public' || rawValue === 'user' || rawValue === 'admin', `${errorPrefix} manifest.frontendRouteAccess must be one of: public, user, admin.`);
}
function ensureOptionalFrontendSlotsField(source, errorPrefix) {
    const rawValue = source.frontendSlots;
    if (rawValue === undefined) {
        return;
    }
    assertCondition(Array.isArray(rawValue), `${errorPrefix} manifest.frontendSlots must be an array when defined.`);
    for (let index = 0; index < rawValue.length; index += 1) {
        const entry = rawValue[index];
        assertCondition(Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry), `${errorPrefix} manifest.frontendSlots[${index}] must be an object.`);
        const slotRecord = entry;
        const slotId = slotRecord.slotId;
        assertCondition(typeof slotId === 'string' && slotId.trim().length > 0, `${errorPrefix} manifest.frontendSlots[${index}].slotId must be a non-empty string.`);
        const handler = slotRecord.handler;
        assertCondition(typeof handler === 'function', `${errorPrefix} manifest.frontendSlots[${index}].handler must be a function.`);
    }
}
async function importCompiledManifest(manifestPath) {
    const manifestUrl = pathToFileURL(manifestPath);
    manifestUrl.searchParams.set('sdk_testing_ts', String(Date.now()));
    const loaded = await import(manifestUrl.href);
    const candidate = loaded.default ?? loaded;
    assertCondition(candidate && typeof candidate === 'object' && !Array.isArray(candidate), '[sdk.testing] compiled manifest must export a default object.');
    return candidate;
}
export async function runSourcePackageContractChecks(options = {}) {
    const expectedModuleId = normalizeModuleId(options.moduleId);
    const errorPrefix = expectedModuleId
        ? `[${expectedModuleId}]`
        : '[sdk.testing]';
    const moduleDir = path.resolve(options.moduleDir ?? process.cwd());
    const distDir = path.resolve(options.distDir ?? path.join(moduleDir, 'dist'));
    const manifestPath = path.resolve(options.manifestPath ??
        path.join(distDir, options.manifestFile?.trim() || 'manifest.js'));
    assertCondition(fs.existsSync(manifestPath), `${errorPrefix} compiled manifest not found at "${manifestPath}". Build the module first.`);
    const manifestRecord = await importCompiledManifest(manifestPath);
    const moduleId = ensureStringField(manifestRecord, 'moduleId', errorPrefix);
    const version = ensureStringField(manifestRecord, 'version', errorPrefix);
    const displayName = ensureStringField(manifestRecord, 'displayName', errorPrefix);
    if (expectedModuleId) {
        assertCondition(moduleId === expectedModuleId, `${errorPrefix} manifest.moduleId="${moduleId}" does not match expected "${expectedModuleId}".`);
    }
    ensureOptionalFunctionField(manifestRecord, 'adminPage', errorPrefix);
    ensureOptionalFunctionField(manifestRecord, 'dashboardPage', errorPrefix);
    ensureOptionalFunctionField(manifestRecord, 'frontendPage', errorPrefix);
    ensureOptionalFunctionField(manifestRecord, 'apiHandler', errorPrefix);
    ensureOptionalAliasField(manifestRecord, 'adminRouteAliases', errorPrefix);
    ensureOptionalAliasField(manifestRecord, 'dashboardRouteAliases', errorPrefix);
    ensureOptionalAliasField(manifestRecord, 'frontendRouteAliases', errorPrefix);
    ensureOptionalRouteAccessField(manifestRecord, errorPrefix);
    ensureOptionalFrontendSlotsField(manifestRecord, errorPrefix);
    return {
        moduleDir,
        distDir,
        manifestPath,
        manifest: {
            ...manifestRecord,
            moduleId,
            version,
            displayName
        }
    };
}
export async function runSourcePackageTestSuite(options = {}) {
    const result = await runSourcePackageContractChecks(options);
    for (const check of options.checks ?? []) {
        await check(result);
    }
    return result;
}
