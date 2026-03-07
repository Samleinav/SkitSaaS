import type { BuildFormDefinition, BuildFormFieldDefinition, BuildFormValue, BuildFormValues } from './forms.js';
import { type BuildFormValidationMessageInput, type BuildFormValidationMessageResolver } from './validation-messages.js';
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
export type BuildFormValidationCondition = {
    kind: 'field_truthy';
    field: string;
} | {
    kind: 'field_falsy';
    field: string;
} | {
    kind: 'field_equals';
    field: string;
    value: BuildFormValue;
} | {
    kind: 'field_not_equals';
    field: string;
    value: BuildFormValue;
} | {
    kind: 'field_in';
    field: string;
    values: BuildFormValue[];
} | {
    kind: 'field_not_in';
    field: string;
    values: BuildFormValue[];
};
export type BuildFormDbCondition = {
    field: string;
    operator: 'eq' | 'ne';
    value: BuildFormValue | BuildFormFieldRef;
} | {
    field: string;
    operator: 'in' | 'not_in';
    values: Array<BuildFormValue | BuildFormFieldRef>;
} | {
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
export type BuildFormValidationRule = BuildFormRequiredRule | BuildFormEmailRule | BuildFormUrlRule | BuildFormMinLengthRule | BuildFormMaxLengthRule | BuildFormMinRule | BuildFormMaxRule | BuildFormRegexRule | BuildFormIntegerRule | BuildFormAcceptedRule | BuildFormConfirmedRule | BuildFormUniqueRule | BuildFormExistsRule;
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
export type ValidatedBuildFormDefinition<TDefinition extends BuildFormDefinition = BuildFormDefinition> = TDefinition & {
    validation: BuildFormValidationDefinition;
};
export type BuildFormValidationIssue = {
    field: string | null;
    code: string;
    message: string;
    rule: BuildFormValidationRule['type'] | string;
    source: BuildFormValidationRuntime;
};
export type BuildFormValidationResult<TValues extends BuildFormValues = BuildFormValues> = {
    valid: boolean;
    values: TValues;
    fieldErrors: Record<string, string[]>;
    formError: string | null;
    issues: BuildFormValidationIssue[];
};
type BuildFormValidationRuleOptions = Omit<BaseBuildFormValidationRule, 'type'>;
type BuildFormRegexRuleOptions = BuildFormValidationRuleOptions & {
    flags?: string;
};
type BuildFormDbRuleOptions = BuildFormValidationRuleOptions & {
    where?: BuildFormDbCondition[];
};
type BuildFormUniqueRuleOptions = BuildFormDbRuleOptions & {
    ignore?: BuildFormValue | BuildFormFieldRef;
};
type BuildFormValidationInput = FormData | BuildFormValues | Record<string, unknown>;
export type BuildFormBlurValidationPresetOptions = {
    validateOn?: BuildFormValidationTrigger[];
    preflight?: boolean | Omit<NonNullable<BuildFormValidationDefinition['preflight']>, 'enabled'>;
};
export declare function defineValidatedBuildForm<TDefinition extends BuildFormDefinition>(definition: TDefinition & {
    validation: BuildFormValidationDefinition;
}): TDefinition & {
    validation: BuildFormValidationDefinition;
};
export declare function withBuildFormValidation<TDefinition extends BuildFormDefinition>(definition: TDefinition, validation: BuildFormValidationDefinition): TDefinition & {
    validation: BuildFormValidationDefinition;
};
export declare function fieldRef(field: string): BuildFormFieldRef;
export declare function dbRef(target: string): BuildFormDbRef;
export declare const validationCondition: {
    truthy(field: string): BuildFormValidationCondition;
    falsy(field: string): BuildFormValidationCondition;
    equals(field: string, value: BuildFormValue): BuildFormValidationCondition;
    notEquals(field: string, value: BuildFormValue): BuildFormValidationCondition;
    in(field: string, values: BuildFormValue[]): BuildFormValidationCondition;
    notIn(field: string, values: BuildFormValue[]): BuildFormValidationCondition;
};
export declare const buildFormRule: {
    required(options?: BuildFormValidationRuleOptions): BuildFormRequiredRule;
    email(options?: BuildFormValidationRuleOptions): BuildFormEmailRule;
    url(options?: BuildFormValidationRuleOptions): BuildFormUrlRule;
    minLength(value: number, options?: BuildFormValidationRuleOptions): BuildFormMinLengthRule;
    maxLength(value: number, options?: BuildFormValidationRuleOptions): BuildFormMaxLengthRule;
    min(value: number, options?: BuildFormValidationRuleOptions): BuildFormMinRule;
    max(value: number, options?: BuildFormValidationRuleOptions): BuildFormMaxRule;
    regex(pattern: string, options?: BuildFormRegexRuleOptions): BuildFormRegexRule;
    integer(options?: BuildFormValidationRuleOptions): BuildFormIntegerRule;
    accepted(options?: BuildFormValidationRuleOptions): BuildFormAcceptedRule;
    confirmed(field: string, options?: BuildFormValidationRuleOptions): BuildFormConfirmedRule;
    unique(target: BuildFormDbRef, options?: BuildFormUniqueRuleOptions): BuildFormUniqueRule;
    exists(target: BuildFormDbRef, options?: BuildFormDbRuleOptions): BuildFormExistsRule;
};
export declare const buildFormValidationPreset: {
    blur(fields: NonNullable<BuildFormValidationDefinition["fields"]>, options?: BuildFormBlurValidationPresetOptions): BuildFormValidationDefinition;
};
export declare function listBuildFormFields(definition: BuildFormDefinition): BuildFormFieldDefinition[];
export declare function getBuildFormFieldByName(definition: BuildFormDefinition, fieldName: string): BuildFormFieldDefinition | null;
export declare function getBuildFormValidation(definition: BuildFormDefinition): BuildFormValidationDefinition | null;
export declare function getBuildFormValidationRulesForField(definition: BuildFormDefinition, fieldName: string): BuildFormValidationRule[];
export declare function normalizeBuildFormValuesFromInput(definition: BuildFormDefinition, input: BuildFormValidationInput): BuildFormValues;
export declare function normalizeBuildFormValuesFromFormData(definition: BuildFormDefinition, formData: FormData): BuildFormValues;
export declare function createBuildFormValidationResult<TValues extends BuildFormValues = BuildFormValues>({ values, issues, formError }: {
    values: TValues;
    issues?: BuildFormValidationIssue[];
    formError?: string | null;
}): BuildFormValidationResult<TValues>;
export declare function createBuildFormValidationIssue({ field, code, message, rule, source }: {
    field?: string | null;
    code: string;
    message: string;
    rule: BuildFormValidationRule['type'] | string;
    source: BuildFormValidationRuntime;
}): BuildFormValidationIssue;
export declare function createBuildFormValidationResultFromFieldErrors<TValues extends BuildFormValues = BuildFormValues>({ values, fieldErrors, formError, source, code, rule }: {
    values: TValues;
    fieldErrors?: Record<string, string[]>;
    formError?: string | null;
    source: BuildFormValidationRuntime;
    code?: string;
    rule?: BuildFormValidationRule['type'] | string;
}): BuildFormValidationResult<TValues>;
export declare function createBuildFormValidationResultFromFieldMessages<TValues extends BuildFormValues = BuildFormValues>({ values, fieldMessages, formMessage, resolveMessage, source, rule }: {
    values: TValues;
    fieldMessages?: Record<string, BuildFormValidationMessageInput | BuildFormValidationMessageInput[]>;
    formMessage?: BuildFormValidationMessageInput | null;
    resolveMessage?: BuildFormValidationMessageResolver;
    source: BuildFormValidationRuntime;
    rule?: BuildFormValidationRule['type'] | string;
}): BuildFormValidationResult<TValues>;
export declare function isBuildFormValidationRuntimeEnabled(rule: BuildFormValidationRule, runtime: BuildFormValidationRuntime): boolean;
export declare function matchesBuildFormValidationConditions(conditions: BuildFormValidationCondition[] | undefined, values: BuildFormValues): boolean;
export declare function getBuildFormValidationRulesForFieldRuntime(definition: BuildFormDefinition, fieldName: string, runtime: BuildFormValidationRuntime, values: BuildFormValues): BuildFormValidationRule[];
export declare function validateBuildFormLocally(definition: BuildFormDefinition, input: BuildFormValidationInput, options?: {
    field?: string;
    runtime?: 'local' | 'preflight';
}): BuildFormValidationResult<BuildFormValues>;
export declare function isBuildFormValidationResultValid(result: Pick<BuildFormValidationResult, 'valid'>): boolean;
export declare function shouldRunBuildFormPreflight(definition: BuildFormDefinition): boolean;
export declare function resolveBuildFormValidationTriggers(definition: BuildFormDefinition, runtime: 'client' | 'preflight'): BuildFormValidationTrigger[];
export declare function resolveBuildFormValidationDebounceMs(definition: BuildFormDefinition): number;
export {};
