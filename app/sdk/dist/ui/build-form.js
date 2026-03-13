'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { useBuildFormUiAdapter } from './build-form-adapter.js';
import { applyBuildFormFieldMask, isBuildFormTruthyValue, normalizeBuildFormColumns, normalizeBuildFormGap, resolveBuildFormValue, toBuildFormValueString, } from '../forms.js';
import { getBuildFormValidation, getBuildFormValidationRulesForField, normalizeBuildFormValuesFromFormData, resolveBuildFormValidationDebounceMs, resolveBuildFormValidationTriggers, shouldRunBuildFormPreflight, validateBuildFormLocally, } from '../form-validation.js';
function createBuildFormValidationUiState(result) {
    return {
        fieldErrors: result?.fieldErrors ?? {},
        formError: result?.formError ?? null,
    };
}
function mergeBuildFormFieldValidationResult(state, result, fieldName) {
    const nextFieldErrors = { ...state.fieldErrors };
    const messages = result.fieldErrors[fieldName];
    if (messages?.length) {
        nextFieldErrors[fieldName] = messages;
    }
    else {
        delete nextFieldErrors[fieldName];
    }
    return { fieldErrors: nextFieldErrors, formError: result.formError };
}
function resolveBuildFormFirstFieldError(state, fieldName) {
    return state.fieldErrors[fieldName]?.[0] ?? null;
}
function resolveLocalValidationMode(definition) {
    const validation = getBuildFormValidation(definition);
    const hasRules = validation?.fields !== undefined &&
        Object.keys(validation.fields).length > 0;
    if (!hasRules) {
        return { enabled: false, validateOnBlur: false, validateOnChange: false, validateOnSubmit: false };
    }
    const triggers = resolveBuildFormValidationTriggers(definition, 'client');
    return {
        enabled: true,
        validateOnBlur: triggers.includes('blur'),
        validateOnChange: triggers.includes('change'),
        validateOnSubmit: true,
    };
}
function resolveSections(definition) {
    const fallback = normalizeBuildFormColumns(definition.layout?.columns, 1);
    if (Array.isArray(definition.sections) && definition.sections.length > 0) {
        return definition.sections.map((s, i) => ({
            ...s,
            id: s.id ?? `section-${i + 1}`,
            columns: normalizeBuildFormColumns(s.columns, fallback),
        }));
    }
    if (!Array.isArray(definition.fields) || definition.fields.length === 0) {
        return [];
    }
    return [{ id: definition.id ?? 'section-1', columns: fallback, fields: definition.fields }];
}
function resolveGapClass(gap) {
    const g = normalizeBuildFormGap(gap, 'md');
    if (g === 'sm')
        return 'gap-3';
    if (g === 'lg')
        return 'gap-6';
    return 'gap-4';
}
function resolveGridClass(columns, gap) {
    const c = normalizeBuildFormColumns(columns, 1);
    const g = resolveGapClass(gap);
    if (c === 1)
        return `grid grid-cols-1 ${g}`;
    if (c === 2)
        return `grid grid-cols-1 ${g} md:grid-cols-2`;
    if (c === 3)
        return `grid grid-cols-1 ${g} md:grid-cols-2 xl:grid-cols-3`;
    return `grid grid-cols-1 ${g} md:grid-cols-2 xl:grid-cols-4`;
}
function resolveColSpanClass(span, columns) {
    if (!span || columns === 1 || span === 1)
        return undefined;
    if (columns === 2)
        return span === 'full' || span >= 2 ? 'md:col-span-2' : undefined;
    if (columns === 3) {
        if (span === 'full' || span >= 3)
            return 'md:col-span-2 xl:col-span-3';
        return span === 2 ? 'md:col-span-2 xl:col-span-2' : undefined;
    }
    if (span === 'full' || span >= 4)
        return 'md:col-span-2 xl:col-span-4';
    if (span === 3)
        return 'md:col-span-2 xl:col-span-3';
    return span === 2 ? 'md:col-span-2 xl:col-span-2' : undefined;
}
function resolveFieldValue(definition, field) {
    const fallback = 'defaultValue' in field ? field.defaultValue : undefined;
    return resolveBuildFormValue({ definition, fieldName: field.name, fallback });
}
function resolveFieldValueString(definition, field) {
    return toBuildFormValueString(resolveFieldValue(definition, field));
}
function resolveCheckboxChecked(definition, field) {
    return isBuildFormTruthyValue(resolveFieldValue(definition, field));
}
function resolveInputMode(field) {
    if (field.kind === 'checkbox' || field.kind === 'repeater')
        return undefined;
    if ('inputMode' in field && field.inputMode)
        return field.inputMode;
    if (field.kind === 'number')
        return 'step' in field && field.step === 'any' ? 'decimal' : 'numeric';
    if (!('mask' in field) || !field.mask)
        return undefined;
    if (field.mask === 'decimal' || field.mask === 'currency')
        return 'decimal';
    if (field.mask === 'digits' || field.mask === 'phone')
        return 'numeric';
    return undefined;
}
function applyMaskIfNeeded(field, value) {
    if (field.kind === 'checkbox' || field.kind === 'repeater')
        return value;
    if (!('mask' in field) || !field.mask)
        return value;
    return applyBuildFormFieldMask(value, field.mask);
}
function fieldUsesPreflight(definition, fieldName) {
    return getBuildFormValidationRulesForField(definition, fieldName).some((r) => r.type === 'unique' || r.type === 'exists' || r.runsOn?.includes('preflight') === true);
}
function resolveTrackedControl(target) {
    if (target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement) {
        const fieldName = target.name.trim();
        if (!fieldName || !target.form)
            return null;
        return { fieldName, form: target.form };
    }
    return null;
}
function normalizeDomId(value) {
    return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}
function normalizeDomIdWithFallback(value, fallback) {
    const n = normalizeDomId(value);
    return n.length > 0 ? n : fallback;
}
// ---------------------------------------------------------------------------
// Noop action for useActionState when no server action is wired
// ---------------------------------------------------------------------------
async function noopStateAction(previousState, _formData) {
    return previousState;
}
// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const inputClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] ' +
    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ' +
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';
const textareaClass = 'flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] ' +
    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ' +
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';
const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] ' +
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ' +
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';
const checkboxWrapperClass = 'flex items-start gap-3 rounded-md border border-border/70 p-3';
const checkboxClass = 'h-4 w-4 rounded border-input aria-invalid:border-destructive';
const labelClass = 'block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
const descClass = 'text-xs text-muted-foreground';
const errorClass = 'text-xs font-medium text-destructive';
function cx(...parts) {
    return parts.filter(Boolean).join(' ');
}
// ---------------------------------------------------------------------------
// Field renderer
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Repeater field
// ---------------------------------------------------------------------------
function nextRepeaterRowId() {
    return `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}
function createEmptyRepeaterRow(field) {
    const row = { id: nextRepeaterRowId() };
    if (field.emptyRow)
        Object.assign(row, field.emptyRow);
    for (const sub of field.subFields) {
        if (!(sub.name in row)) {
            row[sub.name] = sub.kind === 'checkbox' ? false : '';
        }
    }
    return row;
}
function RepeaterField({ field, definition, columns, }) {
    const initialRows = React.useMemo(() => {
        const rows = definition.repeaterRows?.[field.name];
        if (rows && rows.length > 0)
            return rows;
        return [createEmptyRepeaterRow(field)];
    }, []);
    const [rows, setRows] = React.useState(initialRows);
    const minRows = field.minRows ?? 1;
    const colSpanCls = resolveColSpanClass('full', columns);
    function addRow() {
        setRows((prev) => [...prev, createEmptyRepeaterRow(field)]);
    }
    function removeRow(id) {
        setRows((prev) => (prev.length <= minRows ? prev : prev.filter((r) => r.id !== id)));
    }
    function updateRow(id, name, value) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [name]: value } : r)));
    }
    return (_jsxs("div", { className: cx('space-y-3', field.className ?? undefined, colSpanCls), children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [field.label ? (_jsx("p", { className: "text-sm font-medium text-foreground", children: field.label })) : null, _jsx("button", { type: "button", onClick: addRow, className: "inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent", children: field.addLabel ?? 'Add row' })] }), field.description ? (_jsx("p", { className: descClass, children: field.description })) : null, _jsx("div", { className: "overflow-x-auto rounded-md border border-border/70", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground", children: _jsxs("tr", { children: [field.subFields.map((sub) => (_jsx("th", { className: "px-3 py-2 text-left", children: sub.label ?? sub.name }, sub.name))), _jsx("th", { className: "px-3 py-2 text-right" })] }) }), _jsx("tbody", { children: rows.map((row) => (_jsxs("tr", { className: "border-t border-border/70", children: [_jsx("input", { type: "hidden", name: field.name, value: row.id }), field.subFields.map((sub) => {
                                        const subValue = row[sub.name] ?? '';
                                        const isDisabled = sub.disableWhen !== undefined
                                            ? String(row[sub.disableWhen.field]) === String(sub.disableWhen.equals)
                                            : false;
                                        const inputName = `${sub.name}_${row.id}`;
                                        if (sub.kind === 'checkbox') {
                                            return (_jsx("td", { className: "px-3 py-2 text-center", children: _jsx("input", { type: "checkbox", name: inputName, checked: Boolean(subValue), onChange: (e) => updateRow(row.id, sub.name, e.target.checked), disabled: isDisabled, className: "h-4 w-4 accent-primary" }) }, sub.name));
                                        }
                                        if (sub.kind === 'select') {
                                            const opts = sub.optionsKey
                                                ? (definition.dynamicOptions?.[sub.optionsKey] ?? [])
                                                : (sub.options ?? []);
                                            return (_jsx("td", { className: "px-3 py-2", children: _jsx("select", { name: inputName, value: String(subValue), onChange: (e) => updateRow(row.id, sub.name, e.target.value), disabled: isDisabled, className: cx(selectClass, 'min-w-[120px]'), children: opts.map((opt) => (_jsx("option", { value: String(opt.value), disabled: opt.disabled, children: opt.label }, String(opt.value)))) }) }, sub.name));
                                        }
                                        return (_jsx("td", { className: "px-3 py-2", children: _jsx("input", { type: sub.kind === 'number' ? 'number' : 'text', name: inputName, value: String(subValue), placeholder: sub.placeholder, maxLength: sub.maxLength, min: sub.kind === 'number' ? sub.min : undefined, max: sub.kind === 'number' ? sub.max : undefined, step: sub.kind === 'number' ? sub.step : undefined, disabled: isDisabled, onChange: (e) => updateRow(row.id, sub.name, e.target.value), className: cx(inputClass, 'min-w-[100px]') }) }, sub.name));
                                    }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsx("button", { type: "button", disabled: rows.length <= minRows, onClick: () => removeRow(row.id), className: "inline-flex h-7 items-center justify-center rounded-md px-2 text-sm text-muted-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-40", children: field.removeLabel ?? 'Remove' }) })] }, row.id))) })] }) })] }));
}
function Field({ definition, field, formId, columns, errorMessage }) {
    if (field.kind === 'repeater') {
        return (_jsx(RepeaterField, { field: field, definition: definition, columns: columns }, field.name));
    }
    const fieldId = normalizeDomIdWithFallback(`${formId}-${field.name}`, `${formId}-field`);
    const descId = field.description ? `${formId}-${field.name}-description` : undefined;
    const errorId = errorMessage ? `${formId}-${field.name}-error` : undefined;
    const describedBy = [descId, errorId].filter(Boolean).join(' ') || undefined;
    const isInvalid = Boolean(errorMessage);
    const colSpanCls = resolveColSpanClass('colSpan' in field ? field.colSpan : undefined, columns);
    if (field.kind === 'hidden') {
        return _jsx("input", { type: "hidden", name: field.name, value: resolveFieldValueString(definition, field) }, field.name);
    }
    const wrapperCls = cx('space-y-2', 'className' in field ? field.className : undefined, colSpanCls);
    // Checkbox
    if (field.kind === 'checkbox') {
        const checkedValue = field.checkedValue ?? 'true';
        return (_jsxs("div", { className: wrapperCls, children: [field.uncheckedValue !== undefined ? (_jsx("input", { type: "hidden", name: field.name, value: field.uncheckedValue })) : null, _jsxs("label", { htmlFor: fieldId, className: cx(checkboxWrapperClass, isInvalid ? 'border-destructive' : undefined), children: [_jsx("input", { id: fieldId, type: "checkbox", name: field.name, value: checkedValue, defaultChecked: resolveCheckboxChecked(definition, field), disabled: field.disabled, "aria-invalid": isInvalid || undefined, "aria-describedby": describedBy, className: checkboxClass }), _jsx("span", { className: "space-y-1", children: field.label ? (_jsx("span", { className: "block text-sm font-medium", children: field.label })) : null })] }), _jsx(FieldFeedback, { descId: descId, errorId: errorId, description: field.description, errorMessage: errorMessage })] }));
    }
    const label = field.label ? (_jsx("label", { htmlFor: fieldId, className: labelClass, children: field.label })) : null;
    // Textarea
    if (field.kind === 'textarea') {
        return (_jsxs("div", { className: wrapperCls, children: [label, _jsx("textarea", { id: fieldId, name: field.name, rows: field.rows ?? 4, placeholder: field.placeholder, required: field.required, disabled: field.disabled, readOnly: field.readOnly, autoComplete: field.autoComplete, minLength: field.minLength, maxLength: field.maxLength, defaultValue: resolveFieldValueString(definition, field), "aria-invalid": isInvalid || undefined, "aria-describedby": describedBy, onChange: (e) => {
                        const next = applyMaskIfNeeded(field, e.currentTarget.value);
                        if (next !== e.currentTarget.value)
                            e.currentTarget.value = next;
                    }, className: textareaClass }), _jsx(FieldFeedback, { descId: descId, errorId: errorId, description: field.description, errorMessage: errorMessage })] }));
    }
    // Select
    if (field.kind === 'select') {
        const opts = field.optionsKey
            ? (definition.dynamicOptions?.[field.optionsKey] ?? [])
            : (field.options ?? []);
        const valueString = resolveFieldValueString(definition, field);
        return (_jsxs("div", { className: wrapperCls, children: [label, _jsxs("select", { id: fieldId, name: field.name, required: field.required, disabled: field.disabled, defaultValue: valueString !== '' ? valueString : '', "aria-invalid": isInvalid || undefined, "aria-describedby": describedBy, className: selectClass, children: [field.placeholder ? _jsx("option", { value: "", children: field.placeholder }) : null, opts.map((opt) => (_jsx("option", { value: toBuildFormValueString(opt.value), disabled: opt.disabled, children: opt.label }, `${field.name}-${opt.value}`)))] }), _jsx(FieldFeedback, { descId: descId, errorId: errorId, description: field.description, errorMessage: errorMessage })] }));
    }
    // Number + text-like inputs
    const inputType = field.kind === 'number' ? 'number' : field.kind;
    const inputCls = cx(inputClass, 'inputClassName' in field ? field.inputClassName : undefined);
    return (_jsxs("div", { className: wrapperCls, children: [label, _jsx("input", { id: fieldId, type: inputType, name: field.name, placeholder: field.placeholder, required: field.required, disabled: field.disabled, readOnly: field.readOnly, autoComplete: field.autoComplete, inputMode: resolveInputMode(field), minLength: 'minLength' in field ? field.minLength : undefined, maxLength: 'maxLength' in field ? field.maxLength : undefined, min: field.kind === 'number' ? field.min : undefined, max: field.kind === 'number' ? field.max : undefined, step: field.kind === 'number' ? field.step : undefined, defaultValue: resolveFieldValueString(definition, field), "aria-invalid": isInvalid || undefined, "aria-describedby": describedBy, onChange: (e) => {
                    const next = applyMaskIfNeeded(field, e.currentTarget.value);
                    if (next !== e.currentTarget.value)
                        e.currentTarget.value = next;
                }, className: inputCls }), _jsx(FieldFeedback, { descId: descId, errorId: errorId, description: field.description, errorMessage: errorMessage })] }));
}
function FieldFeedback({ descId, errorId, description, errorMessage, }) {
    if (!description && !errorMessage)
        return null;
    return (_jsxs("div", { className: "space-y-1", children: [description ? (_jsx("p", { id: descId, className: descClass, children: description })) : null, errorMessage ? (_jsx("p", { id: errorId, "aria-live": "polite", className: errorClass, children: errorMessage })) : null] }));
}
// ---------------------------------------------------------------------------
// Default renderer — full parity with host's BuildForm
// ---------------------------------------------------------------------------
function DefaultBuildForm({ definition, area = 'frontend', className }) {
    const internalId = React.useId().replace(/:/g, '');
    const fallbackId = `build-form-${internalId}`;
    const formId = normalizeDomIdWithFallback(definition.id ?? fallbackId, fallbackId);
    const sections = resolveSections(definition);
    const submit = definition.submit;
    const localMode = resolveLocalValidationMode(definition);
    const preflightEnabled = shouldRunBuildFormPreflight(definition);
    const validation = getBuildFormValidation(definition);
    const preflightTriggers = validation?.preflight?.validateOn ?? [];
    const preflightOnBlur = preflightEnabled && preflightTriggers.includes('blur');
    const preflightOnChange = preflightEnabled && preflightTriggers.includes('change');
    const preflightDebounceMs = resolveBuildFormValidationDebounceMs(definition);
    const preflightFormId = validation?.preflight?.formId ?? definition.id ?? formId;
    const preflightTimersRef = React.useRef(new Map());
    const preflightAbortRef = React.useRef(new Map());
    const preflightReqIdsRef = React.useRef(new Map());
    const withServerValidation = Boolean(validation) && typeof definition.request?.action === 'function';
    const [serverResult, serverAction] = React.useActionState(withServerValidation
        ? definition.request?.action
        : noopStateAction, null);
    const [valState, setValState] = React.useState(() => createBuildFormValidationUiState());
    // Reset validation state when definition changes
    React.useEffect(() => {
        for (const t of preflightTimersRef.current.values())
            clearTimeout(t);
        preflightTimersRef.current.clear();
        for (const c of preflightAbortRef.current.values())
            c.abort();
        preflightAbortRef.current.clear();
        preflightReqIdsRef.current.clear();
        setValState(createBuildFormValidationUiState());
    }, [definition]);
    // Hydrate server validation result
    React.useEffect(() => {
        if (!serverResult)
            return;
        setValState(createBuildFormValidationUiState(serverResult));
    }, [serverResult]);
    function validateField(form, fieldName) {
        const result = validateBuildFormLocally(definition, new FormData(form), { field: fieldName });
        setValState((cur) => mergeBuildFormFieldValidationResult(cur, result, fieldName));
        return result;
    }
    function clearScheduledPreflight(fieldName) {
        const t = preflightTimersRef.current.get(fieldName);
        if (t) {
            clearTimeout(t);
            preflightTimersRef.current.delete(fieldName);
        }
    }
    function abortInflightPreflight(fieldName) {
        const c = preflightAbortRef.current.get(fieldName);
        if (c) {
            c.abort();
            preflightAbortRef.current.delete(fieldName);
        }
    }
    function scheduleFieldPreflight({ form, fieldName, debounceMs, }) {
        if (!preflightEnabled || !preflightFormId)
            return;
        if (!fieldUsesPreflight(definition, fieldName))
            return;
        const normalizedValues = normalizeBuildFormValuesFromFormData(definition, new FormData(form));
        const requestId = (preflightReqIdsRef.current.get(fieldName) ?? 0) + 1;
        preflightReqIdsRef.current.set(fieldName, requestId);
        clearScheduledPreflight(fieldName);
        const execute = async () => {
            abortInflightPreflight(fieldName);
            const controller = new AbortController();
            preflightAbortRef.current.set(fieldName, controller);
            try {
                const response = await fetch('/api/forms/validate', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        formId: preflightFormId,
                        area,
                        field: fieldName,
                        values: normalizedValues,
                    }),
                    signal: controller.signal,
                });
                if (!response.ok)
                    return;
                const result = (await response.json());
                if (preflightReqIdsRef.current.get(fieldName) !== requestId)
                    return;
                setValState((cur) => mergeBuildFormFieldValidationResult(cur, result, fieldName));
            }
            catch (err) {
                if (!(err instanceof DOMException) || err.name !== 'AbortError') {
                    // ignore transient preflight failures — keep last known local state
                }
            }
            finally {
                if (preflightAbortRef.current.get(fieldName) === controller) {
                    preflightAbortRef.current.delete(fieldName);
                }
            }
        };
        if (debounceMs <= 0) {
            void execute();
            return;
        }
        const timeout = window.setTimeout(() => {
            preflightTimersRef.current.delete(fieldName);
            void execute();
        }, debounceMs);
        preflightTimersRef.current.set(fieldName, timeout);
    }
    function handleBlur(event) {
        const ctrl = resolveTrackedControl(event.target);
        if (!ctrl)
            return;
        const localResult = localMode.validateOnBlur
            ? validateField(ctrl.form, ctrl.fieldName)
            : null;
        if (preflightOnBlur && (localResult?.valid ?? true)) {
            scheduleFieldPreflight({ form: ctrl.form, fieldName: ctrl.fieldName, debounceMs: 0 });
        }
    }
    function handleChange(event) {
        const ctrl = resolveTrackedControl(event.target);
        if (!ctrl)
            return;
        const localResult = localMode.validateOnChange
            ? validateField(ctrl.form, ctrl.fieldName)
            : null;
        if (preflightOnChange && (localResult?.valid ?? true)) {
            scheduleFieldPreflight({ form: ctrl.form, fieldName: ctrl.fieldName, debounceMs: preflightDebounceMs });
        }
    }
    function handleSubmit(event) {
        for (const fieldName of preflightTimersRef.current.keys()) {
            clearScheduledPreflight(fieldName);
        }
        if (!localMode.validateOnSubmit)
            return;
        const result = validateBuildFormLocally(definition, new FormData(event.currentTarget));
        setValState(createBuildFormValidationUiState(result));
        if (!result.valid) {
            event.preventDefault();
        }
    }
    const submitAlignCls = submit?.align === 'start' ? 'justify-start' :
        submit?.align === 'between' ? 'justify-between' :
            'justify-end';
    return (_jsxs("form", { id: formId, action: (withServerValidation ? serverAction : definition.request?.action), method: definition.request?.method, encType: definition.request?.encType, onBlur: localMode.validateOnBlur || preflightOnBlur ? handleBlur : undefined, onChange: localMode.validateOnChange || preflightOnChange ? handleChange : undefined, onSubmit: localMode.validateOnSubmit ? handleSubmit : undefined, className: cx('space-y-6', className), noValidate: true, children: [definition.title || definition.description ? (_jsxs("div", { className: "space-y-1", children: [definition.title ? (_jsx("h3", { className: "text-lg font-semibold text-foreground", children: definition.title })) : null, definition.description ? (_jsx("p", { className: "text-sm text-muted-foreground", children: definition.description })) : null] })) : null, valState.formError ? (_jsx("div", { role: "alert", "aria-live": "polite", className: "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive", children: valState.formError })) : null, sections.map((section) => (_jsxs("section", { className: "space-y-4", children: [section.title || section.description ? (_jsxs("div", { className: "space-y-1", children: [section.title ? (_jsx("h4", { className: "text-base font-semibold text-foreground", children: section.title })) : null, section.description ? (_jsx("p", { className: "text-sm text-muted-foreground", children: section.description })) : null] })) : null, _jsx("div", { className: resolveGridClass(section.columns, definition.layout?.gap), children: (section.fields ?? []).map((field) => (_jsx(Field, { definition: definition, field: field, formId: formId, columns: section.columns, errorMessage: resolveBuildFormFirstFieldError(valState, 'name' in field ? field.name : '') }, 'name' in field ? field.name : String(field)))) })] }, section.id))), submit ? (_jsxs("div", { className: cx('flex flex-wrap items-center gap-2', submitAlignCls), children: [Array.isArray(submit.secondaryActions)
                        ? submit.secondaryActions.map((action, i) => action.href ? (_jsx("a", { href: action.href, className: "inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent", children: action.label }, `${action.label}-${i}`)) : (_jsx("button", { type: action.type ?? 'button', className: "inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent", children: action.label }, `${action.label}-${i}`)))
                        : null, _jsx(SubmitButton, { idleLabel: submit.idleLabel, pendingLabel: submit.pendingLabel })] })) : null] }));
}
// SubmitButton must be a separate component (child of <form>) so
// useFormStatus can read the enclosing form's pending state from React DOM.
function SubmitButton({ idleLabel, pendingLabel, }) {
    const { pending } = useFormStatus();
    return (_jsx("button", { type: "submit", disabled: pending, "aria-disabled": pending, className: "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60", children: pending && pendingLabel ? pendingLabel : (idleLabel ?? 'Submit') }));
}
// ---------------------------------------------------------------------------
// Public component — delegates to templateRenderer if provided
// ---------------------------------------------------------------------------
export function BuildForm(props) {
    const adapter = useBuildFormUiAdapter();
    if (props.templateRenderer) {
        return _jsx(_Fragment, { children: props.templateRenderer(props) });
    }
    if (adapter?.renderBuildForm) {
        return _jsx(_Fragment, { children: adapter.renderBuildForm(props) });
    }
    return _jsx(DefaultBuildForm, { ...props });
}
