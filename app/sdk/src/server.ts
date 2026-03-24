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
import type { UseI18nOptions } from './i18n/runtime.js';
import type { Translator } from './i18n/types.js';
import vine, { ValidationError } from '@vinejs/vine';
import type {
  BuildFormDefinition,
  BuildFormFieldDefinition,
  BuildFormValue,
  BuildFormValues
} from './forms.js';
import type {
  SdkCreateNotificationInput,
  SdkCreateNotificationResult,
  SdkNotificationTeamRecipients
} from './notifications/types.js';
import {
  bindSfilesActor,
  type ActorBoundSfilesManager,
  type SFilesActorContext
} from './sfiles.js';
import { enrichUser } from './user-roles.js';
import {
  type BuildFormDbCondition,
  type BuildFormDbRef,
  type BuildFormFieldRef,
  createBuildFormValidationResultFromFieldErrors,
  createBuildFormValidationResult,
  createBuildFormValidationIssue,
  getBuildFormValidationRulesForFieldRuntime,
  getBuildFormFieldByName,
  listBuildFormFields,
  normalizeBuildFormValuesFromFormData,
  type BuildFormValidationIssue,
  type BuildFormValidationResult,
  type BuildFormValidationRule,
  type ValidatedBuildFormDefinition
} from './form-validation.js';
export type {
  BuildFormUiTemplateResolution,
  BuildFormUiTemplateResolverAdapter,
  BuildFormUiTemplateResolverContext
} from './ui/build-form-contract.js';
export { configureBuildFormUiTemplateResolver } from './ui/build-form-template-resolver.js';

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
  getAdminDb?: () => unknown;
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

export function getAdminDb<TDb = unknown>() {
  const adapter = readDatabaseAdapter();
  return (adapter.getAdminDb ? adapter.getAdminDb() : adapter.getDb()) as TDb;
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

const AUTH_PROVIDER_START_STATE_HEADER = 'x-skitsaas-auth-provider-state';
const AUTH_PROVIDER_VERIFIED_HEADER = 'x-skitsaas-auth-provider-handoff-verified';
const AUTH_PROVIDER_NONCE_HEADER = 'x-skitsaas-auth-provider-handoff-nonce';

function readAuthProviderHeader(request: Request, name: string) {
  const value = request.headers.get(name);
  return value ? value.trim() || null : null;
}

export function getAuthProviderStartState(request: Request) {
  return readAuthProviderHeader(request, AUTH_PROVIDER_START_STATE_HEADER);
}

export function getVerifiedAuthProviderCallbackState(request: Request) {
  if (readAuthProviderHeader(request, AUTH_PROVIDER_VERIFIED_HEADER) !== '1') {
    return null;
  }

  return readAuthProviderHeader(request, AUTH_PROVIDER_NONCE_HEADER);
}

export type AuthProviderCallbackStateValidationResult =
  | {
      ok: true;
      state: string;
    }
  | {
      ok: false;
      reason: 'unverified_handoff' | 'missing_state' | 'state_mismatch';
      expectedState: string | null;
      receivedState: string | null;
    };

export function validateAuthProviderCallbackState(
  request: Request,
  state: string | null | undefined
): AuthProviderCallbackStateValidationResult {
  const expectedState = getVerifiedAuthProviderCallbackState(request);
  const receivedState = toTrimmedString(state) || null;

  if (!expectedState) {
    return {
      ok: false,
      reason: 'unverified_handoff',
      expectedState: null,
      receivedState
    };
  }

  if (!receivedState) {
    return {
      ok: false,
      reason: 'missing_state',
      expectedState,
      receivedState: null
    };
  }

  if (receivedState !== expectedState) {
    return {
      ok: false,
      reason: 'state_mismatch',
      expectedState,
      receivedState
    };
  }

  return {
    ok: true,
    state: expectedState
  };
}

type SfilesAuthUser = {
  id: number;
  role?: string | null;
};

export async function getCurrentSfilesActor(): Promise<SFilesActorContext> {
  const user = await getUser<SfilesAuthUser>();
  if (!user || !Number.isInteger(user.id) || user.id <= 0) {
    return {
      userId: null,
      isAdmin: false
    };
  }

  return {
    userId: user.id,
    isAdmin: enrichUser({
      id: user.id,
      role: typeof user.role === 'string' ? user.role : ''
    }).isAdmin()
  };
}

export async function getCurrentSfiles(): Promise<ActorBoundSfilesManager> {
  return bindSfilesActor(await getCurrentSfilesActor());
}

export type GovernanceActivityLogQuery = {
  limit?: number;
  eventCategory?: string | null;
  status?: string | null;
  requestId?: string | null;
  actorUserId?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  search?: string | null;
};

export type GovernanceActivityLogRecord = {
  id: number;
  eventType: string;
  eventCategory: string;
  action: string;
  status: string;
  actorUserId: number | null;
  actorEmail: string | null;
  actorRole: string | null;
  targetUserId: number | null;
  teamId: number | null;
  teamName: string | null;
  entityType: string | null;
  entityId: string | null;
  source: string | null;
  ipAddress: string | null;
  requestId: string | null;
  message: string | null;
  metadata: string | null;
  createdAt: Date;
};

export type GovernanceAdapter = {
  listSystemActivityLogs: (
    query?: GovernanceActivityLogQuery
  ) => Promise<GovernanceActivityLogRecord[]>;
};

let governanceAdapter: GovernanceAdapter | null = null;

export function configureGovernance(adapter: GovernanceAdapter) {
  governanceAdapter = adapter;
}

function readGovernanceAdapter() {
  if (!governanceAdapter) {
    throw new Error('Module SDK governance adapter not configured.');
  }

  return governanceAdapter;
}

export async function listSystemActivityLogs(
  query: GovernanceActivityLogQuery = {}
): Promise<GovernanceActivityLogRecord[]> {
  await requireAdmin();

  const adapter = readGovernanceAdapter();
  return adapter.listSystemActivityLogs(query);
}

export type I18nAdapter = {
  getServerTranslator: (options?: UseI18nOptions) => Promise<Translator>;
  getActionTranslator?: (options?: UseI18nOptions) => Promise<Translator>;
};

let i18nAdapter: I18nAdapter | null = null;

export function configureI18n(adapter: I18nAdapter) {
  i18nAdapter = adapter;
}

function readI18nAdapter() {
  if (!i18nAdapter) {
    throw new Error(
      'Module SDK i18n adapter not configured. Call configureI18n(...) in host bootstrap.'
    );
  }

  return i18nAdapter;
}

export async function getServerTranslator(
  options: UseI18nOptions = {}
): Promise<Translator> {
  const adapter = readI18nAdapter();
  return adapter.getServerTranslator(options);
}

export async function getActionTranslator(
  options: UseI18nOptions = {}
): Promise<Translator> {
  const adapter = readI18nAdapter();

  if (adapter.getActionTranslator) {
    return adapter.getActionTranslator(options);
  }

  return adapter.getServerTranslator(options);
}

export type NotificationAdapter = {
  createNotification: (
    input: SdkCreateNotificationInput
  ) => Promise<SdkCreateNotificationResult>;
};

let notificationAdapter: NotificationAdapter | null = null;

export function configureNotifications(adapter: NotificationAdapter) {
  notificationAdapter = adapter;
}

function readNotificationAdapter() {
  if (!notificationAdapter) {
    throw new Error(
      'Module SDK notification adapter not configured.'
    );
  }

  return notificationAdapter;
}

function normalizePositiveInteger(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizePositiveIntegerArray(values: number[]) {
  return Array.from(
    new Set(
      values.map((value) => normalizePositiveInteger(value)).filter(Boolean) as number[]
    )
  ).sort((left, right) => left - right);
}

function normalizeTeamRecipients(
  value: unknown
): SdkNotificationTeamRecipients {
  if (value === 'members' || value === 'owner' || value === 'all') {
    return value;
  }

  return 'all';
}

export async function createNotification(input: SdkCreateNotificationInput) {
  const adapter = readNotificationAdapter();
  const message = toTrimmedString(input.message);
  if (!message) {
    throw new Error('createNotification requires a non-empty message.');
  }

  const audience =
    input.audience?.type === 'users'
      ? {
          type: 'users' as const,
          userIds: normalizePositiveIntegerArray(input.audience.userIds)
        }
      : input.audience?.type === 'team'
        ? {
            type: 'team' as const,
            teamId: normalizePositiveInteger(input.audience.teamId) ?? 0,
            recipients: normalizeTeamRecipients(input.audience.recipients)
          }
      : {
          type: 'global' as const
        };

  if (audience.type === 'users' && audience.userIds.length === 0) {
    throw new Error(
      'createNotification requires at least one positive target user id.'
    );
  }

  if (audience.type === 'team' && audience.teamId <= 0) {
    throw new Error('createNotification requires a positive integer teamId.');
  }

  return adapter.createNotification({
    ...input,
    message,
    audience
  });
}

export async function notifyGlobal(
  input: Omit<SdkCreateNotificationInput, 'audience'>
) {
  return createNotification({
    ...input,
    audience: {
      type: 'global'
    }
  });
}

export async function notifyUser(
  userId: number,
  input: Omit<SdkCreateNotificationInput, 'audience'>
) {
  const normalizedUserId = normalizePositiveInteger(userId);
  if (!normalizedUserId) {
    throw new Error('notifyUser requires a positive integer userId.');
  }

  return createNotification({
    ...input,
    audience: {
      type: 'users',
      userIds: [normalizedUserId]
    }
  });
}

export async function notifyUsers(
  userIds: number[],
  input: Omit<SdkCreateNotificationInput, 'audience'>
) {
  return createNotification({
    ...input,
    audience: {
      type: 'users',
      userIds
    }
  });
}

export async function notifyTeam(
  teamId: number,
  input: Omit<SdkCreateNotificationInput, 'audience'>,
  recipients: SdkNotificationTeamRecipients = 'all'
) {
  const normalizedTeamId = normalizePositiveInteger(teamId);
  if (!normalizedTeamId) {
    throw new Error('notifyTeam requires a positive integer teamId.');
  }

  return createNotification({
    ...input,
    audience: {
      type: 'team',
      teamId: normalizedTeamId,
      recipients
    }
  });
}

export async function notifyTeamMembers(
  teamId: number,
  input: Omit<SdkCreateNotificationInput, 'audience'>
) {
  return notifyTeam(teamId, input, 'members');
}

export async function notifyTeamOwner(
  teamId: number,
  input: Omit<SdkCreateNotificationInput, 'audience'>
) {
  return notifyTeam(teamId, input, 'owner');
}

export type RevalidationAdapter = {
  revalidatePath: (path: string) => void | Promise<void>;
};

let revalidationAdapter: RevalidationAdapter | null = null;

export type BuildFormDbLookupOperator = 'unique' | 'exists';

export type ResolvedBuildFormDbCondition =
  | {
      field: string;
      operator: 'eq' | 'ne';
      value: BuildFormValue | undefined;
    }
  | {
      field: string;
      operator: 'in' | 'not_in';
      values: Array<BuildFormValue | undefined>;
    }
  | {
      field: string;
      operator: 'is_null' | 'is_not_null';
    };

export type BuildFormDbValidationRequest<
  TUser = unknown,
  TValues extends BuildFormValues = BuildFormValues
> = {
  operator: BuildFormDbLookupOperator;
  runtime?: 'server' | 'preflight';
  formId?: string | null;
  fieldName?: string | null;
  target: BuildFormDbRef;
  value: BuildFormValue | undefined;
  ignore?: BuildFormValue | undefined;
  conditions: ResolvedBuildFormDbCondition[];
  values: TValues;
  user: TUser;
};

export type BuildFormDbValidationResult = {
  exists: boolean;
};

export type BuildFormDbValidationAdapter = {
  lookup: <
    TUser = unknown,
    TValues extends BuildFormValues = BuildFormValues
  >(
    request: BuildFormDbValidationRequest<TUser, TValues>
  ) => Promise<BuildFormDbValidationResult | null>;
};

let buildFormDbValidationAdapter: BuildFormDbValidationAdapter | null = null;

export function configureRevalidation(adapter: RevalidationAdapter) {
  revalidationAdapter = adapter;
}

export function configureBuildFormDbValidation(
  adapter: BuildFormDbValidationAdapter
) {
  buildFormDbValidationAdapter = adapter;
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
  values: (field: string) => FormDataEntryValue[];
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

type ControllerActionArgs = [FormData] | [unknown, FormData];

function normalizeString(value: FormDataEntryValue | null) {
  return toTrimmedString(value);
}

function resolveControllerActionFormData(args: ControllerActionArgs) {
  if (args[0] instanceof FormData) {
    return args[0];
  }

  if (args[1] instanceof FormData) {
    return args[1];
  }

  throw new Error('Server action controller expected FormData payload.');
}

function isBuildFormFieldRef(value: unknown): value is BuildFormFieldRef {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (value as { kind?: unknown }).kind === 'field_ref';
}

function resolveBuildFormDbConditionValue(
  value: BuildFormValue | BuildFormFieldRef,
  values: BuildFormValues
) {
  if (isBuildFormFieldRef(value)) {
    return values[value.field];
  }

  return value;
}

function resolveBuildFormDbConditions(
  conditions: BuildFormDbCondition[] | undefined,
  values: BuildFormValues
): ResolvedBuildFormDbCondition[] {
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
        values: condition.values.map((entry) =>
          resolveBuildFormDbConditionValue(entry, values)
        )
      };
    }

    return {
      field: condition.field,
      operator: condition.operator
    };
  });
}

export function createFormReader(formData: FormData): FormReader {
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
    async function controlledAction(formData: FormData): Promise<void>;
    async function controlledAction(
      previousState: unknown,
      formData: FormData
    ): Promise<void>;
    async function controlledAction(...args: ControllerActionArgs) {
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

function createBuildFormValidationResultFromVineError<
  TValues extends BuildFormValues = BuildFormValues
>(error: ValidationError, values: TValues) {
  const fieldErrors: Record<string, string[]> = {};
  let formError: string | null = null;

  const messages = Array.isArray(error.messages) ? error.messages : [];
  for (const entry of messages) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const record = entry as Record<string, unknown>;
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

function hasBuildFormRequiredValidation(
  rules: BuildFormValidationRule[]
) {
  return rules.some(
    (rule) => rule.type === 'required' || rule.type === 'accepted'
  );
}

function normalizeBuildFormServerFieldValue({
  field,
  value,
  rules
}: {
  field: BuildFormFieldDefinition;
  value: BuildFormValues[string];
  rules: BuildFormValidationRule[];
}) {
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

function normalizeBuildFormValuesForServerValidation(
  definition: BuildFormDefinition,
  values: BuildFormValues
) {
  const normalizedValues: BuildFormValues = {};

  for (const field of listBuildFormFields(definition)) {
    const rules = getBuildFormValidationRulesForFieldRuntime(
      definition,
      field.name,
      'server',
      values
    );

    normalizedValues[field.name] = normalizeBuildFormServerFieldValue({
      field,
      value: values[field.name],
      rules
    });
  }

  return normalizedValues;
}

function createBuildFormVineFieldSchema(
  field: BuildFormFieldDefinition,
  rules: BuildFormValidationRule[]
) {
  if (field.kind === 'checkbox') {
    const mustAccept = rules.some(
      (rule) => rule.type === 'accepted' || rule.type === 'required'
    );
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

function createBuildFormServerValidator(
  definition: BuildFormDefinition,
  values: BuildFormValues
) {
  const properties: Record<string, ReturnType<typeof createBuildFormVineFieldSchema>> =
    {};

  for (const field of listBuildFormFields(definition)) {
    properties[field.name] = createBuildFormVineFieldSchema(
      field,
      getBuildFormValidationRulesForFieldRuntime(
        definition,
        field.name,
        'server',
        values
      )
    );
  }

  return vine.create(properties);
}

function isBuildFormDbRule(
  rule: BuildFormValidationRule
): rule is Extract<BuildFormValidationRule, { type: 'unique' | 'exists' }> {
  return rule.type === 'unique' || rule.type === 'exists';
}

function isMissingBuildFormValue(value: BuildFormValue | undefined) {
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

function resolveBuildFormDbRuleMessage({
  field,
  rule,
  fallback
}: {
  field: BuildFormFieldDefinition;
  rule: Extract<BuildFormValidationRule, { type: 'unique' | 'exists' }>;
  fallback?: string;
}) {
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

export async function validateBuildFormDbRules<
  TUser = unknown,
  TValues extends BuildFormValues = BuildFormValues
>({
  definition,
  values,
  user,
  runtime,
  field
}: {
  definition: BuildFormDefinition;
  values: TValues;
  user: TUser;
  runtime: 'server' | 'preflight';
  field?: string;
}) {
  const issues: BuildFormValidationIssue[] = [];
  const fields = field
    ? [getBuildFormFieldByName(definition, field)].filter(Boolean)
    : listBuildFormFields(definition);

  for (const currentField of fields) {
    if (!currentField) {
      continue;
    }

    const rules = getBuildFormValidationRulesForFieldRuntime(
      definition,
      currentField.name,
      runtime,
      values
    );

    for (const rule of rules) {
      if (!isBuildFormDbRule(rule)) {
        continue;
      }

      const value = values[currentField.name];
      if (isMissingBuildFormValue(value)) {
        continue;
      }

      const resolvedIgnore =
        rule.type === 'unique' && rule.ignore !== undefined
          ? resolveBuildFormDbConditionValue(rule.ignore, values)
          : undefined;

      const lookup = buildFormDbValidationAdapter
        ? await buildFormDbValidationAdapter.lookup({
            operator: rule.type,
            runtime,
            formId:
              typeof definition.id === 'string' && definition.id.trim()
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
        issues.push(
          createBuildFormValidationIssue({
            field: currentField.name,
            code: 'db_validation_unavailable',
            message: 'Validation service is unavailable.',
            rule: rule.type,
            source: runtime
          })
        );
        continue;
      }

      const invalid =
        rule.type === 'unique'
          ? lookup.exists
          : !lookup.exists;

      if (!invalid) {
        continue;
      }

      issues.push(
        createBuildFormValidationIssue({
          field: currentField.name,
          code: rule.type,
          message: resolveBuildFormDbRuleMessage({
            field: currentField,
            rule
          }),
          rule: rule.type,
          source: runtime
        })
      );
    }
  }

  return createBuildFormValidationResult({
    values,
    issues
  });
}

export type BuildFormServerValidationContext<
  TUser,
  TValues extends BuildFormValues = BuildFormValues
> = ControllerContext<TUser> & {
  definition: BuildFormDefinition;
  values: TValues;
};

export type BuildFormServerValidationHandler<
  TUser,
  TValues extends BuildFormValues = BuildFormValues
> = (
  context: BuildFormServerValidationContext<TUser, TValues>
) =>
  | Promise<BuildFormValidationResult<TValues>>
  | BuildFormValidationResult<TValues>;

export type ValidatedControllerAction<
  TUser,
  TValues extends BuildFormValues = BuildFormValues
> = (
  context: BuildFormServerValidationContext<TUser, TValues>
) =>
  | Promise<void | boolean | BuildFormValidationResult<TValues>>
  | void
  | boolean
  | BuildFormValidationResult<TValues>;

type ValidatedActionOptions<
  TUser,
  TValues extends BuildFormValues = BuildFormValues
> = ActionOptions & {
  validator?: BuildFormServerValidationHandler<TUser, TValues>;
  failureFormError?: string;
};

export async function validateBuildFormWithHandler<
  TUser,
  TValues extends BuildFormValues = BuildFormValues
>({
  definition,
  formData,
  user,
  validator
}: {
  definition: BuildFormDefinition;
  formData: FormData;
  user: TUser;
  validator: BuildFormServerValidationHandler<TUser, TValues>;
}) {
  const form = createFormReader(formData);
  const values = normalizeBuildFormValuesFromFormData(
    definition,
    formData
  ) as TValues;

  return validator({
    user,
    formData,
    form,
    definition,
    values
  });
}

export async function validateBuildFormOnServer<
  TUser,
  TValues extends BuildFormValues = BuildFormValues
>({
  definition,
  formData,
  user,
  validator
}: {
  definition: BuildFormDefinition;
  formData: FormData;
  user: TUser;
  validator?: BuildFormServerValidationHandler<TUser, TValues>;
}) {
  const form = createFormReader(formData);
  const rawValues = normalizeBuildFormValuesFromFormData(
    definition,
    formData
  ) as TValues;
  let values = normalizeBuildFormValuesForServerValidation(
    definition,
    rawValues
  ) as TValues;

  try {
    const compiledValidator = createBuildFormServerValidator(definition, rawValues);
    values = (await compiledValidator.validate(values)) as TValues;
  } catch (error) {
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
    return dbValidation as BuildFormValidationResult<TValues>;
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

export function createValidatedServerActionController<TUser>({
  requireUser
}: ControllerOptions<TUser>) {
  return function withValidatedController<
    TDefinition extends BuildFormDefinition,
    TValues extends BuildFormValues = BuildFormValues
  >(
    definition: TDefinition | ValidatedBuildFormDefinition<TDefinition>,
    handler: ValidatedControllerAction<TUser, TValues>,
    options?: ValidatedActionOptions<TUser, TValues>
  ) {
    async function controlledValidatedAction(
      formData: FormData
    ): Promise<BuildFormValidationResult<TValues>>;
    async function controlledValidatedAction(
      previousState: unknown,
      formData: FormData
    ): Promise<BuildFormValidationResult<TValues>>;
    async function controlledValidatedAction(...args: ControllerActionArgs) {
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
        values: validation.values as TValues
      });

      if (result === false) {
        return createBuildFormValidationResult({
          values: validation.values as TValues,
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
      return createValidBuildFormResult(validation.values as TValues);
    }

    return controlledValidatedAction;
  };
}

export function createValidBuildFormResult<
  TValues extends BuildFormValues = BuildFormValues
>(values: TValues) {
  return createBuildFormValidationResult({
    values
  });
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

// ─── Subscription Features / Quota Controller ─────────────────────────────────

export {
  configureSubscriptionFeatures,
  getPlanFeatureValue,
  getPlanFeatureNumber,
  checkFeature,
  getQuotaStatus,
  consumeQuota,
  QuotaExceededError,
} from './subscription-features.js';

export type {
  SubscriptionFeaturesAdapter,
  SubscriptionFeatureValueType,
  QuotaContext,
  PlanFeatureValueResult,
  FeatureCheckResult,
  QuotaStatus,
  ConsumeOptions,
  ConsumeResult,
} from './subscription-features.js';

export type {
  ActorBoundSfilesManager,
  SFileReadResult,
  SFilesActorContext
} from './sfiles.js';

// ─── RichUser / role checks / UserContext ─────────────────────────────────────

export {
  configureUserRoles,
  configureUserContext,
  enrichUser,
} from './user-roles.js';

export type {
  UserRolesConfig,
  UserContext,
  RichUser,
  RichUserMethods,
} from './user-roles.js';
