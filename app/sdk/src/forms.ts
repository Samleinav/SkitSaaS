import type { FormHTMLAttributes } from 'react';

export type BuildFormButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

export type BuildFormButtonSize = 'default' | 'sm' | 'lg';

export type BuildFormColumns = 1 | 2 | 3 | 4;
export type BuildFormFieldColSpan = 1 | 2 | 3 | 4 | 'full';
export type BuildFormGap = 'sm' | 'md' | 'lg';

export type BuildFormHttpMethod = 'get' | 'post';

export type BuildFormFieldMask =
  | 'digits'
  | 'decimal'
  | 'currency'
  | 'phone'
  | 'slug'
  | 'upper'
  | 'lower';

export type BuildFormValue = string | number | boolean | null;
export type BuildFormValues = Record<string, BuildFormValue | undefined>;

export type BuildFormRequestActionResult = void | unknown | Promise<void | unknown>;
export type BuildFormRequestActionFunction = {
  (formData: FormData): BuildFormRequestActionResult;
  (
    previousState: unknown,
    formData: FormData
  ): BuildFormRequestActionResult;
};

export type BuildFormRequestAction =
  | string
  | BuildFormRequestActionFunction;

export type BuildFormRequest = {
  action?: BuildFormRequestAction;
  method?: BuildFormHttpMethod;
  encType?: FormHTMLAttributes<HTMLFormElement>['encType'];
};

export type BuildFormOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

type BaseBuildFormFieldDefinition = {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  inputMode?: FormHTMLAttributes<HTMLInputElement>['inputMode'];
  minLength?: number;
  maxLength?: number;
  className?: string;
  inputClassName?: string;
  colSpan?: BuildFormFieldColSpan;
  defaultValue?: BuildFormValue;
  mask?: BuildFormFieldMask;
};

export type BuildFormInputFieldKind =
  | 'hidden'
  | 'text'
  | 'email'
  | 'password'
  | 'tel'
  | 'url'
  | 'date';

export type BuildFormInputFieldDefinition = BaseBuildFormFieldDefinition & {
  kind: BuildFormInputFieldKind;
};

export type BuildFormNumberFieldDefinition = BaseBuildFormFieldDefinition & {
  kind: 'number';
  min?: number;
  max?: number;
  step?: number | 'any';
};

export type BuildFormTextareaFieldDefinition = BaseBuildFormFieldDefinition & {
  kind: 'textarea';
  rows?: number;
};

export type BuildFormSelectFieldDefinition = BaseBuildFormFieldDefinition & {
  kind: 'select';
  options?: BuildFormOption[];
  optionsKey?: string;
};

export type BuildFormCheckboxFieldDefinition = Omit<
  BaseBuildFormFieldDefinition,
  'inputMode' | 'minLength' | 'maxLength' | 'mask'
> & {
  kind: 'checkbox';
  checkedValue?: string;
  uncheckedValue?: string;
};

export type BuildFormRepeaterSubFieldKind =
  | 'text'
  | 'number'
  | 'select'
  | 'checkbox';

export type BuildFormRepeaterSubFieldDefinition = {
  name: string;
  label?: string;
  kind: BuildFormRepeaterSubFieldKind;
  options?: BuildFormOption[];
  optionsKey?: string;
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number | 'any';
  checkedValue?: string;
  disableWhen?: {
    field: string;
    equals: BuildFormValue;
  };
};

export type BuildFormRepeaterRow = {
  id: string;
  [key: string]: BuildFormValue;
};

export type BuildFormRepeaterFieldDefinition = {
  kind: 'repeater';
  name: string;
  label?: string;
  description?: string;
  colSpan?: BuildFormFieldColSpan;
  className?: string;
  subFields: BuildFormRepeaterSubFieldDefinition[];
  addLabel?: string;
  removeLabel?: string;
  minRows?: number;
  emptyRow?: Record<string, BuildFormValue>;
};

export type BuildFormFieldDefinition =
  | BuildFormInputFieldDefinition
  | BuildFormNumberFieldDefinition
  | BuildFormTextareaFieldDefinition
  | BuildFormSelectFieldDefinition
  | BuildFormCheckboxFieldDefinition
  | BuildFormRepeaterFieldDefinition;

export type BuildFormSectionDefinition = {
  id?: string;
  title?: string;
  description?: string;
  columns?: BuildFormColumns;
  fields: BuildFormFieldDefinition[];
};

export type BuildFormSecondaryAction = {
  label: string;
  href?: string;
  type?: 'button' | 'reset';
  variant?: BuildFormButtonVariant;
  size?: BuildFormButtonSize;
};

export type BuildFormConfirmDefinition = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  triggerVariant?: BuildFormButtonVariant;
  confirmVariant?: BuildFormButtonVariant;
};

export type BuildFormSubmitDefinition = {
  idleLabel: string;
  pendingLabel?: string;
  successLabel?: string;
  align?: 'start' | 'end' | 'between';
  variant?: BuildFormButtonVariant;
  size?: BuildFormButtonSize;
  className?: string;
  secondaryActions?: BuildFormSecondaryAction[];
  confirm?: BuildFormConfirmDefinition;
};

export type BuildFormLayoutDefinition = {
  columns?: BuildFormColumns;
  gap?: BuildFormGap;
};

export type BuildFormDynamicOptions = Record<string, BuildFormOption[]>;

export type BuildFormRepeaterRows = Record<string, BuildFormRepeaterRow[]>;

export type BuildFormDefinition = {
  id?: string;
  title?: string;
  description?: string;
  request?: BuildFormRequest;
  layout?: BuildFormLayoutDefinition;
  fields?: BuildFormFieldDefinition[];
  sections?: BuildFormSectionDefinition[];
  submit?: BuildFormSubmitDefinition;
  values?: BuildFormValues;
  dynamicOptions?: BuildFormDynamicOptions;
  repeaterRows?: BuildFormRepeaterRows;
};

export type BuildModalDefinition = {
  kind?: 'dialog' | 'confirm';
  title: string;
  description?: string;
  triggerLabel: string;
  triggerVariant?: BuildFormButtonVariant;
  triggerSize?: BuildFormButtonSize;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: BuildFormButtonVariant;
  formId?: string;
};

export type ComposeBuildFormDefinitionOptions<
  TDefinition extends BuildFormDefinition = BuildFormDefinition
> = {
  request?: BuildFormRequest | null;
  values?: BuildFormValues | null;
  submit?: BuildFormDefinition['submit'] | null;
  dynamicOptions?: BuildFormDynamicOptions | null;
  repeaterRows?: BuildFormRepeaterRows | null;
};

export type ComposedBuildFormDefinition<
  TDefinition extends BuildFormDefinition = BuildFormDefinition
> = TDefinition &
  Pick<BuildFormDefinition, 'request' | 'submit' | 'values'>;

export function defineBuildForm<TDefinition extends BuildFormDefinition>(
  definition: TDefinition
) {
  return definition;
}

export function defineBuildFormSection<
  TSection extends BuildFormSectionDefinition
>(section: TSection) {
  return section;
}

export function defineBuildModal<TDefinition extends BuildModalDefinition>(
  definition: TDefinition
) {
  return definition;
}

function hasOwnKey<TObject extends object>(
  value: TObject,
  key: PropertyKey
): key is keyof TObject {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export const buildFormField = {
  hidden(input: Omit<BuildFormInputFieldDefinition, 'kind'>) {
    return { kind: 'hidden', ...input } as const;
  },
  text(input: Omit<BuildFormInputFieldDefinition, 'kind'>) {
    return { kind: 'text', ...input } as const;
  },
  email(input: Omit<BuildFormInputFieldDefinition, 'kind'>) {
    return { kind: 'email', ...input } as const;
  },
  password(input: Omit<BuildFormInputFieldDefinition, 'kind'>) {
    return { kind: 'password', ...input } as const;
  },
  tel(input: Omit<BuildFormInputFieldDefinition, 'kind'>) {
    return { kind: 'tel', ...input } as const;
  },
  url(input: Omit<BuildFormInputFieldDefinition, 'kind'>) {
    return { kind: 'url', ...input } as const;
  },
  date(input: Omit<BuildFormInputFieldDefinition, 'kind'>) {
    return { kind: 'date', ...input } as const;
  },
  number(input: Omit<BuildFormNumberFieldDefinition, 'kind'>) {
    return { kind: 'number', ...input } as const;
  },
  textarea(input: Omit<BuildFormTextareaFieldDefinition, 'kind'>) {
    return { kind: 'textarea', ...input } as const;
  },
  select(input: Omit<BuildFormSelectFieldDefinition, 'kind'>) {
    return { kind: 'select', ...input } as const;
  },
  checkbox(input: Omit<BuildFormCheckboxFieldDefinition, 'kind'>) {
    return { kind: 'checkbox', ...input } as const;
  },
  repeater(input: Omit<BuildFormRepeaterFieldDefinition, 'kind'>) {
    return { kind: 'repeater', ...input } as const;
  }
};

export function withBuildFormDynamicOptions<TDefinition extends BuildFormDefinition>(
  definition: TDefinition,
  dynamicOptions: BuildFormDynamicOptions
) {
  return {
    ...definition,
    dynamicOptions: {
      ...(definition.dynamicOptions ?? {}),
      ...dynamicOptions
    }
  } as TDefinition & { dynamicOptions: BuildFormDynamicOptions };
}

export function withBuildFormRepeaterRows<TDefinition extends BuildFormDefinition>(
  definition: TDefinition,
  repeaterRows: BuildFormRepeaterRows
) {
  return {
    ...definition,
    repeaterRows: {
      ...(definition.repeaterRows ?? {}),
      ...repeaterRows
    }
  } as TDefinition & { repeaterRows: BuildFormRepeaterRows };
}

export function withBuildFormValues<TDefinition extends BuildFormDefinition>(
  definition: TDefinition,
  values: BuildFormValues
) {
  return {
    ...definition,
    values: {
      ...(definition.values ?? {}),
      ...values
    }
  } as TDefinition & { values: BuildFormValues };
}

export function withBuildFormRequest<TDefinition extends BuildFormDefinition>(
  definition: TDefinition,
  request: BuildFormRequest
) {
  return {
    ...definition,
    request: {
      ...(definition.request ?? {}),
      ...request
    }
  } as TDefinition & { request: BuildFormRequest };
}

export function composeBuildFormDefinition<
  TDefinition extends BuildFormDefinition
>(
  definition: TDefinition,
  options: ComposeBuildFormDefinitionOptions<TDefinition> = {}
): ComposedBuildFormDefinition<TDefinition> {
  let nextDefinition = definition as BuildFormDefinition;

  if (hasOwnKey(options, 'request')) {
    if (options.request) {
      nextDefinition = withBuildFormRequest(nextDefinition, options.request);
    } else {
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
    } else {
      nextDefinition = defineBuildForm({
        ...nextDefinition,
        values: undefined
      });
    }
  }

  if (hasOwnKey(options, 'dynamicOptions')) {
    if (options.dynamicOptions) {
      nextDefinition = withBuildFormDynamicOptions(nextDefinition, options.dynamicOptions);
    } else {
      nextDefinition = defineBuildForm({
        ...nextDefinition,
        dynamicOptions: undefined
      });
    }
  }

  if (hasOwnKey(options, 'repeaterRows')) {
    if (options.repeaterRows) {
      nextDefinition = withBuildFormRepeaterRows(nextDefinition, options.repeaterRows);
    } else {
      nextDefinition = defineBuildForm({
        ...nextDefinition,
        repeaterRows: undefined
      });
    }
  }

  return defineBuildForm(nextDefinition) as ComposedBuildFormDefinition<TDefinition>;
}

export function resolveBuildFormValue({
  definition,
  fieldName,
  fallback
}: {
  definition: Pick<BuildFormDefinition, 'values'>;
  fieldName: string;
  fallback?: BuildFormValue;
}) {
  const explicitValue = definition.values?.[fieldName];
  return explicitValue !== undefined ? explicitValue : fallback;
}

export function normalizeBuildFormColumns(
  value: unknown,
  fallback: BuildFormColumns = 1
): BuildFormColumns {
  if (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4
  ) {
    return value;
  }

  return fallback;
}

export function normalizeBuildFormGap(
  value: unknown,
  fallback: BuildFormGap = 'md'
): BuildFormGap {
  if (value === 'sm' || value === 'md' || value === 'lg') {
    return value;
  }

  return fallback;
}

export function toBuildFormValueString(value: BuildFormValue | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}

export function isBuildFormTruthyValue(value: BuildFormValue | undefined) {
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
  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

export function applyBuildFormFieldMask(
  value: string,
  mask: BuildFormFieldMask
) {
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

      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(
        3,
        6
      )}-${digitsOnly.slice(6)}`;
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
