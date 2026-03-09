import type {
  BuildFormDefinition,
  BuildFormFieldDefinition,
  BuildFormValue,
  BuildFormValues
} from './forms.js';
import {
  applyBuildFormFieldMask,
  isBuildFormTruthyValue,
  resolveBuildFormValue
} from './forms.js';
import {
  DEFAULT_EMAIL_REGEX,
  resolveBuildFormValidationMessage,
  type BuildFormValidationMessageInput,
  type BuildFormValidationMessageResolver
} from './validation-messages.js';

export type BuildFormValidationRuntime = 'local' | 'preflight' | 'server';
export type BuildFormValidationTrigger = 'change' | 'blur' | 'submit';

export type BuildFormFieldRef = {
  kind: 'field_ref';
  field: string;
};

export type BuildFormDbRef = {
  kind: 'db_ref';
  target: string;
};

export type BuildFormValidationCondition =
  | {
      kind: 'field_truthy';
      field: string;
    }
  | {
      kind: 'field_falsy';
      field: string;
    }
  | {
      kind: 'field_equals';
      field: string;
      value: BuildFormValue;
    }
  | {
      kind: 'field_not_equals';
      field: string;
      value: BuildFormValue;
    }
  | {
      kind: 'field_in';
      field: string;
      values: BuildFormValue[];
    }
  | {
      kind: 'field_not_in';
      field: string;
      values: BuildFormValue[];
    };

export type BuildFormDbCondition =
  | {
      field: string;
      operator: 'eq' | 'ne';
      value: BuildFormValue | BuildFormFieldRef;
    }
  | {
      field: string;
      operator: 'in' | 'not_in';
      values: Array<BuildFormValue | BuildFormFieldRef>;
    }
  | {
      field: string;
      operator: 'is_null' | 'is_not_null';
    };

type BaseBuildFormValidationRule = {
  type: string;
  message?: string;
  runsOn?: BuildFormValidationRuntime[];
  when?: BuildFormValidationCondition[];
};

export type BuildFormRequiredRule = BaseBuildFormValidationRule & {
  type: 'required';
};

export type BuildFormEmailRule = BaseBuildFormValidationRule & {
  type: 'email';
};

export type BuildFormUrlRule = BaseBuildFormValidationRule & {
  type: 'url';
};

export type BuildFormMinLengthRule = BaseBuildFormValidationRule & {
  type: 'min_length';
  value: number;
};

export type BuildFormMaxLengthRule = BaseBuildFormValidationRule & {
  type: 'max_length';
  value: number;
};

export type BuildFormMinRule = BaseBuildFormValidationRule & {
  type: 'min';
  value: number;
};

export type BuildFormMaxRule = BaseBuildFormValidationRule & {
  type: 'max';
  value: number;
};

export type BuildFormRegexRule = BaseBuildFormValidationRule & {
  type: 'regex';
  pattern: string;
  flags?: string;
};

export type BuildFormIntegerRule = BaseBuildFormValidationRule & {
  type: 'integer';
};

export type BuildFormAcceptedRule = BaseBuildFormValidationRule & {
  type: 'accepted';
};

export type BuildFormConfirmedRule = BaseBuildFormValidationRule & {
  type: 'confirmed';
  field: string;
};

export type BuildFormUniqueRule = BaseBuildFormValidationRule & {
  type: 'unique';
  target: BuildFormDbRef;
  ignore?: BuildFormValue | BuildFormFieldRef;
  where?: BuildFormDbCondition[];
};

export type BuildFormExistsRule = BaseBuildFormValidationRule & {
  type: 'exists';
  target: BuildFormDbRef;
  where?: BuildFormDbCondition[];
};

export type BuildFormValidationRule =
  | BuildFormRequiredRule
  | BuildFormEmailRule
  | BuildFormUrlRule
  | BuildFormMinLengthRule
  | BuildFormMaxLengthRule
  | BuildFormMinRule
  | BuildFormMaxRule
  | BuildFormRegexRule
  | BuildFormIntegerRule
  | BuildFormAcceptedRule
  | BuildFormConfirmedRule
  | BuildFormUniqueRule
  | BuildFormExistsRule;

export type BuildFormValidationDefinition = {
  fields?: Record<string, BuildFormValidationRule[]>;
  client?: {
    validateOn?: BuildFormValidationTrigger[];
  };
  preflight?: {
    enabled?: boolean;
    validateOn?: BuildFormValidationTrigger[];
    fieldDebounceMs?: number;
    formId?: string;
  };
  server?: {
    validatorId?: string;
  };
};

export type ValidatedBuildFormDefinition<
  TDefinition extends BuildFormDefinition = BuildFormDefinition
> = TDefinition & {
  validation: BuildFormValidationDefinition;
};

export type BuildFormValidationIssue = {
  field: string | null;
  code: string;
  message: string;
  rule: BuildFormValidationRule['type'] | string;
  source: BuildFormValidationRuntime;
};

export type BuildFormValidationResult<
  TValues extends BuildFormValues = BuildFormValues
> = {
  valid: boolean;
  values: TValues;
  fieldErrors: Record<string, string[]>;
  formError: string | null;
  issues: BuildFormValidationIssue[];
};

type BuildFormValidationRuleOptions = Omit<
  BaseBuildFormValidationRule,
  'type'
>;

type BuildFormRegexRuleOptions = BuildFormValidationRuleOptions & {
  flags?: string;
};

type BuildFormDbRuleOptions = BuildFormValidationRuleOptions & {
  where?: BuildFormDbCondition[];
};

type BuildFormUniqueRuleOptions = BuildFormDbRuleOptions & {
  ignore?: BuildFormValue | BuildFormFieldRef;
};

type BuildFormValidationInput =
  | FormData
  | BuildFormValues
  | Record<string, unknown>;

export type BuildFormBlurValidationPresetOptions = {
  validateOn?: BuildFormValidationTrigger[];
  preflight?:
    | boolean
    | Omit<
        NonNullable<BuildFormValidationDefinition['preflight']>,
        'enabled'
      >;
};

function normalizeString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeComparableValue(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
}

function valuesEqual(left: unknown, right: unknown) {
  return normalizeComparableValue(left) === normalizeComparableValue(right);
}

function isMissingValue(value: BuildFormValue | undefined) {
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

function toArray<TValue>(value: TValue | TValue[]) {
  return Array.isArray(value) ? value : [value];
}

function normalizeValidationPresetTriggers(
  value: BuildFormValidationTrigger[] | undefined,
  fallback: BuildFormValidationTrigger[] = ['blur']
) {
  const normalized = Array.isArray(value)
    ? value.filter(
        (entry): entry is BuildFormValidationTrigger =>
          entry === 'blur' || entry === 'change' || entry === 'submit'
      )
    : [];

  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback;
}

function isRuntimeEnabled(
  rule: BuildFormValidationRule,
  runtime: BuildFormValidationRuntime
) {
  if (rule.type === 'unique' || rule.type === 'exists') {
    return runtime !== 'local';
  }

  if (!rule.runsOn?.length) {
    return true;
  }

  return rule.runsOn.includes(runtime);
}

function matchesConditions(
  conditions: BuildFormValidationCondition[] | undefined,
  values: BuildFormValues
) {
  if (!conditions?.length) {
    return true;
  }

  return conditions.every((condition) => {
    const currentValue = values[condition.field];

    switch (condition.kind) {
      case 'field_truthy':
        return isBuildFormTruthyValue(currentValue);
      case 'field_falsy':
        return !isBuildFormTruthyValue(currentValue);
      case 'field_equals':
        return valuesEqual(currentValue, condition.value);
      case 'field_not_equals':
        return !valuesEqual(currentValue, condition.value);
      case 'field_in':
        return condition.values.some((value) => valuesEqual(currentValue, value));
      case 'field_not_in':
        return !condition.values.some((value) => valuesEqual(currentValue, value));
      default:
        return true;
    }
  });
}

function resolveRuleMessage(
  rule: BuildFormValidationRule,
  field: BuildFormFieldDefinition
) {
  if (rule.message) {
    return rule.message;
  }

  const label = field.label || field.name;

  switch (rule.type) {
    case 'required':
      return `${label} is required.`;
    case 'email':
      return `${label} must be a valid email address.`;
    case 'url':
      return `${label} must be a valid URL.`;
    case 'min_length':
      return `${label} must be at least ${rule.value} characters.`;
    case 'max_length':
      return `${label} must be at most ${rule.value} characters.`;
    case 'min':
      return `${label} must be at least ${rule.value}.`;
    case 'max':
      return `${label} must be at most ${rule.value}.`;
    case 'regex':
      return `${label} has an invalid format.`;
    case 'integer':
      return `${label} must be an integer.`;
    case 'accepted':
      return `${label} must be accepted.`;
    case 'confirmed':
      return `${label} confirmation does not match.`;
    case 'unique':
      return `${label} must be unique.`;
    case 'exists':
      return `${label} references an invalid record.`;
    default:
      return `${label} is invalid.`;
  }
}

function shouldSkipValueRule(value: BuildFormValue | undefined) {
  return value === undefined || value === null || value === '';
}

function readLastFormDataValue(formData: FormData, fieldName: string) {
  const values = formData.getAll(fieldName);
  if (!values.length) {
    return undefined;
  }

  return values[values.length - 1] ?? undefined;
}

function readInputValue(source: BuildFormValidationInput, fieldName: string) {
  if (source instanceof FormData) {
    return readLastFormDataValue(source, fieldName);
  }

  return (source as Record<string, unknown>)[fieldName];
}

function normalizeBuildFormFieldValue(
  field: BuildFormFieldDefinition,
  value: unknown
): BuildFormValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (field.kind === 'checkbox') {
    return isBuildFormTruthyValue(
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? value
        : null
    );
  }

  if (field.kind === 'number') {
    if (typeof value === 'number') {
      return Number.isNaN(value) ? null : value;
    }

    const normalized = normalizeString(value);
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? normalized : parsed;
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  const normalized = normalizeString(value);
  if (!normalized) {
    return '';
  }

  if (field.kind === 'repeater' || !('mask' in field) || !field.mask) {
    return normalized;
  }

  return applyBuildFormFieldMask(normalized, field.mask);
}

export function defineValidatedBuildForm<
  TDefinition extends BuildFormDefinition
>(definition: TDefinition & { validation: BuildFormValidationDefinition }) {
  return definition;
}

export function withBuildFormValidation<
  TDefinition extends BuildFormDefinition
>(definition: TDefinition, validation: BuildFormValidationDefinition) {
  const currentValidation =
    (definition as TDefinition & { validation?: BuildFormValidationDefinition })
      .validation ?? {};

  return {
    ...definition,
    validation: {
      ...currentValidation,
      ...validation,
      fields: {
        ...(currentValidation.fields ?? {}),
        ...(validation.fields ?? {})
      }
    }
  } as TDefinition & {
    validation: BuildFormValidationDefinition;
  };
}

export function fieldRef(field: string): BuildFormFieldRef {
  return {
    kind: 'field_ref',
    field: normalizeString(field)
  };
}

export function dbRef(target: string): BuildFormDbRef {
  return {
    kind: 'db_ref',
    target: normalizeString(target)
  };
}

export const validationCondition = {
  truthy(field: string): BuildFormValidationCondition {
    return {
      kind: 'field_truthy',
      field: normalizeString(field)
    };
  },
  falsy(field: string): BuildFormValidationCondition {
    return {
      kind: 'field_falsy',
      field: normalizeString(field)
    };
  },
  equals(field: string, value: BuildFormValue): BuildFormValidationCondition {
    return {
      kind: 'field_equals',
      field: normalizeString(field),
      value
    };
  },
  notEquals(
    field: string,
    value: BuildFormValue
  ): BuildFormValidationCondition {
    return {
      kind: 'field_not_equals',
      field: normalizeString(field),
      value
    };
  },
  in(field: string, values: BuildFormValue[]): BuildFormValidationCondition {
    return {
      kind: 'field_in',
      field: normalizeString(field),
      values
    };
  },
  notIn(field: string, values: BuildFormValue[]): BuildFormValidationCondition {
    return {
      kind: 'field_not_in',
      field: normalizeString(field),
      values
    };
  }
};

export const buildFormRule = {
  required(options: BuildFormValidationRuleOptions = {}): BuildFormRequiredRule {
    return {
      type: 'required',
      ...options
    };
  },
  email(options: BuildFormValidationRuleOptions = {}): BuildFormEmailRule {
    return {
      type: 'email',
      ...options
    };
  },
  url(options: BuildFormValidationRuleOptions = {}): BuildFormUrlRule {
    return {
      type: 'url',
      ...options
    };
  },
  minLength(
    value: number,
    options: BuildFormValidationRuleOptions = {}
  ): BuildFormMinLengthRule {
    return {
      type: 'min_length',
      value,
      ...options
    };
  },
  maxLength(
    value: number,
    options: BuildFormValidationRuleOptions = {}
  ): BuildFormMaxLengthRule {
    return {
      type: 'max_length',
      value,
      ...options
    };
  },
  min(value: number, options: BuildFormValidationRuleOptions = {}): BuildFormMinRule {
    return {
      type: 'min',
      value,
      ...options
    };
  },
  max(value: number, options: BuildFormValidationRuleOptions = {}): BuildFormMaxRule {
    return {
      type: 'max',
      value,
      ...options
    };
  },
  regex(
    pattern: string,
    options: BuildFormRegexRuleOptions = {}
  ): BuildFormRegexRule {
    return {
      type: 'regex',
      pattern,
      ...options
    };
  },
  integer(options: BuildFormValidationRuleOptions = {}): BuildFormIntegerRule {
    return {
      type: 'integer',
      ...options
    };
  },
  accepted(
    options: BuildFormValidationRuleOptions = {}
  ): BuildFormAcceptedRule {
    return {
      type: 'accepted',
      ...options
    };
  },
  confirmed(
    field: string,
    options: BuildFormValidationRuleOptions = {}
  ): BuildFormConfirmedRule {
    return {
      type: 'confirmed',
      field: normalizeString(field),
      ...options
    };
  },
  unique(
    target: BuildFormDbRef,
    options: BuildFormUniqueRuleOptions = {}
  ): BuildFormUniqueRule {
    return {
      type: 'unique',
      target,
      ...options
    };
  },
  exists(
    target: BuildFormDbRef,
    options: BuildFormDbRuleOptions = {}
  ): BuildFormExistsRule {
    return {
      type: 'exists',
      target,
      ...options
    };
  }
};

export const buildFormValidationPreset = {
  blur(
    fields: NonNullable<BuildFormValidationDefinition['fields']>,
    options: BuildFormBlurValidationPresetOptions = {}
  ): BuildFormValidationDefinition {
    const validateOn = normalizeValidationPresetTriggers(options.validateOn);
    const preflight = options.preflight;

    return {
      client: {
        validateOn
      },
      preflight: preflight
        ? {
            enabled: true,
            validateOn:
              typeof preflight === 'object'
                ? normalizeValidationPresetTriggers(
                    preflight.validateOn,
                    validateOn
                  )
                : validateOn,
            fieldDebounceMs:
              typeof preflight === 'object'
                ? preflight.fieldDebounceMs ?? 250
                : 250,
            formId: typeof preflight === 'object' ? preflight.formId : undefined
          }
        : undefined,
      fields
    };
  }
};

export function listBuildFormFields(definition: BuildFormDefinition) {
  if (Array.isArray(definition.sections) && definition.sections.length > 0) {
    return definition.sections.flatMap((section) => section.fields);
  }

  return Array.isArray(definition.fields) ? definition.fields : [];
}

export function getBuildFormFieldByName(
  definition: BuildFormDefinition,
  fieldName: string
) {
  const normalizedFieldName = normalizeString(fieldName);
  if (!normalizedFieldName) {
    return null;
  }

  return (
    listBuildFormFields(definition).find(
      (field) => field.name === normalizedFieldName
    ) ?? null
  );
}

export function getBuildFormValidation(
  definition: BuildFormDefinition
): BuildFormValidationDefinition | null {
  const validation = (
    definition as BuildFormDefinition & {
      validation?: BuildFormValidationDefinition;
    }
  ).validation;

  return validation ?? null;
}

export function getBuildFormValidationRulesForField(
  definition: BuildFormDefinition,
  fieldName: string
) {
  const validation = getBuildFormValidation(definition);
  return validation?.fields?.[normalizeString(fieldName)] ?? [];
}

export function normalizeBuildFormValuesFromInput(
  definition: BuildFormDefinition,
  input: BuildFormValidationInput
) {
  const normalizedValues: BuildFormValues = {};

  for (const field of listBuildFormFields(definition)) {
    if (field.kind === 'repeater') {
      continue;
    }

    const rawValue = readInputValue(input, field.name);
    const fallbackValue = resolveBuildFormValue({
      definition,
      fieldName: field.name,
      fallback: field.defaultValue
    });

    normalizedValues[field.name] = normalizeBuildFormFieldValue(
      field,
      rawValue === undefined ? fallbackValue : rawValue
    );
  }

  return normalizedValues;
}

export function normalizeBuildFormValuesFromFormData(
  definition: BuildFormDefinition,
  formData: FormData
) {
  return normalizeBuildFormValuesFromInput(definition, formData);
}

export function createBuildFormValidationResult<
  TValues extends BuildFormValues = BuildFormValues
>({
  values,
  issues = [],
  formError = null
}: {
  values: TValues;
  issues?: BuildFormValidationIssue[];
  formError?: string | null;
}): BuildFormValidationResult<TValues> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of issues) {
    if (!issue.field) {
      continue;
    }

    const field = normalizeString(issue.field);
    if (!field) {
      continue;
    }

    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }

    fieldErrors[field].push(issue.message);
  }

  return {
    valid: issues.length === 0 && !formError,
    values,
    fieldErrors,
    formError,
    issues
  };
}

export function createBuildFormValidationIssue({
  field = null,
  code,
  message,
  rule,
  source
}: {
  field?: string | null;
  code: string;
  message: string;
  rule: BuildFormValidationRule['type'] | string;
  source: BuildFormValidationRuntime;
}): BuildFormValidationIssue {
  return {
    field: field ? normalizeString(field) : null,
    code: normalizeString(code) || rule,
    message: normalizeString(message),
    rule,
    source
  };
}

export function createBuildFormValidationResultFromFieldErrors<
  TValues extends BuildFormValues = BuildFormValues
>({
  values,
  fieldErrors,
  formError = null,
  source,
  code = 'invalid',
  rule = 'custom'
}: {
  values: TValues;
  fieldErrors?: Record<string, string[]>;
  formError?: string | null;
  source: BuildFormValidationRuntime;
  code?: string;
  rule?: BuildFormValidationRule['type'] | string;
}) {
  const issues: BuildFormValidationIssue[] = [];

  for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
    const normalizedField = normalizeString(field);
    if (!normalizedField || !Array.isArray(messages)) {
      continue;
    }

    for (const message of messages) {
      const normalizedMessage = normalizeString(message);
      if (!normalizedMessage) {
        continue;
      }

      issues.push(
        createBuildFormValidationIssue({
          field: normalizedField,
          code,
          message: normalizedMessage,
          rule,
          source
        })
      );
    }
  }

  return createBuildFormValidationResult({
    values,
    issues,
    formError
  });
}

export function createBuildFormValidationResultFromFieldMessages<
  TValues extends BuildFormValues = BuildFormValues
>({
  values,
  fieldMessages,
  formMessage = null,
  resolveMessage,
  source,
  rule = 'custom'
}: {
  values: TValues;
  fieldMessages?: Record<
    string,
    BuildFormValidationMessageInput | BuildFormValidationMessageInput[]
  >;
  formMessage?: BuildFormValidationMessageInput | null;
  resolveMessage?: BuildFormValidationMessageResolver;
  source: BuildFormValidationRuntime;
  rule?: BuildFormValidationRule['type'] | string;
}) {
  const issues: BuildFormValidationIssue[] = [];

  for (const [field, rawMessages] of Object.entries(fieldMessages ?? {})) {
    const normalizedField = normalizeString(field);
    if (!normalizedField) {
      continue;
    }

    const messages = Array.isArray(rawMessages) ? rawMessages : [rawMessages];
    for (const message of messages) {
      const normalizedMessage = resolveBuildFormValidationMessage(
        message,
        resolveMessage
      );
      if (!normalizedMessage) {
        continue;
      }

      const code =
        typeof message === 'string'
          ? 'invalid'
          : normalizeString(message.key) || 'invalid';

      issues.push(
        createBuildFormValidationIssue({
          field: normalizedField,
          code,
          message: normalizedMessage,
          rule,
          source
        })
      );
    }
  }

  const resolvedFormError =
    formMessage === null
      ? null
      : resolveBuildFormValidationMessage(formMessage, resolveMessage);

  return createBuildFormValidationResult({
    values,
    issues,
    formError: resolvedFormError || null
  });
}

export function isBuildFormValidationRuntimeEnabled(
  rule: BuildFormValidationRule,
  runtime: BuildFormValidationRuntime
) {
  return isRuntimeEnabled(rule, runtime);
}

export function matchesBuildFormValidationConditions(
  conditions: BuildFormValidationCondition[] | undefined,
  values: BuildFormValues
) {
  return matchesConditions(conditions, values);
}

export function getBuildFormValidationRulesForFieldRuntime(
  definition: BuildFormDefinition,
  fieldName: string,
  runtime: BuildFormValidationRuntime,
  values: BuildFormValues
) {
  return getBuildFormValidationRulesForField(definition, fieldName).filter(
    (rule) =>
      isBuildFormValidationRuntimeEnabled(rule, runtime) &&
      matchesBuildFormValidationConditions(rule.when, values)
  );
}

export function validateBuildFormLocally(
  definition: BuildFormDefinition,
  input: BuildFormValidationInput,
  options: {
    field?: string;
    runtime?: 'local' | 'preflight';
  } = {}
) {
  const normalizedValues = normalizeBuildFormValuesFromInput(definition, input);
  const validation = getBuildFormValidation(definition);
  if (!validation?.fields) {
    return createBuildFormValidationResult({
      values: normalizedValues
    });
  }

  const selectedField = normalizeString(options.field);
  const runtime = options.runtime ?? 'local';
  const fieldNames = selectedField
    ? [selectedField]
    : Object.keys(validation.fields);

  const issues: BuildFormValidationIssue[] = [];

  for (const fieldName of fieldNames) {
    const field = getBuildFormFieldByName(definition, fieldName);
    if (!field) {
      continue;
    }

    const value = normalizedValues[field.name];
    const rules = getBuildFormValidationRulesForField(definition, field.name);

    for (const rule of rules) {
      if (!isRuntimeEnabled(rule, runtime)) {
        continue;
      }

      if (!matchesConditions(rule.when, normalizedValues)) {
        continue;
      }

      let isInvalid = false;

      switch (rule.type) {
        case 'required':
          isInvalid = isMissingValue(value);
          break;
        case 'accepted':
          isInvalid = !isBuildFormTruthyValue(value);
          break;
        case 'email':
          isInvalid =
            !shouldSkipValueRule(value) &&
            (typeof value !== 'string' || !DEFAULT_EMAIL_REGEX.test(value));
          break;
        case 'url':
          isInvalid = false;
          if (!shouldSkipValueRule(value)) {
            try {
              // URL constructor is enough for the local runtime baseline.
              new URL(String(value));
            } catch {
              isInvalid = true;
            }
          }
          break;
        case 'min_length':
          isInvalid =
            !shouldSkipValueRule(value) &&
            String(value).length < rule.value;
          break;
        case 'max_length':
          isInvalid =
            !shouldSkipValueRule(value) &&
            String(value).length > rule.value;
          break;
        case 'min':
          isInvalid =
            !shouldSkipValueRule(value) &&
            (typeof value !== 'number' || value < rule.value);
          break;
        case 'max':
          isInvalid =
            !shouldSkipValueRule(value) &&
            (typeof value !== 'number' || value > rule.value);
          break;
        case 'regex':
          isInvalid =
            !shouldSkipValueRule(value) &&
            !new RegExp(rule.pattern, rule.flags).test(String(value));
          break;
        case 'integer':
          isInvalid =
            !shouldSkipValueRule(value) &&
            (typeof value !== 'number' || !Number.isInteger(value));
          break;
        case 'confirmed':
          isInvalid =
            !shouldSkipValueRule(value) &&
            !valuesEqual(value, normalizedValues[rule.field]);
          break;
        case 'unique':
        case 'exists':
          isInvalid = false;
          break;
        default:
          isInvalid = false;
          break;
      }

      if (!isInvalid) {
        continue;
      }

      issues.push(
        createBuildFormValidationIssue({
          field: field.name,
          code: rule.type,
          message: resolveRuleMessage(rule, field),
          rule: rule.type,
          source: runtime
        })
      );
    }
  }

  return createBuildFormValidationResult({
    values: normalizedValues,
    issues
  });
}

export function isBuildFormValidationResultValid(
  result: Pick<BuildFormValidationResult, 'valid'>
) {
  return result.valid;
}

export function shouldRunBuildFormPreflight(definition: BuildFormDefinition) {
  const validation = getBuildFormValidation(definition);
  return validation?.preflight?.enabled === true;
}

export function resolveBuildFormValidationTriggers(
  definition: BuildFormDefinition,
  runtime: 'client' | 'preflight'
) {
  const validation = getBuildFormValidation(definition);
  const source =
    runtime === 'client'
      ? validation?.client?.validateOn
      : validation?.preflight?.validateOn;

  if (!source?.length) {
    return ['submit'] as BuildFormValidationTrigger[];
  }

  return source;
}

export function resolveBuildFormValidationDebounceMs(
  definition: BuildFormDefinition
) {
  const validation = getBuildFormValidation(definition);
  return validation?.preflight?.fieldDebounceMs ?? 300;
}
