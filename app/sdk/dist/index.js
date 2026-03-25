export { EVENT_HOOKS } from './events/catalog.js';
export { defineModule, validateModuleManifest } from './modules/manifest.js';
export { createTranslator } from './i18n/translator.js';
export { I18nProvider, useI18n } from './i18n/theme.js';
export { resolveThemeTranslationsByLocale, resolveModuleTranslationsByLocale, resolveI18nTranslationsByLocale } from './i18n/runtime.js';
export { defineThemeConfig } from './theme/config.js';
export { buildTableAction, buildTableFilter, buildTableColumn, composeBuildTableDefinition, defineBuildTable, withBuildTableData, withBuildTableQuery } from './datatables/definition.js';
export { DEFAULT_BUILD_TABLE_PAGE, DEFAULT_BUILD_TABLE_PAGE_SIZE, filterBuildTableData, formatBuildTablePaginationSummary, normalizeBuildTablePage, normalizeBuildTablePageSize, normalizeBuildTableQueryState, normalizeBuildTableSortDirection, paginateBuildTableData, resolveBuildTableView, sortBuildTableData } from './datatables/state.js';
export { createBuildTableQuerySearchParams, parseBuildTableQueryState } from './datatables/query.js';
export { createBuildTableRequestDescriptor, resolveBuildTableRemoteListResult, resolveBuildTableRemoteListUrl } from './datatables/remote.js';
export { createDataTableTemplateContract, createDataTableTemplateEntries } from './datatables/contracts.js';
export { BuildForm, BuildFormUiAdapterProvider, DataTable, DataTableUiAdapterProvider, SDK_NOTIFY_EVENT, TemplateBuildForm, buildSdkNotificationsUrl, resolveSdkDataTableDefinition, normalizeSdkNotificationIds, notify, resolveSdkNotificationAreaFromPath, sdkNotify, useNotifications } from './ui/index.js';
export { buildFormField, composeBuildFormDefinition, defineBuildForm, defineBuildFormSection, defineBuildModal, withBuildFormValues, withBuildFormRequest, withBuildFormDynamicOptions, withBuildFormRepeaterRows, resolveBuildFormValue, normalizeBuildFormColumns, normalizeBuildFormGap, toBuildFormValueString, isBuildFormTruthyValue, applyBuildFormFieldMask } from './forms.js';
export { buildFormValidationPreset, buildFormRule, createBuildFormValidationIssue, createBuildFormValidationResult, createBuildFormValidationResultFromFieldErrors, createBuildFormValidationResultFromFieldMessages, dbRef, defineValidatedBuildForm, fieldRef, getBuildFormFieldByName, getBuildFormValidation, getBuildFormValidationRulesForField, getBuildFormValidationRulesForFieldRuntime, isBuildFormValidationResultValid, isBuildFormValidationRuntimeEnabled, listBuildFormFields, matchesBuildFormValidationConditions, normalizeBuildFormValuesFromFormData, normalizeBuildFormValuesFromInput, resolveBuildFormValidationDebounceMs, resolveBuildFormValidationTriggers, shouldRunBuildFormPreflight, validateBuildFormLocally, validationCondition, withBuildFormValidation } from './form-validation.js';
export { DEFAULT_EMAIL_REGEX, buildFormValidationMessage, createBuildFormValidationMessage, createCatalogBuildFormValidationMessageResolver, formatBuildFormValidationMessage, normalizeEmail, parseOptionalPositiveInt, resolveBuildFormValidationMessage } from './validation-messages.js';
export { mergeClassNames, readString, toStringOrNull, toStringOrFallback, toNumberOrFallback } from './templates/utils.js';
export { registerRoute, getRegisteredRoute, getAllRegisteredRoutes, RouteNotFoundError, route } from './routing/registry.js';
export { RouteBuilder, configureRouteBuilderProxies, getRouteBuilderProxyConfig } from './routing/builder.js';
export { RouteArea, RouteAdmin, RouteDashboard, RouteFrontend, RouteApi, configureAreaDefaults, getAreaDefaults, configureAreaBases, getAreaBases, } from './routing/area.js';
export { matchRouteProxyChain, resolveAreaFallbackChain } from './routing/matcher.js';
export { configureApiAuthProxies, getApiAuthConfig, configureApiCors, getApiCorsConfig, matchApiPath, dispatchApiRoutes, ApiRouteBuilder, ApiMethodRouteBuilder, } from './routing/api-route.js';
export { RoutePortal, RouteApiPortal, PortalRouteBuilder, portalMetaRegistry, portalPrefixSet, dashboardPortalSet, getPortalMeta, getAllPortalNames, getPortalPages, } from './routing/portal.js';
export { configureRateLimitBackend, resolveClientIp, checkRateLimit, withRateLimit } from './routing/rate-limit.js';
export { QuotaExceededError } from './subscription-features.js';
// RichUser — enriches any user object with role-check methods.
// enrichUser() is safe client-side (no server-only imports).
// getContext() requires the server adapter — use server-side only.
export { enrichUser } from './user-roles.js';
