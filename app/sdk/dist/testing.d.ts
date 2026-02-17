type UnknownRecord = Record<string, unknown>;
export type SourcePackageContractOptions = {
    moduleId?: string;
    moduleDir?: string;
    distDir?: string;
    manifestPath?: string;
    manifestFile?: string;
};
export type SourcePackageManifestContract = {
    moduleId: string;
    version: string;
    displayName: string;
    adminPage?: unknown;
    dashboardPage?: unknown;
    frontendPage?: unknown;
    apiHandler?: unknown;
    adminRouteAliases?: unknown;
    dashboardRouteAliases?: unknown;
    frontendRouteAliases?: unknown;
    frontendRouteAccess?: unknown;
    frontendSlots?: unknown;
} & UnknownRecord;
export type SourcePackageContractResult = {
    moduleDir: string;
    distDir: string;
    manifestPath: string;
    manifest: SourcePackageManifestContract;
};
export type SourcePackageCustomCheck = (context: SourcePackageContractResult) => void | Promise<void>;
type TestSuiteOptions = SourcePackageContractOptions & {
    checks?: SourcePackageCustomCheck[];
};
export declare function runSourcePackageContractChecks(options?: SourcePackageContractOptions): Promise<SourcePackageContractResult>;
export declare function runSourcePackageTestSuite(options?: TestSuiteOptions): Promise<SourcePackageContractResult>;
export {};
