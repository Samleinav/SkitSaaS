'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { useBuildFormUiAdapter } from './build-form-adapter.js';
import type { SdkBuildFormProps } from './build-form-contract.js';
import type {
  BuildFormDefinition,
  BuildFormFieldDefinition,
  BuildFormSectionDefinition,
  BuildFormValues,
  BuildFormValue,
  BuildFormColumns,
  BuildFormFieldColSpan,
  BuildFormRequestActionFunction,
  BuildFormRepeaterFieldDefinition,
  BuildFormRepeaterRow,
} from '../forms.js';
import type { BuildFormValidationResult } from '../form-validation.js';
import {
  applyBuildFormFieldMask,
  isBuildFormTruthyValue,
  normalizeBuildFormColumns,
  normalizeBuildFormGap,
  resolveBuildFormValue,
  toBuildFormValueString,
} from '../forms.js';
import {
  getBuildFormValidation,
  getBuildFormValidationRulesForField,
  normalizeBuildFormValuesFromFormData,
  resolveBuildFormValidationDebounceMs,
  resolveBuildFormValidationTriggers,
  shouldRunBuildFormPreflight,
  validateBuildFormLocally,
} from '../form-validation.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Validation UI state helpers (inlined from lib/forms/validation/results.ts)
// ---------------------------------------------------------------------------

type BuildFormValidationUiState = {
  fieldErrors: Record<string, string[]>;
  formError: string | null;
};

function createBuildFormValidationUiState(
  result?: Partial<BuildFormValidationUiState> | null,
): BuildFormValidationUiState {
  return {
    fieldErrors: result?.fieldErrors ?? {},
    formError: result?.formError ?? null,
  };
}

function mergeBuildFormFieldValidationResult(
  state: BuildFormValidationUiState,
  result: Pick<BuildFormValidationResult, 'fieldErrors' | 'formError'>,
  fieldName: string,
): BuildFormValidationUiState {
  const nextFieldErrors = { ...state.fieldErrors };
  const messages = result.fieldErrors[fieldName];
  if (messages?.length) {
    nextFieldErrors[fieldName] = messages;
  } else {
    delete nextFieldErrors[fieldName];
  }
  return { fieldErrors: nextFieldErrors, formError: result.formError };
}

function resolveBuildFormFirstFieldError(
  state: Pick<BuildFormValidationUiState, 'fieldErrors'>,
  fieldName: string,
): string | null {
  return state.fieldErrors[fieldName]?.[0] ?? null;
}

// ---------------------------------------------------------------------------
// Local validation mode helper (inlined from lib/forms/validation/local.ts)
// ---------------------------------------------------------------------------

type BuildFormLocalValidationMode = {
  enabled: boolean;
  validateOnBlur: boolean;
  validateOnChange: boolean;
  validateOnSubmit: boolean;
};

function resolveLocalValidationMode(
  definition: BuildFormDefinition,
): BuildFormLocalValidationMode {
  const validation = getBuildFormValidation(definition);
  const hasRules =
    validation?.fields !== undefined &&
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

// ---------------------------------------------------------------------------
// Layout helpers (inlined from lib/forms/runtime.ts)
// ---------------------------------------------------------------------------

type ResolvedSection = BuildFormSectionDefinition & {
  id: string;
  columns: BuildFormColumns;
};

function resolveSections(definition: BuildFormDefinition): ResolvedSection[] {
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

function resolveGapClass(gap: unknown): string {
  const g = normalizeBuildFormGap(gap, 'md');
  if (g === 'sm') return 'gap-3';
  if (g === 'lg') return 'gap-6';
  return 'gap-4';
}

function resolveGridClass(columns: unknown, gap: unknown): string {
  const c = normalizeBuildFormColumns(columns, 1);
  const g = resolveGapClass(gap);
  if (c === 1) return `grid grid-cols-1 ${g}`;
  if (c === 2) return `grid grid-cols-1 ${g} md:grid-cols-2`;
  if (c === 3) return `grid grid-cols-1 ${g} md:grid-cols-2 xl:grid-cols-3`;
  return `grid grid-cols-1 ${g} md:grid-cols-2 xl:grid-cols-4`;
}

function resolveColSpanClass(
  span: BuildFormFieldColSpan | undefined,
  columns: BuildFormColumns,
): string | undefined {
  if (!span || columns === 1 || span === 1) return undefined;
  if (columns === 2) return span === 'full' || span >= 2 ? 'md:col-span-2' : undefined;
  if (columns === 3) {
    if (span === 'full' || span >= 3) return 'md:col-span-2 xl:col-span-3';
    return span === 2 ? 'md:col-span-2 xl:col-span-2' : undefined;
  }
  if (span === 'full' || span >= 4) return 'md:col-span-2 xl:col-span-4';
  if (span === 3) return 'md:col-span-2 xl:col-span-3';
  return span === 2 ? 'md:col-span-2 xl:col-span-2' : undefined;
}

function resolveFieldValue(
  definition: BuildFormDefinition,
  field: BuildFormFieldDefinition,
): BuildFormValue | undefined {
  const fallback = 'defaultValue' in field ? field.defaultValue : undefined;
  return resolveBuildFormValue({ definition, fieldName: field.name, fallback });
}

function resolveFieldValueString(
  definition: BuildFormDefinition,
  field: BuildFormFieldDefinition,
): string {
  return toBuildFormValueString(resolveFieldValue(definition, field));
}

function resolveCheckboxChecked(
  definition: BuildFormDefinition,
  field: BuildFormFieldDefinition,
): boolean {
  return isBuildFormTruthyValue(resolveFieldValue(definition, field));
}

function resolveInputMode(
  field: BuildFormFieldDefinition,
): React.InputHTMLAttributes<HTMLInputElement>['inputMode'] | undefined {
  if (field.kind === 'checkbox' || field.kind === 'repeater') return undefined;
  if ('inputMode' in field && field.inputMode) return field.inputMode as React.InputHTMLAttributes<HTMLInputElement>['inputMode'];
  if (field.kind === 'number') return 'step' in field && field.step === 'any' ? 'decimal' : 'numeric';
  if (!('mask' in field) || !field.mask) return undefined;
  if (field.mask === 'decimal' || field.mask === 'currency') return 'decimal';
  if (field.mask === 'digits' || field.mask === 'phone') return 'numeric';
  return undefined;
}

function applyMaskIfNeeded(field: BuildFormFieldDefinition, value: string): string {
  if (field.kind === 'checkbox' || field.kind === 'repeater') return value;
  if (!('mask' in field) || !field.mask) return value;
  return applyBuildFormFieldMask(value, field.mask);
}

function fieldUsesPreflight(definition: BuildFormDefinition, fieldName: string): boolean {
  return getBuildFormValidationRulesForField(definition, fieldName).some(
    (r) => r.type === 'unique' || r.type === 'exists' || r.runsOn?.includes('preflight') === true,
  );
}

function resolveTrackedControl(target: EventTarget | null) {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    const fieldName = target.name.trim();
    if (!fieldName || !target.form) return null;
    return { fieldName, form: target.form };
  }
  return null;
}

function normalizeDomId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeDomIdWithFallback(value: string, fallback: string): string {
  const n = normalizeDomId(value);
  return n.length > 0 ? n : fallback;
}

// ---------------------------------------------------------------------------
// Noop action for useActionState when no server action is wired
// ---------------------------------------------------------------------------

async function noopStateAction(
  previousState: BuildFormValidationResult<BuildFormValues> | null,
  _formData: FormData,
) {
  return previousState;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] ' +
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ' +
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';

const textareaClass =
  'flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] ' +
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ' +
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] ' +
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ' +
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';

const checkboxWrapperClass = 'flex items-start gap-3 rounded-md border border-border/70 p-3';
const checkboxClass = 'h-4 w-4 rounded border-input aria-invalid:border-destructive';
const labelClass = 'block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
const descClass = 'text-xs text-muted-foreground';
const errorClass = 'text-xs font-medium text-destructive';

function cx(...parts: (string | undefined | null | false)[]): string {
  return parts.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Field renderer
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Repeater field
// ---------------------------------------------------------------------------

function nextRepeaterRowId(): string {
  return `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function createEmptyRepeaterRow(field: BuildFormRepeaterFieldDefinition): BuildFormRepeaterRow {
  const row: BuildFormRepeaterRow = { id: nextRepeaterRowId() };
  if (field.emptyRow) Object.assign(row, field.emptyRow);
  for (const sub of field.subFields) {
    if (!(sub.name in row)) {
      row[sub.name] = sub.kind === 'checkbox' ? false : '';
    }
  }
  return row;
}

function RepeaterField({
  field,
  definition,
  columns,
}: {
  field: BuildFormRepeaterFieldDefinition;
  definition: BuildFormDefinition;
  columns: BuildFormColumns;
}) {
  const initialRows = React.useMemo(() => {
    const rows = definition.repeaterRows?.[field.name];
    if (rows && rows.length > 0) return rows;
    return [createEmptyRepeaterRow(field)];
  }, []);

  const [rows, setRows] = React.useState<BuildFormRepeaterRow[]>(initialRows);
  const minRows = field.minRows ?? 1;
  const colSpanCls = resolveColSpanClass('full', columns);

  function addRow() {
    setRows((prev) => [...prev, createEmptyRepeaterRow(field)]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length <= minRows ? prev : prev.filter((r) => r.id !== id)));
  }

  function updateRow(id: string, name: string, value: string | boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [name]: value } : r)));
  }

  return (
    <div className={cx('space-y-3', field.className ?? undefined, colSpanCls)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {field.label ? (
          <p className="text-sm font-medium text-foreground">{field.label}</p>
        ) : null}
        <button
          type="button"
          onClick={addRow}
          className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent"
        >
          {field.addLabel ?? 'Add row'}
        </button>
      </div>
      {field.description ? (
        <p className={descClass}>{field.description}</p>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-border/70">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {field.subFields.map((sub) => (
                <th key={sub.name} className="px-3 py-2 text-left">
                  {sub.label ?? sub.name}
                </th>
              ))}
              <th className="px-3 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border/70">
                <input type="hidden" name={field.name} value={row.id} />
                {field.subFields.map((sub) => {
                  const subValue = row[sub.name] ?? '';
                  const isDisabled =
                    sub.disableWhen !== undefined
                      ? String(row[sub.disableWhen.field]) === String(sub.disableWhen.equals)
                      : false;
                  const inputName = `${sub.name}_${row.id}`;

                  if (sub.kind === 'checkbox') {
                    return (
                      <td key={sub.name} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          name={inputName}
                          checked={Boolean(subValue)}
                          onChange={(e) => updateRow(row.id, sub.name, e.target.checked)}
                          disabled={isDisabled}
                          className="h-4 w-4 accent-primary"
                        />
                      </td>
                    );
                  }

                  if (sub.kind === 'select') {
                    const opts = sub.optionsKey
                      ? (definition.dynamicOptions?.[sub.optionsKey] ?? [])
                      : (sub.options ?? []);
                    return (
                      <td key={sub.name} className="px-3 py-2">
                        <select
                          name={inputName}
                          value={String(subValue)}
                          onChange={(e) => updateRow(row.id, sub.name, e.target.value)}
                          disabled={isDisabled}
                          className={cx(selectClass, 'min-w-[120px]')}
                        >
                          {opts.map((opt) => (
                            <option key={String(opt.value)} value={String(opt.value)} disabled={opt.disabled}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  return (
                    <td key={sub.name} className="px-3 py-2">
                      <input
                        type={sub.kind === 'number' ? 'number' : 'text'}
                        name={inputName}
                        value={String(subValue)}
                        placeholder={sub.placeholder}
                        maxLength={sub.maxLength}
                        min={sub.kind === 'number' ? sub.min : undefined}
                        max={sub.kind === 'number' ? sub.max : undefined}
                        step={sub.kind === 'number' ? sub.step : undefined}
                        disabled={isDisabled}
                        onChange={(e) => updateRow(row.id, sub.name, e.target.value)}
                        className={cx(inputClass, 'min-w-[100px]')}
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={rows.length <= minRows}
                    onClick={() => removeRow(row.id)}
                    className="inline-flex h-7 items-center justify-center rounded-md px-2 text-sm text-muted-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                  >
                    {field.removeLabel ?? 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Regular field
// ---------------------------------------------------------------------------

type FieldProps = {
  definition: BuildFormDefinition;
  field: BuildFormFieldDefinition;
  formId: string;
  columns: BuildFormColumns;
  errorMessage: string | null;
};

function Field({ definition, field, formId, columns, errorMessage }: FieldProps) {
  if (field.kind === 'repeater') {
    return (
      <RepeaterField
        key={field.name}
        field={field}
        definition={definition}
        columns={columns}
      />
    );
  }

  const fieldId = normalizeDomIdWithFallback(`${formId}-${field.name}`, `${formId}-field`);
  const descId = field.description ? `${formId}-${field.name}-description` : undefined;
  const errorId = errorMessage ? `${formId}-${field.name}-error` : undefined;
  const describedBy = [descId, errorId].filter(Boolean).join(' ') || undefined;
  const isInvalid = Boolean(errorMessage);
  const colSpanCls = resolveColSpanClass('colSpan' in field ? field.colSpan : undefined, columns);

  if (field.kind === 'hidden') {
    return <input key={field.name} type="hidden" name={field.name} value={resolveFieldValueString(definition, field)} />;
  }

  const wrapperCls = cx('space-y-2', 'className' in field ? (field.className as string) : undefined, colSpanCls);

  // Checkbox
  if (field.kind === 'checkbox') {
    const checkedValue = field.checkedValue ?? 'true';
    return (
      <div className={wrapperCls}>
        {field.uncheckedValue !== undefined ? (
          <input type="hidden" name={field.name} value={field.uncheckedValue} />
        ) : null}
        <label
          htmlFor={fieldId}
          className={cx(checkboxWrapperClass, isInvalid ? 'border-destructive' : undefined)}
        >
          <input
            id={fieldId}
            type="checkbox"
            name={field.name}
            value={checkedValue}
            defaultChecked={resolveCheckboxChecked(definition, field)}
            disabled={field.disabled}
            aria-invalid={isInvalid || undefined}
            aria-describedby={describedBy}
            className={checkboxClass}
          />
          <span className="space-y-1">
            {field.label ? (
              <span className="block text-sm font-medium">{field.label}</span>
            ) : null}
          </span>
        </label>
        <FieldFeedback descId={descId} errorId={errorId} description={field.description} errorMessage={errorMessage} />
      </div>
    );
  }

  const label = field.label ? (
    <label htmlFor={fieldId} className={labelClass}>
      {field.label}
    </label>
  ) : null;

  // Textarea
  if (field.kind === 'textarea') {
    return (
      <div className={wrapperCls}>
        {label}
        <textarea
          id={fieldId}
          name={field.name}
          rows={field.rows ?? 4}
          placeholder={field.placeholder}
          required={field.required}
          disabled={field.disabled}
          readOnly={field.readOnly}
          autoComplete={field.autoComplete}
          minLength={field.minLength}
          maxLength={field.maxLength}
          defaultValue={resolveFieldValueString(definition, field)}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            const next = applyMaskIfNeeded(field, e.currentTarget.value);
            if (next !== e.currentTarget.value) e.currentTarget.value = next;
          }}
          className={textareaClass}
        />
        <FieldFeedback descId={descId} errorId={errorId} description={field.description} errorMessage={errorMessage} />
      </div>
    );
  }

  // Select
  if (field.kind === 'select') {
    const opts = field.optionsKey
      ? (definition.dynamicOptions?.[field.optionsKey] ?? [])
      : (field.options ?? []);
    const valueString = resolveFieldValueString(definition, field);
    return (
      <div className={wrapperCls}>
        {label}
        <select
          id={fieldId}
          name={field.name}
          required={field.required}
          disabled={field.disabled}
          defaultValue={valueString !== '' ? valueString : ''}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          className={selectClass}
        >
          {field.placeholder ? <option value="">{field.placeholder}</option> : null}
          {opts.map((opt) => (
            <option
              key={`${field.name}-${opt.value}`}
              value={toBuildFormValueString(opt.value)}
              disabled={opt.disabled}
            >
              {opt.label}
            </option>
          ))}
        </select>
        <FieldFeedback descId={descId} errorId={errorId} description={field.description} errorMessage={errorMessage} />
      </div>
    );
  }

  // Number + text-like inputs
  const inputType = field.kind === 'number' ? 'number' : field.kind;
  const inputCls = cx(inputClass, 'inputClassName' in field ? (field.inputClassName as string) : undefined);

  return (
    <div className={wrapperCls}>
      {label}
      <input
        id={fieldId}
        type={inputType}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
        disabled={field.disabled}
        readOnly={field.readOnly}
        autoComplete={field.autoComplete}
        inputMode={resolveInputMode(field)}
        minLength={'minLength' in field ? field.minLength : undefined}
        maxLength={'maxLength' in field ? field.maxLength : undefined}
        min={field.kind === 'number' ? field.min : undefined}
        max={field.kind === 'number' ? field.max : undefined}
        step={field.kind === 'number' ? field.step : undefined}
        defaultValue={resolveFieldValueString(definition, field)}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          const next = applyMaskIfNeeded(field, e.currentTarget.value);
          if (next !== e.currentTarget.value) e.currentTarget.value = next;
        }}
        className={inputCls}
      />
      <FieldFeedback descId={descId} errorId={errorId} description={field.description} errorMessage={errorMessage} />
    </div>
  );
}

function FieldFeedback({
  descId,
  errorId,
  description,
  errorMessage,
}: {
  descId: string | undefined;
  errorId: string | undefined;
  description?: string;
  errorMessage: string | null;
}) {
  if (!description && !errorMessage) return null;
  return (
    <div className="space-y-1">
      {description ? (
        <p id={descId} className={descClass}>{description}</p>
      ) : null}
      {errorMessage ? (
        <p id={errorId} aria-live="polite" className={errorClass}>{errorMessage}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default renderer — full parity with host's BuildForm
// ---------------------------------------------------------------------------

function DefaultBuildForm({ definition, area = 'frontend', className }: SdkBuildFormProps) {
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

  const preflightTimersRef = React.useRef<Map<string, number>>(new Map());
  const preflightAbortRef = React.useRef<Map<string, AbortController>>(new Map());
  const preflightReqIdsRef = React.useRef<Map<string, number>>(new Map());

  const withServerValidation =
    Boolean(validation) && typeof definition.request?.action === 'function';

  const [serverResult, serverAction] = React.useActionState<
    BuildFormValidationResult<BuildFormValues> | null,
    FormData
  >(
    withServerValidation
      ? (definition.request?.action as BuildFormRequestActionFunction as (
          prev: BuildFormValidationResult<BuildFormValues> | null,
          fd: FormData,
        ) => Promise<BuildFormValidationResult<BuildFormValues>> | BuildFormValidationResult<BuildFormValues>)
      : noopStateAction,
    null,
  );

  const [valState, setValState] = React.useState<BuildFormValidationUiState>(() =>
    createBuildFormValidationUiState(),
  );

  // Reset validation state when definition changes
  React.useEffect(() => {
    for (const t of preflightTimersRef.current.values()) clearTimeout(t);
    preflightTimersRef.current.clear();
    for (const c of preflightAbortRef.current.values()) c.abort();
    preflightAbortRef.current.clear();
    preflightReqIdsRef.current.clear();
    setValState(createBuildFormValidationUiState());
  }, [definition]);

  // Hydrate server validation result
  React.useEffect(() => {
    if (!serverResult) return;
    setValState(createBuildFormValidationUiState(serverResult));
  }, [serverResult]);

  function validateField(form: HTMLFormElement, fieldName: string) {
    const result = validateBuildFormLocally(definition, new FormData(form), { field: fieldName });
    setValState((cur) => mergeBuildFormFieldValidationResult(cur, result, fieldName));
    return result;
  }

  function clearScheduledPreflight(fieldName: string) {
    const t = preflightTimersRef.current.get(fieldName);
    if (t) { clearTimeout(t); preflightTimersRef.current.delete(fieldName); }
  }

  function abortInflightPreflight(fieldName: string) {
    const c = preflightAbortRef.current.get(fieldName);
    if (c) { c.abort(); preflightAbortRef.current.delete(fieldName); }
  }

  function scheduleFieldPreflight({
    form,
    fieldName,
    debounceMs,
  }: {
    form: HTMLFormElement;
    fieldName: string;
    debounceMs: number;
  }) {
    if (!preflightEnabled || !preflightFormId) return;
    if (!fieldUsesPreflight(definition, fieldName)) return;

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
        if (!response.ok) return;
        const result = (await response.json()) as BuildFormValidationResult<BuildFormValues>;
        if (preflightReqIdsRef.current.get(fieldName) !== requestId) return;
        setValState((cur) => mergeBuildFormFieldValidationResult(cur, result, fieldName));
      } catch (err) {
        if (!(err instanceof DOMException) || err.name !== 'AbortError') {
          // ignore transient preflight failures — keep last known local state
        }
      } finally {
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

  function handleBlur(event: React.FocusEvent<HTMLFormElement>) {
    const ctrl = resolveTrackedControl(event.target);
    if (!ctrl) return;

    const localResult = localMode.validateOnBlur
      ? validateField(ctrl.form, ctrl.fieldName)
      : null;

    if (preflightOnBlur && (localResult?.valid ?? true)) {
      scheduleFieldPreflight({ form: ctrl.form, fieldName: ctrl.fieldName, debounceMs: 0 });
    }
  }

  function handleChange(event: React.FormEvent<HTMLFormElement>) {
    const ctrl = resolveTrackedControl(event.target);
    if (!ctrl) return;

    const localResult = localMode.validateOnChange
      ? validateField(ctrl.form, ctrl.fieldName)
      : null;

    if (preflightOnChange && (localResult?.valid ?? true)) {
      scheduleFieldPreflight({ form: ctrl.form, fieldName: ctrl.fieldName, debounceMs: preflightDebounceMs });
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    for (const fieldName of preflightTimersRef.current.keys()) {
      clearScheduledPreflight(fieldName);
    }

    if (!localMode.validateOnSubmit) return;

    const result = validateBuildFormLocally(definition, new FormData(event.currentTarget));
    setValState(createBuildFormValidationUiState(result));

    if (!result.valid) {
      event.preventDefault();
    }
  }

  const submitAlignCls =
    submit?.align === 'start' ? 'justify-start' :
    submit?.align === 'between' ? 'justify-between' :
    'justify-end';

  return (
    <form
      id={formId}
      action={
        (
          withServerValidation ? serverAction : definition.request?.action
        ) as React.FormHTMLAttributes<HTMLFormElement>['action']
      }
      method={definition.request?.method}
      encType={definition.request?.encType}
      onBlur={localMode.validateOnBlur || preflightOnBlur ? handleBlur : undefined}
      onChange={localMode.validateOnChange || preflightOnChange ? handleChange : undefined}
      onSubmit={localMode.validateOnSubmit ? handleSubmit : undefined}
      className={cx('space-y-6', className)}
      noValidate
    >
      {definition.title || definition.description ? (
        <div className="space-y-1">
          {definition.title ? (
            <h3 className="text-lg font-semibold text-foreground">{definition.title}</h3>
          ) : null}
          {definition.description ? (
            <p className="text-sm text-muted-foreground">{definition.description}</p>
          ) : null}
        </div>
      ) : null}

      {valState.formError ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {valState.formError}
        </div>
      ) : null}

      {sections.map((section) => (
        <section key={section.id} className="space-y-4">
          {section.title || section.description ? (
            <div className="space-y-1">
              {section.title ? (
                <h4 className="text-base font-semibold text-foreground">{section.title}</h4>
              ) : null}
              {section.description ? (
                <p className="text-sm text-muted-foreground">{section.description}</p>
              ) : null}
            </div>
          ) : null}
          <div className={resolveGridClass(section.columns, definition.layout?.gap)}>
            {(section.fields ?? []).map((field) => (
              <Field
                key={'name' in field ? field.name : String(field)}
                definition={definition}
                field={field}
                formId={formId}
                columns={section.columns}
                errorMessage={resolveBuildFormFirstFieldError(valState, 'name' in field ? field.name : '')}
              />
            ))}
          </div>
        </section>
      ))}

      {submit ? (
        <div className={cx('flex flex-wrap items-center gap-2', submitAlignCls)}>
          {Array.isArray(submit.secondaryActions)
            ? submit.secondaryActions.map((action, i) =>
                action.href ? (
                  <a
                    key={`${action.label}-${i}`}
                    href={action.href}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent"
                  >
                    {action.label}
                  </a>
                ) : (
                  <button
                    key={`${action.label}-${i}`}
                    type={action.type ?? 'button'}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent"
                  >
                    {action.label}
                  </button>
                ),
              )
            : null}
          <SubmitButton
            idleLabel={submit.idleLabel}
            pendingLabel={submit.pendingLabel}
          />
        </div>
      ) : null}
    </form>
  );
}

// SubmitButton must be a separate component (child of <form>) so
// useFormStatus can read the enclosing form's pending state from React DOM.
function SubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
    >
      {pending && pendingLabel ? pendingLabel : (idleLabel ?? 'Submit')}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Public component — delegates to templateRenderer if provided
// ---------------------------------------------------------------------------

export function BuildForm(props: SdkBuildFormProps) {
  const adapter = useBuildFormUiAdapter();

  if (props.templateRenderer) {
    return <>{props.templateRenderer(props)}</>;
  }

  if (adapter?.renderBuildForm) {
    return <>{adapter.renderBuildForm(props)}</>;
  }

  return <DefaultBuildForm {...props} />;
}
