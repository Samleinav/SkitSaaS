import type { InputHTMLAttributes } from 'react';
import type {
  BuildFormColumns,
  BuildFormCheckboxFieldDefinition,
  BuildFormDefinition,
  BuildFormFieldColSpan,
  BuildFormFieldDefinition,
  BuildFormSectionDefinition,
  BuildFormValue
} from '@skitsaas/sdk';
import {
  isBuildFormTruthyValue,
  normalizeBuildFormColumns,
  normalizeBuildFormGap,
  resolveBuildFormValue,
  toBuildFormValueString
} from '@skitsaas/sdk';

export type ResolvedBuildFormSection = BuildFormSectionDefinition & {
  id: string;
  columns: BuildFormColumns;
};

export function resolveBuildFormSections(
  definition: BuildFormDefinition
): ResolvedBuildFormSection[] {
  const fallbackColumns = normalizeBuildFormColumns(
    definition.layout?.columns,
    1
  );

  if (Array.isArray(definition.sections) && definition.sections.length > 0) {
    return definition.sections.map((section, index) => ({
      ...section,
      id: section.id ?? `section-${index + 1}`,
      columns: normalizeBuildFormColumns(section.columns, fallbackColumns)
    }));
  }

  if (!Array.isArray(definition.fields) || definition.fields.length === 0) {
    return [];
  }

  return [
    {
      id: definition.id ?? 'section-1',
      columns: fallbackColumns,
      fields: definition.fields
    }
  ];
}

export function resolveBuildFormGapClassName(value: unknown) {
  const gap = normalizeBuildFormGap(value, 'md');

  if (gap === 'sm') {
    return 'gap-3';
  }

  if (gap === 'lg') {
    return 'gap-6';
  }

  return 'gap-4';
}

export function resolveBuildFormGridClassName({
  columns,
  gap
}: {
  columns: unknown;
  gap: unknown;
}) {
  const normalizedColumns = normalizeBuildFormColumns(columns, 1);
  const gapClassName = resolveBuildFormGapClassName(gap);

  if (normalizedColumns === 1) {
    return `grid grid-cols-1 ${gapClassName}`;
  }

  if (normalizedColumns === 2) {
    return `grid grid-cols-1 ${gapClassName} md:grid-cols-2`;
  }

  if (normalizedColumns === 3) {
    return `grid grid-cols-1 ${gapClassName} md:grid-cols-2 xl:grid-cols-3`;
  }

  return `grid grid-cols-1 ${gapClassName} md:grid-cols-2 xl:grid-cols-4`;
}

export function resolveBuildFormFieldColSpanClassName({
  span,
  columns
}: {
  span: BuildFormFieldColSpan | undefined;
  columns: BuildFormColumns;
}) {
  if (!span || columns === 1 || span === 1) {
    return undefined;
  }

  if (columns === 2) {
    return span === 'full' || span >= 2 ? 'md:col-span-2' : undefined;
  }

  if (columns === 3) {
    if (span === 'full' || span >= 3) {
      return 'md:col-span-2 xl:col-span-3';
    }

    return span === 2 ? 'md:col-span-2 xl:col-span-2' : undefined;
  }

  if (span === 'full' || span >= 4) {
    return 'md:col-span-2 xl:col-span-4';
  }

  if (span === 3) {
    return 'md:col-span-2 xl:col-span-3';
  }

  return span === 2 ? 'md:col-span-2 xl:col-span-2' : undefined;
}

export function resolveBuildFormFieldValue(
  definition: BuildFormDefinition,
  field: BuildFormFieldDefinition
): BuildFormValue | undefined {
  return resolveBuildFormValue({
    definition,
    fieldName: field.name,
    fallback: field.defaultValue
  });
}

export function resolveBuildFormFieldValueString(
  definition: BuildFormDefinition,
  field: BuildFormFieldDefinition
) {
  return toBuildFormValueString(resolveBuildFormFieldValue(definition, field));
}

export function resolveBuildFormCheckboxChecked(
  definition: BuildFormDefinition,
  field: BuildFormFieldDefinition
) {
  return isBuildFormTruthyValue(resolveBuildFormFieldValue(definition, field));
}

function buildFormFieldSupportsInputMode(
  field: BuildFormFieldDefinition
): field is Exclude<BuildFormFieldDefinition, BuildFormCheckboxFieldDefinition> {
  return field.kind !== 'checkbox';
}

export function resolveBuildFormInputMode(
  field: BuildFormFieldDefinition
): InputHTMLAttributes<HTMLInputElement>['inputMode'] | undefined {
  if (buildFormFieldSupportsInputMode(field) && field.inputMode) {
    return field.inputMode;
  }

  if (field.kind === 'number') {
    return field.step === 'any' ? 'decimal' : 'numeric';
  }

  if (!buildFormFieldSupportsInputMode(field) || !field.mask) {
    return undefined;
  }

  if (field.mask === 'decimal' || field.mask === 'currency') {
    return 'decimal';
  }

  if (field.mask === 'digits' || field.mask === 'phone') {
    return 'numeric';
  }

  return undefined;
}
