export const DEFAULT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeMessageKey(value) {
    return value.trim();
}
function normalizeMessageTemplate(value) {
    return value.trim();
}
function interpolateMessageTemplate(template, values) {
    if (!values) {
        return template;
    }
    return template.replace(/\{([^}]+)\}/g, (match, rawKey) => {
        const key = rawKey.trim();
        if (!key) {
            return match;
        }
        const value = values[key];
        if (value === null || value === undefined) {
            return '';
        }
        return String(value);
    });
}
function normalizePositiveIntValue(value) {
    if (typeof value === 'number') {
        return Number.isInteger(value) && value > 0 ? value : null;
    }
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    if (!normalized) {
        return null;
    }
    const parsed = Number(normalized);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
export function createBuildFormValidationMessage(key, fallback, values) {
    return {
        key: normalizeMessageKey(key),
        fallback: normalizeMessageTemplate(fallback),
        values
    };
}
export function formatBuildFormValidationMessage(template, values) {
    return interpolateMessageTemplate(normalizeMessageTemplate(template), values);
}
export function resolveBuildFormValidationMessage(input, resolver) {
    if (typeof input === 'string') {
        return input.trim();
    }
    const resolved = resolver?.(input)?.trim();
    if (resolved) {
        return resolved;
    }
    return formatBuildFormValidationMessage(input.fallback, input.values);
}
export function createCatalogBuildFormValidationMessageResolver(catalog) {
    return (descriptor) => {
        const template = catalog[normalizeMessageKey(descriptor.key)];
        if (!template) {
            return null;
        }
        return formatBuildFormValidationMessage(template, descriptor.values);
    };
}
export function normalizeEmail(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().toLowerCase();
}
export function parseOptionalPositiveInt(value) {
    if (value === null || value === undefined) {
        return {
            value: null,
            valid: true
        };
    }
    if (typeof value === 'string' && value.trim().length === 0) {
        return {
            value: null,
            valid: true
        };
    }
    const parsed = normalizePositiveIntValue(value);
    if (parsed === null) {
        return {
            value: null,
            valid: false
        };
    }
    return {
        value: parsed,
        valid: true
    };
}
export const buildFormValidationMessage = {
    required(label = 'This field') {
        return createBuildFormValidationMessage('build_form.validation.required', '{label} is required.', { label });
    },
    invalidEmail(label = 'Email') {
        return createBuildFormValidationMessage('build_form.validation.invalid_email', '{label} must be a valid email address.', { label });
    },
    minLength(label = 'Value', min = 1) {
        return createBuildFormValidationMessage('build_form.validation.min_length', '{label} must be at least {min} characters.', { label, min });
    },
    invalidSelection(label = 'Selection') {
        return createBuildFormValidationMessage('build_form.validation.invalid_selection', 'Selected {label} is invalid.', { label });
    },
    recordNotFound(label = 'Record') {
        return createBuildFormValidationMessage('build_form.validation.record_not_found', '{label} was not found.', { label });
    },
    alreadyExists(label = 'Value') {
        return createBuildFormValidationMessage('build_form.validation.already_exists', '{label} already exists.', { label });
    },
    positiveInteger(label = 'Value') {
        return createBuildFormValidationMessage('build_form.validation.positive_integer', '{label} must be a positive integer.', { label });
    }
};
