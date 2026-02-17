export type SourcePackageBuildOptions = {
    moduleId: string;
    moduleDir?: string;
    srcDir?: string;
    distDir?: string;
    manifestFile?: string;
};
export type SourcePackageBuildResult = {
    moduleId: string;
    srcDir: string;
    distDir: string;
    manifestPath: string;
    transpiledFileCount: number;
    copiedFileCount: number;
};
export declare function buildSourcePackageModule(options: SourcePackageBuildOptions): SourcePackageBuildResult;
