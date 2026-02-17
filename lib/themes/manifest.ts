export const THEME_PACK_AREAS = [
  'admin',
  'dashboard',
  'frontend',
  'global'
] as const;
export const THEME_RUNTIME_CONTRACT_VERSION = '1.0.0';

export type ThemePackArea = (typeof THEME_PACK_AREAS)[number];
export type ThemePackMode = 'tokens';

export type ThemePackManifest = {
  themeId: string;
  version: string;
  areas: ThemePackArea[];
  mode: ThemePackMode;
  entryTokens: string;
  themeRange: string;
  entryTemplates?: string;
  entryAssets?: string;
  displayName?: string;
  description?: string;
  author?: string;
  tags?: string[];
};

export type ThemePackManifestValidationIssue = {
  field: string;
  message: string;
};

export type ThemePackManifestValidationResult =
  | {
      ok: true;
      manifest: ThemePackManifest;
    }
  | {
      ok: false;
      issues: ThemePackManifestValidationIssue[];
    };

const THEME_PACK_AREA_SET = new Set<string>(THEME_PACK_AREAS);
const THEME_ID_PATTERN = /^[a-z0-9]+(?:\.[a-z0-9]+)+$/;
const SEMVER_PATTERN =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateOptionalString(
  source: Record<string, unknown>,
  field: keyof Pick<
    ThemePackManifest,
    'entryTemplates' | 'entryAssets' | 'displayName' | 'description' | 'author'
  >,
  issues: ThemePackManifestValidationIssue[]
) {
  const value = source[field];
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({
      field,
      message: `${field} must be a non-empty string when provided`
    });
  }
}

export function normalizeThemePackArea(
  value: string,
  options?: { allowLegacyPublic?: boolean }
) {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'public' &&
    (options?.allowLegacyPublic ?? true)
  ) {
    return 'frontend' as const;
  }

  if (THEME_PACK_AREA_SET.has(normalized)) {
    return normalized as ThemePackArea;
  }

  return null;
}

export function validateThemePackManifest(
  input: unknown
): ThemePackManifestValidationResult {
  if (!isObject(input)) {
    return {
      ok: false,
      issues: [{ field: 'manifest', message: 'manifest must be an object' }]
    };
  }

  const issues: ThemePackManifestValidationIssue[] = [];

  const themeId = asTrimmedString(input.themeId);
  if (!themeId) {
    issues.push({ field: 'themeId', message: 'themeId is required' });
  } else if (!THEME_ID_PATTERN.test(themeId)) {
    issues.push({
      field: 'themeId',
      message:
        'themeId must use dot.case with lowercase alphanumeric segments'
    });
  }

  const version = asTrimmedString(input.version);
  if (!version) {
    issues.push({ field: 'version', message: 'version is required' });
  } else if (!SEMVER_PATTERN.test(version)) {
    issues.push({
      field: 'version',
      message: 'version must be a valid semver string'
    });
  }

  const mode = asTrimmedString(input.mode);
  if (mode !== 'tokens') {
    issues.push({
      field: 'mode',
      message: 'mode must be "tokens" for runtime contract v1'
    });
  }

  const entryTokens = asTrimmedString(input.entryTokens);
  if (!entryTokens) {
    issues.push({
      field: 'entryTokens',
      message: 'entryTokens is required'
    });
  }

  const themeRange = asTrimmedString(input.themeRange);
  if (!themeRange) {
    issues.push({
      field: 'themeRange',
      message: 'themeRange is required'
    });
  }

  let normalizedAreas: ThemePackArea[] = [];
  if (!Array.isArray(input.areas) || input.areas.length === 0) {
    issues.push({
      field: 'areas',
      message: 'areas must be a non-empty array'
    });
  } else {
    const seenAreas = new Set<ThemePackArea>();
    for (let index = 0; index < input.areas.length; index += 1) {
      const rawArea = input.areas[index];
      if (typeof rawArea !== 'string') {
        issues.push({
          field: `areas[${index}]`,
          message: 'area must be a string'
        });
        continue;
      }

      const area = normalizeThemePackArea(rawArea, {
        allowLegacyPublic: false
      });

      if (!area) {
        issues.push({
          field: `areas[${index}]`,
          message:
            'area must be one of: admin, dashboard, frontend, global'
        });
        continue;
      }

      if (seenAreas.has(area)) {
        issues.push({
          field: `areas[${index}]`,
          message: `area "${area}" is duplicated`
        });
        continue;
      }

      seenAreas.add(area);
      normalizedAreas.push(area);
    }
  }

  validateOptionalString(input, 'entryTemplates', issues);
  validateOptionalString(input, 'entryAssets', issues);
  validateOptionalString(input, 'displayName', issues);
  validateOptionalString(input, 'description', issues);
  validateOptionalString(input, 'author', issues);

  const tags = input.tags;
  if (tags !== undefined) {
    if (
      !Array.isArray(tags) ||
      tags.some((item) => typeof item !== 'string' || item.trim().length === 0)
    ) {
      issues.push({
        field: 'tags',
        message: 'tags must be an array of non-empty strings when provided'
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    manifest: {
      themeId,
      version,
      areas: normalizedAreas,
      mode: 'tokens',
      entryTokens,
      themeRange,
      entryTemplates: asTrimmedString(input.entryTemplates) || undefined,
      entryAssets: asTrimmedString(input.entryAssets) || undefined,
      displayName: asTrimmedString(input.displayName) || undefined,
      description: asTrimmedString(input.description) || undefined,
      author: asTrimmedString(input.author) || undefined,
      tags: Array.isArray(tags)
        ? tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
        : undefined
    }
  };
}
