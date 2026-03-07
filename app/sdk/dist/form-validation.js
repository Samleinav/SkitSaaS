import { applyBuildFormFieldMask, isBuildFormTruthyValue, resolveBuildFormValue } from './forms.js';
import { DEFAULT_EMAIL_REGEX, resolveBuildFormValidationMessage } from './validation-messages.js';
function normalizeString(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim();
}
function normalizeComparableValue(value) {
    if (typeof value === 'string') {
        return value.trim();
    }
    return value;
}
function valuesEqual(left, right) {
    return normalizeComparableValue(left) === normalizeComparableValue(right);
}
function isMissingValue(value) {
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
function toArray(value) {
    return Array.isArray(value) ? value : [value];
}
function normalizeValidationPresetTriggers(value, fallback = ['blur']) {
    const normalized = Array.isArray(value)
        ? value.filter((entry) => entry === 'blur' || entry === 'change' || entry === 'submit')
        : [];
    return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback;
}
function isRuntimeEnabled(rule, runtime) {
    if (rule.type === 'unique' || rule.type === 'exists') {
        return runtime !== 'local';
    }
    if (!rule.runsOn?.length) {
        return true;
    }
    return rule.runsOn.includes(runtime);
}
function matchesConditions(conditions, values) {
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
function resolveRuleMessage(rule, field) {
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
function shouldSkipValueRule(value) {
    return value === undefined || value === null || value === '';
}
function readLastFormDataValue(formData, fieldName) {
    const values = formData.getAll(fieldName);
    if (!values.length) {
        return undefined;
    }
    return values[values.length - 1] ?? undefined;
}
function readInputValue(source, fieldName) {
    if (source instanceof FormData) {
        return readLastFormDataValue(source, fieldName);
    }
    return source[fieldName];
}
function normalizeBuildFormFieldValue(field, value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    if (field.kind === 'checkbox') {
        return isBuildFormTruthyValue(typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            ? value
            : null);
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
    if (!field.mask) {
        return normalized;
    }
    return applyBuildFormFieldMask(normalized, field.mask);
}
export function defineValidatedBuildForm(definition) {
    return definition;
}
export function withBuildFormValidation(definition, validation) {
    const currentValidation = definition
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
    };
}
export function fieldRef(field) {
    return {
        kind: 'field_ref',
        field: normalizeString(field)
    };
}
export function dbRef(target) {
    return {
        kind: 'db_ref',
        target: normalizeString(target)
    };
}
export const validationCondition = {
    truthy(field) {
        return {
            kind: 'field_truthy',
            field: normalizeString(field)
        };
    },
    falsy(field) {
        return {
            kind: 'field_falsy',
            field: normalizeString(field)
        };
    },
    equals(field, value) {
        return {
            kind: 'field_equals',
            field: normalizeString(field),
            value
        };
    },
    notEquals(field, value) {
        return {
            kind: 'field_not_equals',
            field: normalizeString(field),
            value
        };
    },
    in(field, values) {
        return {
            kind: 'field_in',
            field: normalizeString(field),
            values
        };
    },
    notIn(field, values) {
        return {
            kind: 'field_not_in',
            field: normalizeString(field),
            values
        };
    }
};
export const buildFormRule = {
    required(options = {}) {
        return {
            type: 'required',
            ...options
        };
    },
    email(options = {}) {
        return {
            type: 'email',
            ...options
        };
    },
    url(options = {}) {
        return {
            type: 'url',
            ...options
        };
    },
    minLength(value, options = {}) {
        return {
            type: 'min_length',
            value,
            ...options
        };
    },
    maxLength(value, options = {}) {
        return {
            type: 'max_length',
            value,
            ...options
        };
    },
    min(value, options = {}) {
        return {
            type: 'min',
            value,
            ...options
        };
    },
    max(value, options = {}) {
        return {
            type: 'max',
            value,
            ...options
        };
    },
    regex(pattern, options = {}) {
        return {
            type: 'regex',
            pattern,
            ...options
        };
    },
    integer(options = {}) {
        return {
            type: 'integer',
            ...options
        };
    },
    accepted(options = {}) {
        return {
            type: 'accepted',
            ...options
        };
    },
    confirmed(field, options = {}) {
        return {
            type: 'confirmed',
            field: normalizeString(field),
            ...options
        };
    },
    unique(target, options = {}) {
        return {
            type: 'unique',
            target,
            ...options
        };
    },
    exists(target, options = {}) {
        return {
            type: 'exists',
            target,
            ...options
        };
    }
};
export const buildFormValidationPreset = {
    blur(fields, options = {}) {
        const validateOn = normalizeValidationPresetTriggers(options.validateOn);
        const preflight = options.preflight;
        return {
            client: {
                validateOn
            },
            preflight: preflight
                ? {
                    enabled: true,
                    validateOn: typeof preflight === 'object'
                        ? normalizeValidationPresetTriggers(preflight.validateOn, validateOn)
                        : validateOn,
                    fieldDebounceMs: typeof preflight === 'object'
                        ? preflight.fieldDebounceMs ?? 250
                        : 250,
                    formId: typeof preflight === 'object' ? preflight.formId : undefined
                }
                : undefined,
            fields
        };
    }
};
export function listBuildFormFields(definition) {
    if (Array.isArray(definition.sections) && definition.sections.length > 0) {
        return definition.sections.flatMap((section) => section.fields);
    }
    return Array.isArray(definition.fields) ? definition.fields : [];
}
export function getBuildFormFieldByName(definition, fieldName) {
    const normalizedFieldName = normalizeString(fieldName);
    if (!normalizedFieldName) {
        return null;
    }
    return (listBuildFormFields(definition).find((field) => field.name === normalizedFieldName) ?? null);
}
export function getBuildFormValidation(definition) {
    const validation = definition.validation;
    return validation ?? null;
}
export function getBuildFormValidationRulesForField(definition, fieldName) {
    const validation = getBuildFormValidation(definition);
    return validation?.fields?.[normalizeString(fieldName)] ?? [];
}
export function normalizeBuildFormValuesFromInput(definition, input) {
    const normalizedValues = {};
    for (const field of listBuildFormFields(definition)) {
        const rawValue = readInputValue(input, field.name);
        const fallbackValue = resolveBuildFormValue({
            definition,
            fieldName: field.name,
            fallback: field.defaultValue
        });
        normalizedValues[field.name] = normalizeBuildFormFieldValue(field, rawValue === undefined ? fallbackValue : rawValue);
    }
    return normalizedValues;
}
export function normalizeBuildFormValuesFromFormData(definition, formData) {
    return normalizeBuildFormValuesFromInput(definition, formData);
}
export function createBuildFormValidationResult({ values, issues = [], formError = null }) {
    const fieldErrors = {};
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
export function createBuildFormValidationIssue({ field = null, code, message, rule, source }) {
    return {
        field: field ? normalizeString(field) : null,
        code: normalizeString(code) || rule,
        message: normalizeString(message),
        rule,
        source
    };
}
export function createBuildFormValidationResultFromFieldErrors({ values, fieldErrors, formError = null, source, code = 'invalid', rule = 'custom' }) {
    const issues = [];
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
            issues.push(createBuildFormValidationIssue({
                field: normalizedField,
                code,
                message: normalizedMessage,
                rule,
                source
            }));
        }
    }
    return createBuildFormValidationResult({
        values,
        issues,
        formError
    });
}
export function createBuildFormValidationResultFromFieldMessages({ values, fieldMessages, formMessage = null, resolveMessage, source, rule = 'custom' }) {
    const issues = [];
    for (const [field, rawMessages] of Object.entries(fieldMessages ?? {})) {
        const normalizedField = normalizeString(field);
        if (!normalizedField) {
            continue;
        }
        const messages = Array.isArray(rawMessages) ? rawMessages : [rawMessages];
        for (const message of messages) {
            const normalizedMessage = resolveBuildFormValidationMessage(message, resolveMessage);
            if (!normalizedMessage) {
                continue;
            }
            const code = typeof message === 'string'
                ? 'invalid'
                : normalizeString(message.key) || 'invalid';
            issues.push(createBuildFormValidationIssue({
                field: normalizedField,
                code,
                message: normalizedMessage,
                rule,
                source
            }));
        }
    }
    const resolvedFormError = formMessage === null
        ? null
        : resolveBuildFormValidationMessage(formMessage, resolveMessage);
    return createBuildFormValidationResult({
        values,
        issues,
        formError: resolvedFormError || null
    });
}
export function isBuildFormValidationRuntimeEnabled(rule, runtime) {
    return isRuntimeEnabled(rule, runtime);
}
export function matchesBuildFormValidationConditions(conditions, values) {
    return matchesConditions(conditions, values);
}
export function getBuildFormValidationRulesForFieldRuntime(definition, fieldName, runtime, values) {
    return getBuildFormValidationRulesForField(definition, fieldName).filter((rule) => isBuildFormValidationRuntimeEnabled(rule, runtime) &&
        matchesBuildFormValidationConditions(rule.when, values));
}
export function validateBuildFormLocally(definition, input, options = {}) {
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
    const issues = [];
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
                        }
                        catch {
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
            issues.push(createBuildFormValidationIssue({
                field: field.name,
                code: rule.type,
                message: resolveRuleMessage(rule, field),
                rule: rule.type,
                source: runtime
            }));
        }
    }
    return createBuildFormValidationResult({
        values: normalizedValues,
        issues
    });
}
export function isBuildFormValidationResultValid(result) {
    return result.valid;
}
export function shouldRunBuildFormPreflight(definition) {
    const validation = getBuildFormValidation(definition);
    return validation?.preflight?.enabled === true;
}
export function resolveBuildFormValidationTriggers(definition, runtime) {
    const validation = getBuildFormValidation(definition);
    const source = runtime === 'client'
        ? validation?.client?.validateOn
        : validation?.preflight?.validateOn;
    if (!source?.length) {
        return ['submit'];
    }
    return source;
}
export function resolveBuildFormValidationDebounceMs(definition) {
    const validation = getBuildFormValidation(definition);
    return validation?.preflight?.fieldDebounceMs ?? 300;
}
