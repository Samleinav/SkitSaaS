export declare const DEFAULT_EMAIL_REGEX: RegExp;
export type BuildFormValidationMessageValue = string | number | boolean | null | undefined;
export type BuildFormValidationMessageValues = Record<string, BuildFormValidationMessageValue>;
export type BuildFormValidationMessageDescriptor = {
    key: string;
    fallback: string;
    values?: BuildFormValidationMessageValues;
};
export type BuildFormValidationMessageInput = string | BuildFormValidationMessageDescriptor;
export type BuildFormValidationMessageResolver = (descriptor: BuildFormValidationMessageDescriptor) => string | null | undefined;
export type BuildFormValidationMessageCatalog = Record<string, string>;
export type OptionalPositiveIntParseResult = {
    value: number | null;
    valid: boolean;
};
export declare function createBuildFormValidationMessage(key: string, fallback: string, values?: BuildFormValidationMessageValues): BuildFormValidationMessageDescriptor;
export declare function formatBuildFormValidationMessage(template: string, values?: BuildFormValidationMessageValues): string;
export declare function resolveBuildFormValidationMessage(input: BuildFormValidationMessageInput, resolver?: BuildFormValidationMessageResolver): string;
export declare function createCatalogBuildFormValidationMessageResolver(catalog: BuildFormValidationMessageCatalog): BuildFormValidationMessageResolver;
export declare function normalizeEmail(value: unknown): string;
export declare function parseOptionalPositiveInt(value: unknown): OptionalPositiveIntParseResult;
export declare const buildFormValidationMessage: {
    readonly required: (label?: string) => BuildFormValidationMessageDescriptor;
    readonly invalidEmail: (label?: string) => BuildFormValidationMessageDescriptor;
    readonly minLength: (label?: string, min?: number) => BuildFormValidationMessageDescriptor;
    readonly invalidSelection: (label?: string) => BuildFormValidationMessageDescriptor;
    readonly recordNotFound: (label?: string) => BuildFormValidationMessageDescriptor;
    readonly alreadyExists: (label?: string) => BuildFormValidationMessageDescriptor;
    readonly positiveInteger: (label?: string) => BuildFormValidationMessageDescriptor;
};
