export { EVENT_HOOKS } from './events/catalog.js';
export type { EventHook } from './events/catalog.js';
export type {
  EventPayload,
  ModuleEventContext,
  EventEmitContext,
  ModuleEventHandler,
  RegisteredEventHandler,
  EventEnvelope,
  EventDispatchResult
} from './events/types.js';

export type {
  ModuleArea,
  ModuleNavArea,
  ModuleRouteAccess,
  ModuleNavItem,
  ModuleWidgetDefinition,
  ModuleRouteContext,
  ModuleFrontendSlotContext,
  ModulePageHandler,
  ModuleApiHandler,
  ModuleFrontendSlotHandler,
  ModuleFrontendSlotDefinition,
  ModuleTemplatePackEntry,
  ModuleTemplatePack,
  ModuleAuthProviderKind,
  ModuleAuthProviderFlow,
  ModuleAuthProviderCapabilities,
  ModuleAuthProviderRoutes,
  ModuleAuthProvider,
  ModulePaymentOrderType,
  ModulePaymentMethodRoutes,
  ModulePaymentMethod,
  ModuleUserRole,
  ModuleManifest
} from './modules/manifest.js';
export { defineModule, validateModuleManifest } from './modules/manifest.js';

export type {
  ModuleI18nNamespace,
  ModuleMessageTree,
  ModuleMessagesByLocale,
  ModuleMessagesByArea
} from './i18n/types.js';

export {
  ThemeI18nProvider,
  useThemeMessages,
  resolveThemeMessages,
  type ThemeMessageTree,
  type ThemeMessagesByLocale,
  type ThemeI18nRegistry
} from './i18n/theme.js';

export {
  defineThemeConfig,
  type ThemeConfig,
  type ThemeAssetsConfig,
  type ThemeAssetArea,
  type ThemeAssetPathMap,
  type ThemeAssetListPathMap,
  type ThemeAssetBooleanMap,
  type ThemeTemplateIdMap,
  type ThemeHeadConfig,
  type ThemeProviderProps
} from './theme/config.js';

export type {
  BuildTableLabels,
  BuildTableValue,
  BuildTableColumnKey,
  BuildTableActionButtonType,
  BuildTableRequestMethod,
  BuildTableRequestBodyFormat,
  BuildTableSortDirection,
  BuildTableFilterKind,
  BuildTableQueryParamOptions,
  BuildTableSortingState,
  BuildTableQueryFilters,
  BuildTableQueryState,
  BuildTableConfirmDefinition,
  BuildTableRequestDefinition,
  BuildTableLinkActionDefinition,
  BuildTableButtonActionDefinition,
  BuildTableRequestActionDefinition,
  BuildTableCustomActionDefinition,
  BuildTableActionDefinition,
  BuildTableFilterOption,
  BuildTableFilterDefinition,
  BuildTableToolbarSearchDefinition,
  BuildTableColumn,
  BuildTableHeaderDefinition,
  BuildTableToolbarDefinition,
  BuildTablePaginationDefinition,
  BuildTableRemoteSourceResponseDefinition,
  BuildTableRemoteSourceDefinition,
  BuildTableDefinition,
  ComposeBuildTableDefinitionOptions,
  ComposedBuildTableDefinition
} from './datatables/definition.js';
export {
  buildTableAction,
  buildTableFilter,
  buildTableColumn,
  composeBuildTableDefinition,
  defineBuildTable,
  withBuildTableData,
  withBuildTableQuery
} from './datatables/definition.js';
export type { ResolvedBuildTableView } from './datatables/state.js';
export {
  DEFAULT_BUILD_TABLE_PAGE,
  DEFAULT_BUILD_TABLE_PAGE_SIZE,
  filterBuildTableData,
  formatBuildTablePaginationSummary,
  normalizeBuildTablePage,
  normalizeBuildTablePageSize,
  normalizeBuildTableQueryState,
  normalizeBuildTableSortDirection,
  paginateBuildTableData,
  resolveBuildTableView,
  sortBuildTableData
} from './datatables/state.js';
export {
  createBuildTableQuerySearchParams,
  parseBuildTableQueryState
} from './datatables/query.js';
export type { BuildTableRemoteListResult } from './datatables/remote.js';
export {
  createBuildTableRequestDescriptor,
  resolveBuildTableRemoteListResult,
  resolveBuildTableRemoteListUrl
} from './datatables/remote.js';
export type {
  DataTableTemplateSlot,
  DataTableTemplateContract,
  DataTableTemplateEntryFactoryOptions
} from './datatables/contracts.js';
export {
  createDataTableTemplateContract,
  createDataTableTemplateEntries
} from './datatables/contracts.js';

export type {
  DataTableCrudOperation,
  DataTableListResult,
  DataTableListHandler,
  DataTableCreateHandler,
  DataTableUpdateHandler,
  DataTableDeleteHandler,
  DataTableCrudPolicy,
  DataTableCrudPolicies,
  DataTableCrudRevalidation,
  DataTableCrudRouterOptions
} from './datatables/crud.js';

export type {
  SdkDataTableColumn,
  SdkDataTableLabels,
  SdkNotifyInput,
  SdkNotifyTone
} from './ui/index.js';
export { DataTable, SDK_NOTIFY_EVENT, notify, sdkNotify } from './ui/index.js';

export type {
  BuildFormButtonVariant,
  BuildFormButtonSize,
  BuildFormColumns,
  BuildFormFieldColSpan,
  BuildFormGap,
  BuildFormHttpMethod,
  BuildFormFieldMask,
  BuildFormValue,
  BuildFormValues,
  BuildFormRequestActionResult,
  BuildFormRequestActionFunction,
  BuildFormRequestAction,
  BuildFormRequest,
  BuildFormOption,
  BuildFormInputFieldKind,
  BuildFormInputFieldDefinition,
  BuildFormNumberFieldDefinition,
  BuildFormTextareaFieldDefinition,
  BuildFormSelectFieldDefinition,
  BuildFormCheckboxFieldDefinition,
  BuildFormFieldDefinition,
  BuildFormSectionDefinition,
  BuildFormSecondaryAction,
  BuildFormConfirmDefinition,
  BuildFormSubmitDefinition,
  BuildFormLayoutDefinition,
  BuildFormDefinition,
  BuildModalDefinition,
  ComposeBuildFormDefinitionOptions
} from './forms.js';
export {
  buildFormField,
  composeBuildFormDefinition,
  defineBuildForm,
  defineBuildFormSection,
  defineBuildModal,
  withBuildFormValues,
  withBuildFormRequest,
  resolveBuildFormValue,
  normalizeBuildFormColumns,
  normalizeBuildFormGap,
  toBuildFormValueString,
  isBuildFormTruthyValue,
  applyBuildFormFieldMask
} from './forms.js';

export type {
  BuildFormValidationRuntime,
  BuildFormValidationTrigger,
  BuildFormBlurValidationPresetOptions,
  BuildFormFieldRef,
  BuildFormDbRef,
  BuildFormValidationCondition,
  BuildFormDbCondition,
  BuildFormRequiredRule,
  BuildFormEmailRule,
  BuildFormUrlRule,
  BuildFormMinLengthRule,
  BuildFormMaxLengthRule,
  BuildFormMinRule,
  BuildFormMaxRule,
  BuildFormRegexRule,
  BuildFormIntegerRule,
  BuildFormAcceptedRule,
  BuildFormConfirmedRule,
  BuildFormUniqueRule,
  BuildFormExistsRule,
  BuildFormValidationRule,
  BuildFormValidationDefinition,
  ValidatedBuildFormDefinition,
  BuildFormValidationIssue,
  BuildFormValidationResult
} from './form-validation.js';
export {
  buildFormValidationPreset,
  buildFormRule,
  createBuildFormValidationIssue,
  createBuildFormValidationResult,
  createBuildFormValidationResultFromFieldErrors,
  createBuildFormValidationResultFromFieldMessages,
  dbRef,
  defineValidatedBuildForm,
  fieldRef,
  getBuildFormFieldByName,
  getBuildFormValidation,
  getBuildFormValidationRulesForField,
  getBuildFormValidationRulesForFieldRuntime,
  isBuildFormValidationResultValid,
  isBuildFormValidationRuntimeEnabled,
  listBuildFormFields,
  matchesBuildFormValidationConditions,
  normalizeBuildFormValuesFromFormData,
  normalizeBuildFormValuesFromInput,
  resolveBuildFormValidationDebounceMs,
  resolveBuildFormValidationTriggers,
  shouldRunBuildFormPreflight,
  validateBuildFormLocally,
  validationCondition,
  withBuildFormValidation
} from './form-validation.js';

export type {
  BuildFormValidationMessageValue,
  BuildFormValidationMessageValues,
  BuildFormValidationMessageDescriptor,
  BuildFormValidationMessageInput,
  BuildFormValidationMessageResolver,
  BuildFormValidationMessageCatalog,
  OptionalPositiveIntParseResult
} from './validation-messages.js';
export {
  DEFAULT_EMAIL_REGEX,
  buildFormValidationMessage,
  createBuildFormValidationMessage,
  createCatalogBuildFormValidationMessageResolver,
  formatBuildFormValidationMessage,
  normalizeEmail,
  parseOptionalPositiveInt,
  resolveBuildFormValidationMessage
} from './validation-messages.js';

export type { ClassNameValue } from './templates/utils.js';
export {
  mergeClassNames,
  readString,
  toStringOrNull,
  toStringOrFallback,
  toNumberOrFallback
} from './templates/utils.js';
