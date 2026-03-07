export function defineBuildForm(definition) {
    return definition;
}
export function defineBuildFormSection(section) {
    return section;
}
export function defineBuildModal(definition) {
    return definition;
}
function hasOwnKey(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}
export const buildFormField = {
    hidden(input) {
        return { kind: 'hidden', ...input };
    },
    text(input) {
        return { kind: 'text', ...input };
    },
    email(input) {
        return { kind: 'email', ...input };
    },
    password(input) {
        return { kind: 'password', ...input };
    },
    tel(input) {
        return { kind: 'tel', ...input };
    },
    url(input) {
        return { kind: 'url', ...input };
    },
    date(input) {
        return { kind: 'date', ...input };
    },
    number(input) {
        return { kind: 'number', ...input };
    },
    textarea(input) {
        return { kind: 'textarea', ...input };
    },
    select(input) {
        return { kind: 'select', ...input };
    },
    checkbox(input) {
        return { kind: 'checkbox', ...input };
    }
};
export function withBuildFormValues(definition, values) {
    return {
        ...definition,
        values: {
            ...(definition.values ?? {}),
            ...values
        }
    };
}
export function withBuildFormRequest(definition, request) {
    return {
        ...definition,
        request: {
            ...(definition.request ?? {}),
            ...request
        }
    };
}
export function composeBuildFormDefinition(definition, options = {}) {
    let nextDefinition = definition;
    if (hasOwnKey(options, 'request')) {
        if (options.request) {
            nextDefinition = withBuildFormRequest(nextDefinition, options.request);
        }
        else {
            nextDefinition = defineBuildForm({
                ...nextDefinition,
                request: undefined
            });
        }
    }
    if (hasOwnKey(options, 'submit')) {
        nextDefinition = defineBuildForm({
            ...nextDefinition,
            submit: options.submit ?? undefined
        });
    }
    if (hasOwnKey(options, 'values')) {
        if (options.values) {
            nextDefinition = withBuildFormValues(nextDefinition, options.values);
        }
        else {
            nextDefinition = defineBuildForm({
                ...nextDefinition,
                values: undefined
            });
        }
    }
    return defineBuildForm(nextDefinition);
}
export function resolveBuildFormValue({ definition, fieldName, fallback }) {
    const explicitValue = definition.values?.[fieldName];
    return explicitValue !== undefined ? explicitValue : fallback;
}
export function normalizeBuildFormColumns(value, fallback = 1) {
    if (value === 1 ||
        value === 2 ||
        value === 3 ||
        value === 4) {
        return value;
    }
    return fallback;
}
export function normalizeBuildFormGap(value, fallback = 'md') {
    if (value === 'sm' || value === 'md' || value === 'lg') {
        return value;
    }
    return fallback;
}
export function toBuildFormValueString(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    return String(value);
}
export function isBuildFormTruthyValue(value) {
    if (value === true) {
        return true;
    }
    if (value === false || value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    const normalized = value.trim().toLowerCase();
    return (normalized === 'true' ||
        normalized === '1' ||
        normalized === 'yes' ||
        normalized === 'on');
}
export function applyBuildFormFieldMask(value, mask) {
    switch (mask) {
        case 'digits':
            return value.replace(/\D+/g, '');
        case 'decimal':
        case 'currency': {
            const normalized = value.replace(/[^\d.]+/g, '');
            const [integerPart, ...rest] = normalized.split('.');
            const decimalPart = rest.join('');
            return decimalPart.length > 0
                ? `${integerPart}.${decimalPart}`
                : integerPart;
        }
        case 'phone': {
            const digitsOnly = value.replace(/\D+/g, '').slice(0, 10);
            if (digitsOnly.length <= 3) {
                return digitsOnly;
            }
            if (digitsOnly.length <= 6) {
                return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
            }
            return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
        }
        case 'slug':
            return value
                .trim()
                .toLowerCase()
                .replace(/[_\s]+/g, '-')
                .replace(/[^a-z0-9-]+/g, '')
                .replace(/-{2,}/g, '-')
                .replace(/^-+|-+$/g, '');
        case 'upper':
            return value.toUpperCase();
        case 'lower':
            return value.toLowerCase();
        default:
            return value;
    }
}
