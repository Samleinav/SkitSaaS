import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const TRANSPILE_EXTENSIONS = new Set([
    '.ts',
    '.tsx',
    '.mts',
    '.cts',
    '.jsx'
]);
const COPY_EXTENSIONS = new Set([
    '.js',
    '.mjs',
    '.cjs',
    '.json',
    '.css'
]);
const JS_RUNTIME_EXTENSIONS = ['.js', '.mjs', '.cjs'];
const TSC_COMPILER_OPTIONS = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: false,
    sourceMap: false,
    declaration: false,
    importHelpers: false,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false
};
function resolveModulePath(moduleDir, value) {
    return path.isAbsolute(value) ? value : path.join(moduleDir, value);
}
function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
function replaceWithJsExtension(filePath) {
    return filePath.replace(/\.(ts|tsx|mts|cts|jsx)$/i, '.js');
}
function formatDiagnostics(moduleId, diagnostics) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => '\n'
    });
    return `[${moduleId}] TypeScript transpile failed:\n${formatted}`;
}
function transpileSourceFile({ moduleId, sourcePath, targetPath }) {
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    const transpileResult = ts.transpileModule(sourceText, {
        fileName: sourcePath,
        compilerOptions: TSC_COMPILER_OPTIONS,
        reportDiagnostics: true
    });
    const diagnostics = (transpileResult.diagnostics ?? []).filter((entry) => entry.category === ts.DiagnosticCategory.Error);
    if (diagnostics.length > 0) {
        throw new Error(formatDiagnostics(moduleId, diagnostics));
    }
    ensureDir(targetPath);
    fs.writeFileSync(targetPath, transpileResult.outputText, 'utf8');
}
function walkDirectory(dir, visit) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const sourcePath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDirectory(sourcePath, visit);
            continue;
        }
        if (entry.isFile()) {
            visit(sourcePath);
        }
    }
}
function resolveRelativeSpecifierForDistFile(filePath, specifier) {
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
        return specifier;
    }
    const ext = path.extname(specifier).toLowerCase();
    if (ext === '.ts' || ext === '.tsx' || ext === '.mts' || ext === '.cts' || ext === '.jsx') {
        return `${specifier.slice(0, -ext.length)}.js`;
    }
    if (ext) {
        return specifier;
    }
    const absoluteWithoutExt = path.resolve(path.dirname(filePath), specifier);
    for (const runtimeExtension of JS_RUNTIME_EXTENSIONS) {
        if (fs.existsSync(`${absoluteWithoutExt}${runtimeExtension}`)) {
            return `${specifier}${runtimeExtension}`;
        }
    }
    for (const runtimeExtension of JS_RUNTIME_EXTENSIONS) {
        if (fs.existsSync(path.join(absoluteWithoutExt, `index${runtimeExtension}`))) {
            return `${specifier.replace(/\/+$/, '')}/index${runtimeExtension}`;
        }
    }
    return specifier;
}
function rewriteRelativeImportsForDistFile(filePath) {
    const original = fs.readFileSync(filePath, 'utf8');
    let rewritten = original.replace(/(\bfrom\s+)(['"])(\.{1,2}\/[^'"]+)\2/g, (_match, prefix, quote, specifier) => {
        const nextSpecifier = resolveRelativeSpecifierForDistFile(filePath, specifier);
        return `${prefix}${quote}${nextSpecifier}${quote}`;
    });
    rewritten = rewritten.replace(/(\bimport\s+)(['"])(\.{1,2}\/[^'"]+)\2/g, (_match, prefix, quote, specifier) => {
        const nextSpecifier = resolveRelativeSpecifierForDistFile(filePath, specifier);
        return `${prefix}${quote}${nextSpecifier}${quote}`;
    });
    rewritten = rewritten.replace(/(\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2(\s*\))/g, (_match, prefix, quote, specifier, suffix) => {
        const nextSpecifier = resolveRelativeSpecifierForDistFile(filePath, specifier);
        return `${prefix}${quote}${nextSpecifier}${quote}${suffix}`;
    });
    if (rewritten !== original) {
        fs.writeFileSync(filePath, rewritten, 'utf8');
    }
}
function rewriteRelativeImportsForDist(distDir) {
    if (!fs.existsSync(distDir)) {
        return;
    }
    walkDirectory(distDir, (sourcePath) => {
        const extension = path.extname(sourcePath).toLowerCase();
        if (!JS_RUNTIME_EXTENSIONS.includes(extension)) {
            return;
        }
        rewriteRelativeImportsForDistFile(sourcePath);
    });
}
export function buildSourcePackageModule(options) {
    const moduleId = options.moduleId.trim();
    if (!moduleId) {
        throw new Error('[sdk.build] moduleId is required.');
    }
    const moduleDir = path.resolve(options.moduleDir ?? process.cwd());
    const srcDir = resolveModulePath(moduleDir, options.srcDir ?? 'src');
    const distDir = resolveModulePath(moduleDir, options.distDir ?? 'dist');
    const manifestFile = options.manifestFile?.trim() || 'manifest.js';
    if (!fs.existsSync(srcDir)) {
        throw new Error(`[${moduleId}] src directory is missing at "${srcDir}".`);
    }
    fs.rmSync(distDir, { recursive: true, force: true });
    let transpiledFileCount = 0;
    let copiedFileCount = 0;
    walkDirectory(srcDir, (sourcePath) => {
        const relative = path.relative(srcDir, sourcePath);
        const ext = path.extname(relative).toLowerCase();
        if (TRANSPILE_EXTENSIONS.has(ext)) {
            const outputRelative = replaceWithJsExtension(relative);
            const targetPath = path.join(distDir, outputRelative);
            transpileSourceFile({
                moduleId,
                sourcePath,
                targetPath
            });
            transpiledFileCount += 1;
            return;
        }
        if (!COPY_EXTENSIONS.has(ext)) {
            return;
        }
        const targetPath = path.join(distDir, relative);
        ensureDir(targetPath);
        fs.copyFileSync(sourcePath, targetPath);
        copiedFileCount += 1;
    });
    rewriteRelativeImportsForDist(distDir);
    const manifestPath = path.join(distDir, manifestFile);
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`[${moduleId}] build did not produce ${path.relative(moduleDir, manifestPath)}.`);
    }
    console.log(`[${moduleId}] build complete:`, path.relative(moduleDir, manifestPath));
    return {
        moduleId,
        srcDir,
        distDir,
        manifestPath,
        transpiledFileCount,
        copiedFileCount
    };
}
