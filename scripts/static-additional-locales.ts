import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const LOCALE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANGUAGE_PACK_SCOPES = [
  'host-global',
  'host-admin',
  'host-dashboard',
  'host-login',
  'shared-flat',
  'module-flat'
] as const;
type LanguagePackScope = (typeof LANGUAGE_PACK_SCOPES)[number];
const LANGUAGE_PACK_SCOPE_SET = new Set<LanguagePackScope>(LANGUAGE_PACK_SCOPES);

type TopLevelDeclarations = Map<string, ts.Expression>;

export type StaticAdditionalLocalesResult = {
  locales: string[];
  warnings: string[];
};

export type StaticModuleLanguagePack = {
  scopes: string[];
};

export type StaticModuleLanguagePackResult = {
  languagePack: StaticModuleLanguagePack | null;
  warnings: string[];
  errors: string[];
  hasField: boolean;
};

export function normalizeAdditionalLocale(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/_/g, '-').toLowerCase();
  if (!normalized || !LOCALE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

function readScriptKind(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.ts':
      return ts.ScriptKind.TS;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.mjs':
    case '.js':
    case '.cjs':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.Unknown;
  }
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;

  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }

    if (ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) {
      current = current.expression;
      continue;
    }

    if (ts.isSatisfiesExpression(current)) {
      current = current.expression;
      continue;
    }

    return current;
  }
}

function collectTopLevelDeclarations(sourceFile: ts.SourceFile): TopLevelDeclarations {
  const declarations: TopLevelDeclarations = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
        continue;
      }

      declarations.set(declaration.name.text, declaration.initializer);
    }
  }

  return declarations;
}

function resolveExpressionToObjectLiteral(
  expression: ts.Expression,
  declarations: TopLevelDeclarations,
  seenIdentifiers = new Set<string>()
): ts.ObjectLiteralExpression | null {
  const unwrapped = unwrapExpression(expression);

  if (ts.isObjectLiteralExpression(unwrapped)) {
    return unwrapped;
  }

  if (ts.isCallExpression(unwrapped) && unwrapped.arguments.length > 0) {
    const firstArgument = unwrapped.arguments[0];
    if (ts.isExpression(firstArgument)) {
      return resolveExpressionToObjectLiteral(
        firstArgument,
        declarations,
        seenIdentifiers
      );
    }
  }

  if (ts.isIdentifier(unwrapped)) {
    if (seenIdentifiers.has(unwrapped.text)) {
      return null;
    }

    const initializer = declarations.get(unwrapped.text);
    if (!initializer) {
      return null;
    }

    const nextSeen = new Set(seenIdentifiers);
    nextSeen.add(unwrapped.text);

    return resolveExpressionToObjectLiteral(initializer, declarations, nextSeen);
  }

  return null;
}

function normalizeLanguagePackScope(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (
    !normalized ||
    !LANGUAGE_PACK_SCOPE_SET.has(normalized as LanguagePackScope)
  ) {
    return null;
  }

  return normalized;
}

function findPropertyValueExpression(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string
) {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property) || property.name === undefined) {
      continue;
    }

    const name = ts.isIdentifier(property.name)
      ? property.name.text
      : ts.isStringLiteral(property.name)
        ? property.name.text
        : null;

    if (name !== propertyName) {
      continue;
    }

    return unwrapExpression(property.initializer);
  }

  return null;
}

export function extractStaticAdditionalLocalesFromFile(
  filePath: string,
  owner = filePath
): StaticAdditionalLocalesResult {
  if (!fs.existsSync(filePath)) {
    return {
      locales: [],
      warnings: []
    };
  }

  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    readScriptKind(filePath)
  );
  const declarations = collectTopLevelDeclarations(sourceFile);
  const exportAssignment = sourceFile.statements.find(
    (statement): statement is ts.ExportAssignment =>
      ts.isExportAssignment(statement) && !statement.isExportEquals
  );

  if (!exportAssignment) {
    return {
      locales: [],
      warnings: []
    };
  }

  const exportedObject = resolveExpressionToObjectLiteral(
    exportAssignment.expression,
    declarations
  );
  if (!exportedObject) {
    return {
      locales: [],
      warnings: []
    };
  }

  const additionalLocalesExpression = findPropertyValueExpression(
    exportedObject,
    'additionalLocales'
  );
  if (!additionalLocalesExpression) {
    return {
      locales: [],
      warnings: []
    };
  }

  if (!ts.isArrayLiteralExpression(additionalLocalesExpression)) {
    return {
      locales: [],
      warnings: [
        `${owner} declares additionalLocales with a non-static value; ignoring it for build metadata.`
      ]
    };
  }

  const warnings: string[] = [];
  const locales: string[] = [];
  const seen = new Set<string>();

  for (const element of additionalLocalesExpression.elements) {
    const entry = unwrapExpression(element as ts.Expression);
    const rawLocale =
      ts.isStringLiteral(entry) || ts.isNoSubstitutionTemplateLiteral(entry)
        ? entry.text
        : null;

    if (rawLocale === null) {
      warnings.push(
        `${owner} declares a non-literal entry inside additionalLocales; ignoring it for build metadata.`
      );
      continue;
    }

    const normalizedLocale = normalizeAdditionalLocale(rawLocale);
    if (!normalizedLocale) {
      warnings.push(
        `${owner} declares invalid locale ${JSON.stringify(rawLocale)} in additionalLocales.`
      );
      continue;
    }

    if (seen.has(normalizedLocale)) {
      continue;
    }

    seen.add(normalizedLocale);
    locales.push(normalizedLocale);
  }

  locales.sort((left, right) => left.localeCompare(right));

  return {
    locales,
    warnings
  };
}

export function extractStaticModuleLanguagePackFromFile(
  filePath: string,
  owner = filePath
): StaticModuleLanguagePackResult {
  if (!fs.existsSync(filePath)) {
    return {
      languagePack: null,
      warnings: [],
      errors: [],
      hasField: false
    };
  }

  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    readScriptKind(filePath)
  );
  const declarations = collectTopLevelDeclarations(sourceFile);
  const exportAssignment = sourceFile.statements.find(
    (statement): statement is ts.ExportAssignment =>
      ts.isExportAssignment(statement) && !statement.isExportEquals
  );

  if (!exportAssignment) {
    return {
      languagePack: null,
      warnings: [],
      errors: [],
      hasField: false
    };
  }

  const exportedObject = resolveExpressionToObjectLiteral(
    exportAssignment.expression,
    declarations
  );
  if (!exportedObject) {
    return {
      languagePack: null,
      warnings: [],
      errors: [],
      hasField: false
    };
  }

  const languagePackExpression = findPropertyValueExpression(
    exportedObject,
    'languagePack'
  );
  if (!languagePackExpression) {
    return {
      languagePack: null,
      warnings: [],
      errors: [],
      hasField: false
    };
  }

  const languagePackObject = resolveExpressionToObjectLiteral(
    languagePackExpression,
    declarations
  );
  if (!languagePackObject) {
    return {
      languagePack: null,
      warnings: [],
      errors: [
        `${owner} declares languagePack with a non-static value; modules:prepare requires an object literal.`
      ],
      hasField: true
    };
  }

  const scopesExpression = findPropertyValueExpression(languagePackObject, 'scopes');
  if (!scopesExpression) {
    return {
      languagePack: null,
      warnings: [],
      errors: [
        `${owner} declares languagePack without scopes; modules:prepare requires a static scopes array.`
      ],
      hasField: true
    };
  }

  if (!ts.isArrayLiteralExpression(scopesExpression)) {
    return {
      languagePack: null,
      warnings: [],
      errors: [
        `${owner} declares languagePack.scopes with a non-static value; modules:prepare requires a literal array.`
      ],
      hasField: true
    };
  }

  const errors: string[] = [];
  const scopes: string[] = [];
  const seen = new Set<string>();

  for (const element of scopesExpression.elements) {
    const entry = unwrapExpression(element as ts.Expression);
    const rawScope =
      ts.isStringLiteral(entry) || ts.isNoSubstitutionTemplateLiteral(entry)
        ? entry.text
        : null;

    if (rawScope === null) {
      errors.push(
        `${owner} declares a non-literal entry inside languagePack.scopes.`
      );
      continue;
    }

    const normalizedScope = normalizeLanguagePackScope(rawScope);
    if (!normalizedScope || rawScope.trim() !== normalizedScope) {
      errors.push(
        `${owner} declares invalid languagePack scope ${JSON.stringify(rawScope)}.`
      );
      continue;
    }

    if (seen.has(normalizedScope)) {
      errors.push(
        `${owner} declares duplicate languagePack scope ${JSON.stringify(
          normalizedScope
        )}.`
      );
      continue;
    }

    seen.add(normalizedScope);
    scopes.push(normalizedScope);
  }

  if (scopes.length === 0) {
    errors.push(
      `${owner} declares languagePack without any valid scopes.`
    );
  }

  return {
    languagePack: errors.length > 0 ? null : { scopes },
    warnings: [],
    errors,
    hasField: true
  };
}
