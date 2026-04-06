'use client';

import * as React from 'react';
import Link from 'next/link';
import type {
  BuildFormCheckboxFieldDefinition,
  BuildFormDefinition,
  BuildFormFieldDefinition,
  BuildFormRepeaterFieldDefinition,
  BuildFormRepeaterRow,
  BuildFormRequestActionFunction,
  BuildFormValues,
  BuildFormValidationResult,
  BuildFormValue
} from '@skitsaas/sdk';
import {
  applyBuildFormFieldMask,
  getBuildFormValidationRulesForField,
  getBuildFormValidation,
  normalizeBuildFormValuesFromFormData,
  resolveBuildFormValidationDebounceMs,
  shouldRunBuildFormPreflight,
  toBuildFormValueString
} from '@skitsaas/sdk';
import { BuildModal } from '@/components/ui/build-modal';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemedAsyncSubmitButton } from '@/components/ui/themed-async-submit-button';
import {
  resolveBuildFormLocalValidationMode,
  runBuildFormLocalValidation
} from '@/lib/forms/validation/local';
import {
  createBuildFormValidationUiState,
  mergeBuildFormFieldValidationResult,
  resolveBuildFormFirstFieldError
} from '@/lib/forms/validation/results';
import { getTemplateDebugMetadataAttributes } from '@/lib/templates/debug';
import type { UiFormTemplatePayload } from '@/lib/templates/ui-form-payload';
import {
  resolveBuildFormCheckboxChecked,
  resolveBuildFormFieldColSpanClassName,
  resolveBuildFormFieldValue,
  resolveBuildFormFieldValueString,
  resolveBuildFormGridClassName,
  resolveBuildFormInputMode,
  resolveBuildFormSections
} from '@/lib/forms/runtime';
import { cn } from '@/lib/utils';

type UiTemplateArea = 'admin' | 'dashboard' | 'frontend' | 'global';

const BASE_TEXTAREA_CLASS_NAME =
  'flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';

const BASE_SELECT_CLASS_NAME =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';

const BASE_CHECKBOX_CLASS_NAME =
  'h-4 w-4 rounded border-input aria-invalid:border-destructive';
const BASE_CHECKBOX_WRAPPER_CLASS_NAME =
  'flex items-start gap-3 rounded-md border border-border/70 p-3';

async function buildFormNoopStateAction(
  previousState: BuildFormValidationResult<BuildFormValues> | null,
  _formData: FormData
) {
  return previousState;
}

export type BuildFormProps = {
  definition: BuildFormDefinition;
  area?: UiTemplateArea;
  themeId?: string | null;
  slot?: string;
  className?: string;
  templateId?: string | null;
  templateSource?: string | null;
  templateComponentId?: string | null;
  templatePayload?: UiFormTemplatePayload;
};

function normalizeDomId(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeDomIdWithFallback(value: string, fallback: string) {
  const normalized = normalizeDomId(value);
  return normalized.length > 0 ? normalized : fallback;
}

function resolveFieldDescriptionId(formId: string, fieldName: string) {
  return normalizeDomIdWithFallback(
    `${formId}-${fieldName}-description`,
    `${formId}-field-description`
  );
}

function resolveFieldErrorId(formId: string, fieldName: string) {
  return normalizeDomIdWithFallback(
    `${formId}-${fieldName}-error`,
    `${formId}-field-error`
  );
}

function resolveActionsAlignClassName(
  align: 'start' | 'end' | 'between' | undefined
) {
  if (align === 'start') {
    return 'justify-start';
  }

  if (align === 'between') {
    return 'justify-between';
  }

  return 'justify-end';
}

function buildFormFieldSupportsMask(
  field: BuildFormFieldDefinition
): field is Exclude<
  BuildFormFieldDefinition,
  BuildFormCheckboxFieldDefinition | BuildFormRepeaterFieldDefinition
> {
  return field.kind !== 'checkbox' && field.kind !== 'repeater';
}

function applyMaskIfNeeded({
  field,
  value
}: {
  field: BuildFormFieldDefinition;
  value: string;
}) {
  if (!buildFormFieldSupportsMask(field) || !field.mask) {
    return value;
  }

  return applyBuildFormFieldMask(value, field.mask);
}

function fieldUsesBuildFormPreflightValidation(
  definition: BuildFormDefinition,
  fieldName: string
) {
  return getBuildFormValidationRulesForField(definition, fieldName).some(
    (rule) =>
      rule.type === 'unique' ||
      rule.type === 'exists' ||
      rule.runsOn?.includes('preflight') === true
  );
}

function FieldFeedback({
  field,
  formId,
  errorMessage,
  templatePayload
}: {
  field: BuildFormFieldDefinition;
  formId: string;
  errorMessage?: string | null;
  templatePayload?: UiFormTemplatePayload;
}) {
  if (!field.description && !errorMessage) {
    return null;
  }

  return (
    <div className="space-y-1">
      {field.description ? (
        <p
          id={resolveFieldDescriptionId(formId, field.name)}
          className={cn(
            'text-xs text-muted-foreground',
            templatePayload?.descriptionTextClassName
          )}
        >
          {field.description}
        </p>
      ) : null}
      {errorMessage ? (
        <p
          id={resolveFieldErrorId(formId, field.name)}
          aria-live="polite"
          className={cn(
            'text-xs font-medium text-destructive',
            templatePayload?.fieldErrorTextClassName
          )}
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function resolveFieldDescribedBy({
  formId,
  field,
  errorMessage
}: {
  formId: string;
  field: BuildFormFieldDefinition;
  errorMessage?: string | null;
}) {
  const ids = [
    field.description ? resolveFieldDescriptionId(formId, field.name) : null,
    errorMessage ? resolveFieldErrorId(formId, field.name) : null
  ].filter(Boolean);

  return ids.length > 0 ? ids.join(' ') : undefined;
}

function nextRepeaterRowId() {
  return `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function createEmptyRepeaterRow(field: BuildFormRepeaterFieldDefinition): BuildFormRepeaterRow {
  const row: BuildFormRepeaterRow = { id: nextRepeaterRowId() };
  if (field.emptyRow) {
    Object.assign(row, field.emptyRow);
  }
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
  templatePayload
}: {
  field: BuildFormRepeaterFieldDefinition;
  definition: BuildFormDefinition;
  templatePayload?: UiFormTemplatePayload;
}) {
  const initialRows = React.useMemo(() => {
    const rows = definition.repeaterRows?.[field.name];
    if (rows && rows.length > 0) {
      return rows;
    }
    return [createEmptyRepeaterRow(field)];
  }, []);

  const [rows, setRows] = React.useState<BuildFormRepeaterRow[]>(initialRows);
  const minRows = field.minRows ?? 1;

  function addRow() {
    setRows((prev) => [...prev, createEmptyRepeaterRow(field)]);
  }

  function removeRow(id: string) {
    setRows((prev) => {
      const targetRow = prev.find((row) => row.id === id);
      if (!targetRow || targetRow.removable === false || prev.length <= minRows) {
        return prev;
      }

      return prev.filter((row) => row.id !== id);
    });
  }

  function updateRow(id: string, name: string, value: string | boolean) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [name]: value } : r))
    );
  }

  const colSpanClassName = resolveBuildFormFieldColSpanClassName({
    span: 'full',
    columns: 4
  });

  return (
    <div className={cn('space-y-3', colSpanClassName, field.className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {field.label ? (
          <p className="text-sm font-medium text-foreground">{field.label}</p>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          {field.addLabel ?? 'Add row'}
        </Button>
      </div>
      {field.description ? (
        <p className={cn('text-xs text-muted-foreground', templatePayload?.descriptionTextClassName)}>
          {field.description}
        </p>
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
                      ? String(row[sub.disableWhen.field]) ===
                        String(sub.disableWhen.equals)
                      : false;
                  const inputName = `${sub.name}_${row.id}`;

                  if (sub.kind === 'checkbox') {
                    return (
                      <td key={sub.name} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          name={inputName}
                          checked={Boolean(subValue)}
                          onChange={(e) =>
                            updateRow(row.id, sub.name, e.target.checked)
                          }
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
                          onChange={(e) =>
                            updateRow(row.id, sub.name, e.target.value)
                          }
                          disabled={isDisabled}
                          className={cn(BASE_SELECT_CLASS_NAME, 'min-w-[120px]')}
                        >
                          {opts.map((opt) => (
                            <option
                              key={String(opt.value)}
                              value={String(opt.value)}
                              disabled={opt.disabled}
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  return (
                    <td key={sub.name} className="px-3 py-2">
                      <Input
                        type={sub.kind === 'number' ? 'number' : 'text'}
                        name={inputName}
                        value={String(subValue)}
                        placeholder={sub.placeholder}
                        maxLength={sub.maxLength}
                        min={sub.kind === 'number' ? sub.min : undefined}
                        max={sub.kind === 'number' ? sub.max : undefined}
                        step={sub.kind === 'number' ? sub.step : undefined}
                        disabled={isDisabled}
                        onChange={(e) =>
                          updateRow(row.id, sub.name, e.target.value)
                        }
                        className={cn(templatePayload?.inputClassName, 'min-w-[100px]')}
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right">
                  {row.removable === false ? null : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={rows.length <= minRows}
                      onClick={() => removeRow(row.id)}
                    >
                      {field.removeLabel ?? 'Remove'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderField({
  definition,
  field,
  formId,
  columns,
  errorMessage,
  templatePayload
}: {
  definition: BuildFormDefinition;
  field: BuildFormFieldDefinition;
  formId: string;
  columns: 1 | 2 | 3 | 4;
  errorMessage?: string | null;
  templatePayload?: UiFormTemplatePayload;
}) {
  if (field.kind === 'repeater') {
    return (
      <RepeaterField
        key={field.name}
        field={field}
        definition={definition}
        templatePayload={templatePayload}
      />
    );
  }

  const fieldId = normalizeDomIdWithFallback(
    `${formId}-${field.name}`,
    `${formId}-field`
  );
  const value = resolveBuildFormFieldValue(definition, field);
  const valueString = resolveBuildFormFieldValueString(definition, field);
  const describedBy = resolveFieldDescribedBy({
    formId,
    field,
    errorMessage
  });
  const isInvalid = Boolean(errorMessage);
  const colSpanClassName = resolveBuildFormFieldColSpanClassName({
    span: field.colSpan,
    columns
  });

  if (field.kind === 'hidden') {
    return (
      <input
        key={field.name}
        type="hidden"
        name={field.name}
        value={valueString}
      />
    );
  }

  const wrapperClassName = cn(
    'space-y-2',
    templatePayload?.fieldClassName,
    field.className,
    colSpanClassName
  );

  if (field.kind === 'checkbox') {
    const checkedValue = field.checkedValue ?? 'true';

    return (
      <div key={field.name} className={wrapperClassName}>
        {field.uncheckedValue !== undefined ? (
          <input
            type="hidden"
            name={field.name}
            value={field.uncheckedValue}
          />
        ) : null}
        <label
          htmlFor={fieldId}
          className={cn(
            BASE_CHECKBOX_WRAPPER_CLASS_NAME,
            isInvalid && 'border-destructive',
            templatePayload?.checkboxWrapperClassName,
            field.inputClassName
          )}
        >
          <input
            id={fieldId}
            type="checkbox"
            name={field.name}
            value={checkedValue}
            defaultChecked={resolveBuildFormCheckboxChecked(definition, field)}
            disabled={field.disabled}
            readOnly={field.readOnly}
            aria-invalid={isInvalid || undefined}
            aria-describedby={describedBy}
            className={BASE_CHECKBOX_CLASS_NAME}
          />
          <span className="space-y-1">
            {field.label ? (
              <span
                className={cn(
                  'block text-sm font-medium',
                  templatePayload?.labelClassName
                )}
              >
                {field.label}
              </span>
            ) : null}
          </span>
        </label>
        <FieldFeedback
          field={field}
          formId={formId}
          errorMessage={errorMessage}
          templatePayload={templatePayload}
        />
      </div>
    );
  }

  const label = field.label ? (
    <Label
      htmlFor={fieldId}
      className={cn(templatePayload?.labelClassName)}
    >
      {field.label}
    </Label>
  ) : null;

  if (field.kind === 'textarea') {
    return (
      <div key={field.name} className={wrapperClassName}>
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
          defaultValue={valueString}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            const nextValue = applyMaskIfNeeded({
              field,
              value: event.currentTarget.value
            });
            if (nextValue !== event.currentTarget.value) {
              event.currentTarget.value = nextValue;
            }
          }}
          className={cn(
            BASE_TEXTAREA_CLASS_NAME,
            templatePayload?.textareaClassName,
            field.inputClassName
          )}
        />
        <FieldFeedback
          field={field}
          formId={formId}
          errorMessage={errorMessage}
          templatePayload={templatePayload}
        />
      </div>
    );
  }

  if (field.kind === 'select') {
    const resolvedOptions =
      field.optionsKey
        ? (definition.dynamicOptions?.[field.optionsKey] ?? [])
        : (field.options ?? []);

    return (
      <div key={field.name} className={wrapperClassName}>
        {label}
        <select
          id={fieldId}
          name={field.name}
          required={field.required}
          disabled={field.disabled}
          defaultValue={value !== undefined ? valueString : ''}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            BASE_SELECT_CLASS_NAME,
            templatePayload?.selectClassName,
            field.inputClassName
          )}
        >
          {field.placeholder ? (
            <option value="">{field.placeholder}</option>
          ) : null}
          {resolvedOptions.map((option) => (
            <option
              key={`${field.name}-${option.value}`}
              value={toBuildFormValueString(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <FieldFeedback
          field={field}
          formId={formId}
          errorMessage={errorMessage}
          templatePayload={templatePayload}
        />
      </div>
    );
  }

  const inputType = field.kind === 'number' ? 'number' : field.kind;

  return (
    <div key={field.name} className={wrapperClassName}>
      {label}
      <Input
        id={fieldId}
        type={inputType}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
        disabled={field.disabled}
        readOnly={field.readOnly}
        autoComplete={field.autoComplete}
        inputMode={resolveBuildFormInputMode(field)}
        minLength={field.minLength}
        maxLength={field.maxLength}
        min={field.kind === 'number' ? field.min : undefined}
        max={field.kind === 'number' ? field.max : undefined}
        step={field.kind === 'number' ? field.step : undefined}
        defaultValue={valueString}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const nextValue = applyMaskIfNeeded({
            field,
            value: event.currentTarget.value
          });
          if (nextValue !== event.currentTarget.value) {
            event.currentTarget.value = nextValue;
          }
        }}
        className={cn(templatePayload?.inputClassName, field.inputClassName)}
      />
      <FieldFeedback
        field={field}
        formId={formId}
        errorMessage={errorMessage}
        templatePayload={templatePayload}
      />
    </div>
  );
}

function resolveTrackedFormControl(target: EventTarget | null) {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    const fieldName = target.name.trim();

    if (!fieldName || !target.form) {
      return null;
    }

    return {
      fieldName,
      form: target.form
    };
  }

  return null;
}

export function BuildForm({
  definition,
  area = 'global',
  themeId = null,
  slot,
  className,
  templateId,
  templateSource,
  templateComponentId = 'ui.form',
  templatePayload
}: BuildFormProps) {
  const internalFormId = React.useId().replace(/:/g, '');
  const fallbackFormId = `build-form-${internalFormId}`;
  const resolvedFormId = normalizeDomIdWithFallback(
    definition.id ?? fallbackFormId,
    fallbackFormId
  );
  const sections = resolveBuildFormSections(definition);
  const submit = definition.submit;
  const validation = getBuildFormValidation(definition);
  const localValidationMode = resolveBuildFormLocalValidationMode(definition);
  const preflightValidationEnabled = shouldRunBuildFormPreflight(definition);
  const preflightValidationTriggers = validation?.preflight?.validateOn ?? [];
  const preflightValidationOnBlur =
    preflightValidationEnabled && preflightValidationTriggers.includes('blur');
  const preflightValidationOnChange =
    preflightValidationEnabled && preflightValidationTriggers.includes('change');
  const preflightValidationDebounceMs =
    resolveBuildFormValidationDebounceMs(definition);
  const preflightFormId =
    validation?.preflight?.formId ?? definition.id ?? resolvedFormId;
  const preflightTimersRef = React.useRef<Map<string, number>>(new Map());
  const preflightAbortControllersRef = React.useRef<Map<string, AbortController>>(
    new Map()
  );
  const preflightRequestIdsRef = React.useRef<Map<string, number>>(new Map());
  const shouldHydrateServerValidation =
    Boolean(validation) && typeof definition.request?.action === 'function';
  const [serverValidationResult, serverValidationAction] = React.useActionState<
    BuildFormValidationResult<BuildFormValues> | null,
    FormData
  >(
    shouldHydrateServerValidation
      ? (definition.request?.action as BuildFormRequestActionFunction as (
          previousState: BuildFormValidationResult<BuildFormValues> | null,
          formData: FormData
        ) =>
          | Promise<BuildFormValidationResult<BuildFormValues>>
          | BuildFormValidationResult<BuildFormValues>)
      : buildFormNoopStateAction,
    null
  );
  const [validationState, setValidationState] = React.useState(() =>
    createBuildFormValidationUiState()
  );
  const debugMetadataAttrs = getTemplateDebugMetadataAttributes({
    componentId: templateComponentId,
    templateId,
    templateSource
  });

  React.useEffect(() => {
    for (const timeout of preflightTimersRef.current.values()) {
      clearTimeout(timeout);
    }
    preflightTimersRef.current.clear();

    for (const controller of preflightAbortControllersRef.current.values()) {
      controller.abort();
    }
    preflightAbortControllersRef.current.clear();
    preflightRequestIdsRef.current.clear();

    setValidationState(createBuildFormValidationUiState());
  }, [definition]);

  React.useEffect(() => {
    if (!serverValidationResult) {
      return;
    }

    setValidationState(createBuildFormValidationUiState(serverValidationResult));
  }, [serverValidationResult]);

  function validateField(form: HTMLFormElement, fieldName: string) {
    const result = runBuildFormLocalValidation(definition, new FormData(form), {
      field: fieldName
    });

    setValidationState((current) =>
      mergeBuildFormFieldValidationResult(current, result, fieldName)
    );

    return result;
  }

  function clearScheduledPreflight(fieldName: string) {
    const currentTimeout = preflightTimersRef.current.get(fieldName);
    if (currentTimeout) {
      clearTimeout(currentTimeout);
      preflightTimersRef.current.delete(fieldName);
    }
  }

  function abortInflightPreflight(fieldName: string) {
    const currentController =
      preflightAbortControllersRef.current.get(fieldName);
    if (currentController) {
      currentController.abort();
      preflightAbortControllersRef.current.delete(fieldName);
    }
  }

  function scheduleFieldPreflightValidation({
    form,
    fieldName,
    debounceMs
  }: {
    form: HTMLFormElement;
    fieldName: string;
    debounceMs: number;
  }) {
    if (!preflightValidationEnabled || !preflightFormId) {
      return;
    }

    if (!fieldUsesBuildFormPreflightValidation(definition, fieldName)) {
      return;
    }

    const normalizedValues = normalizeBuildFormValuesFromFormData(
      definition,
      new FormData(form)
    );
    const currentRequestId =
      (preflightRequestIdsRef.current.get(fieldName) ?? 0) + 1;
    preflightRequestIdsRef.current.set(fieldName, currentRequestId);

    clearScheduledPreflight(fieldName);

    const execute = async () => {
      abortInflightPreflight(fieldName);

      const controller = new AbortController();
      preflightAbortControllersRef.current.set(fieldName, controller);

      try {
        const response = await fetch('/api/forms/validate', {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            formId: preflightFormId,
            area,
            field: fieldName,
            values: normalizedValues
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as BuildFormValidationResult<BuildFormValues>;
        if (
          preflightRequestIdsRef.current.get(fieldName) !== currentRequestId
        ) {
          return;
        }

        setValidationState((current) =>
          mergeBuildFormFieldValidationResult(current, result, fieldName)
        );
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== 'AbortError') {
          // Ignore transient preflight failures and keep the last known local state.
        }
      } finally {
        const activeController =
          preflightAbortControllersRef.current.get(fieldName);
        if (activeController === controller) {
          preflightAbortControllersRef.current.delete(fieldName);
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

  function handleFieldBlur(event: React.FocusEvent<HTMLFormElement>) {
    const control = resolveTrackedFormControl(event.target);
    if (!control) {
      return;
    }

    const localResult = localValidationMode.validateOnBlur
      ? validateField(control.form, control.fieldName)
      : null;

    if (preflightValidationOnBlur && (localResult?.valid ?? true)) {
      scheduleFieldPreflightValidation({
        form: control.form,
        fieldName: control.fieldName,
        debounceMs: 0
      });
    }
  }

  function handleFieldChange(event: React.FormEvent<HTMLFormElement>) {
    const control = resolveTrackedFormControl(event.target);
    if (!control) {
      return;
    }

    const localResult = localValidationMode.validateOnChange
      ? validateField(control.form, control.fieldName)
      : null;

    if (preflightValidationOnChange && (localResult?.valid ?? true)) {
      scheduleFieldPreflightValidation({
        form: control.form,
        fieldName: control.fieldName,
        debounceMs: preflightValidationDebounceMs
      });
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    for (const fieldName of preflightTimersRef.current.keys()) {
      clearScheduledPreflight(fieldName);
    }

    if (!localValidationMode.validateOnSubmit) {
      return;
    }

    const result = runBuildFormLocalValidation(
      definition,
      new FormData(event.currentTarget)
    );

    setValidationState(createBuildFormValidationUiState(result));

    if (!result.valid) {
      event.preventDefault();
    }
  }

  return (
    <form
      id={resolvedFormId}
      action={
        (
          shouldHydrateServerValidation
            ? serverValidationAction
            : definition.request?.action
        ) as React.FormHTMLAttributes<HTMLFormElement>['action']
      }
      method={definition.request?.method}
      encType={definition.request?.encType}
      onBlur={
        localValidationMode.validateOnBlur || preflightValidationOnBlur
          ? handleFieldBlur
          : undefined
      }
      onChange={
        localValidationMode.validateOnChange || preflightValidationOnChange
          ? handleFieldChange
          : undefined
      }
      onSubmit={localValidationMode.validateOnSubmit ? handleSubmit : undefined}
      className={cn(
        'space-y-6',
        templatePayload?.formClassName,
        className
      )}
      {...debugMetadataAttrs}
    >
      {definition.title || definition.description ? (
        <div
          className={cn(
            'space-y-1',
            templatePayload?.headerClassName
          )}
        >
          {definition.title ? (
            <h3
              className={cn(
                'text-lg font-semibold text-foreground',
                templatePayload?.titleClassName
              )}
            >
              {definition.title}
            </h3>
          ) : null}
          {definition.description ? (
            <p
              className={cn(
                'text-sm text-muted-foreground',
                templatePayload?.descriptionClassName
              )}
            >
              {definition.description}
            </p>
          ) : null}
        </div>
      ) : null}

      {validationState.formError ? (
        <div
          role="alert"
          aria-live="polite"
          className={cn(
            'rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive',
            templatePayload?.formErrorClassName
          )}
        >
          {validationState.formError}
        </div>
      ) : null}

      {sections.map((section) => (
        <section
          key={section.id}
          className={cn('space-y-4', templatePayload?.sectionClassName)}
        >
          {section.title || section.description ? (
            <div
              className={cn(
                'space-y-1',
                templatePayload?.sectionHeaderClassName
              )}
            >
              {section.title ? (
                <h4
                  className={cn(
                    'text-base font-semibold text-foreground',
                    templatePayload?.sectionTitleClassName
                  )}
                >
                  {section.title}
                </h4>
              ) : null}
              {section.description ? (
                <p
                  className={cn(
                    'text-sm text-muted-foreground',
                    templatePayload?.sectionDescriptionClassName
                  )}
                >
                  {section.description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div
            className={cn(
              resolveBuildFormGridClassName({
                columns: section.columns,
                gap: definition.layout?.gap
              }),
              templatePayload?.gridClassName
            )}
          >
            {section.fields.map((field) =>
              renderField({
                definition,
                field,
                formId: resolvedFormId,
                columns: section.columns,
                errorMessage: resolveBuildFormFirstFieldError(
                  validationState,
                  field.name
                ),
                templatePayload
              })
            )}
          </div>
        </section>
      ))}

      {submit ? (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2',
            resolveActionsAlignClassName(submit.align),
            templatePayload?.actionsClassName
          )}
        >
          {Array.isArray(submit.secondaryActions)
            ? submit.secondaryActions.map((action, index) =>
                action.href ? (
                  <Button
                    key={`${action.label}-${index}`}
                    asChild
                    variant={action.variant ?? 'outline'}
                    size={action.size ?? submit.size ?? 'sm'}
                  >
                    <Link href={action.href}>{action.label}</Link>
                  </Button>
                ) : (
                  <Button
                    key={`${action.label}-${index}`}
                    type={action.type ?? 'button'}
                    variant={action.variant ?? 'outline'}
                    size={action.size ?? submit.size ?? 'sm'}
                  >
                    {action.label}
                  </Button>
                )
              )
            : null}

          {submit.confirm ? (
            <>
              <BuildModal
                definition={{
                  kind: 'confirm',
                  title: submit.confirm.title,
                  description: submit.confirm.description,
                  triggerLabel: submit.idleLabel,
                  triggerVariant:
                    submit.confirm.triggerVariant ?? submit.variant ?? 'outline',
                  triggerSize: submit.size ?? 'sm',
                  confirmLabel: submit.confirm.confirmLabel,
                  cancelLabel: submit.confirm.cancelLabel,
                  confirmVariant:
                    submit.confirm.confirmVariant ?? 'destructive',
                  formId: resolvedFormId
                }}
                area={area}
                themeId={themeId}
                slot={slot ? `${slot}.submit.confirm` : 'build-form.submit.confirm'}
                className={submit.className}
              />
              <noscript>
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({
                      variant:
                        submit.confirm.confirmVariant ??
                        submit.variant ??
                        'destructive',
                      size: submit.size
                    }),
                    submit.className
                  )}
                >
                  {submit.confirm.confirmLabel ?? submit.idleLabel}
                </button>
              </noscript>
            </>
          ) : (
            <ThemedAsyncSubmitButton
              idleLabel={submit.idleLabel}
              pendingLabel={submit.pendingLabel}
              successLabel={submit.successLabel}
              variant={submit.variant}
              size={submit.size}
              className={submit.className}
              themeId={themeId}
              area={area}
              slot={slot ? `${slot}.submit` : 'build-form.submit'}
            />
          )}
        </div>
      ) : null}
    </form>
  );
}
