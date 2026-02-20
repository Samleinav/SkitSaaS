export type ClassNameValue = string | false | null | undefined;
export declare function mergeClassNames(...values: ClassNameValue[]): string;
export declare function readString(data: Record<string, unknown> | null | undefined, key: string, fallback?: string): string;
export declare function toStringOrNull(value: unknown): string | null;
export declare function toStringOrFallback(value: unknown, fallback: string): string;
export declare function toNumberOrFallback(value: unknown, fallback: number): number;
