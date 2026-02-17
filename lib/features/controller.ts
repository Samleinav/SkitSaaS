type RawFeatureValue = string | number | boolean | null | undefined;

export type FeatureEntry = {
  key: string;
  value: RawFeatureValue;
};

export type FeatureRecord = Record<string, RawFeatureValue>;

export type FeatureSource =
  | FeatureRecord
  | FeatureEntry[]
  | Map<string, RawFeatureValue>
  | ReadonlyMap<string, RawFeatureValue>;

export type FeatureController = {
  all: () => Readonly<Record<string, string>>;
  keys: () => string[];
  feature: (key: string, fallback?: string | null) => string | null;
  has: (key: string) => boolean;
  can: (key: string, required?: number) => boolean;
  number: (key: string, fallback?: number | null) => number | null;
  int: (key: string, fallback?: number | null) => number | null;
  bool: (key: string, fallback?: boolean) => boolean;
};

const TRUE_VALUES = new Set([
  '1',
  'true',
  'yes',
  'y',
  'on',
  'enabled',
  'allow',
  'allowed',
  'unlimited',
  '*'
]);

const FALSE_VALUES = new Set([
  '0',
  'false',
  'no',
  'n',
  'off',
  'disabled',
  'deny',
  'denied'
]);

function normalizeFeatureKey(key: string) {
  return key.trim().toLowerCase();
}

function normalizeFeatureValue(value: RawFeatureValue) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parseBooleanFeatureValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return null;
}

function parseNumberFeatureValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toEntries(source: FeatureSource = {}) {
  if (Array.isArray(source)) {
    return source.map((entry) => [entry.key, entry.value] as const);
  }

  if (source instanceof Map) {
    return Array.from(source.entries());
  }

  return Object.entries(source);
}

export function createFeatureController(source: FeatureSource = {}): FeatureController {
  const featureMap = new Map<string, string>();

  for (const [rawKey, rawValue] of toEntries(source)) {
    const key = normalizeFeatureKey(String(rawKey));
    const value = normalizeFeatureValue(rawValue);
    if (!key || value === null) {
      continue;
    }

    featureMap.set(key, value);
  }

  const getRawValue = (key: string) => featureMap.get(normalizeFeatureKey(key)) ?? null;

  const has = (key: string) => {
    const rawValue = getRawValue(key);
    if (rawValue === null) {
      return false;
    }

    const booleanValue = parseBooleanFeatureValue(rawValue);
    if (booleanValue !== null) {
      return booleanValue;
    }

    const numberValue = parseNumberFeatureValue(rawValue);
    if (numberValue !== null) {
      return numberValue > 0;
    }

    return true;
  };

  return {
    all() {
      return Object.freeze(Object.fromEntries(featureMap));
    },
    keys() {
      return Array.from(featureMap.keys());
    },
    feature(key, fallback = null) {
      return getRawValue(key) ?? fallback;
    },
    has,
    can(key, required = 1) {
      const minimum = Number.isFinite(required) ? required : 1;
      if (minimum <= 1) {
        return has(key);
      }

      const rawValue = getRawValue(key);
      if (rawValue === null) {
        return false;
      }

      const booleanValue = parseBooleanFeatureValue(rawValue);
      if (booleanValue !== null) {
        return booleanValue;
      }

      const numberValue = parseNumberFeatureValue(rawValue);
      if (numberValue !== null) {
        return numberValue >= minimum;
      }

      return false;
    },
    number(key, fallback = null) {
      const rawValue = getRawValue(key);
      if (rawValue === null) {
        return fallback;
      }

      const parsed = parseNumberFeatureValue(rawValue);
      return parsed === null ? fallback : parsed;
    },
    int(key, fallback = null) {
      const rawValue = getRawValue(key);
      if (rawValue === null) {
        return fallback;
      }

      const parsed = parseNumberFeatureValue(rawValue);
      if (parsed === null || !Number.isInteger(parsed)) {
        return fallback;
      }

      return parsed;
    },
    bool(key, fallback = false) {
      const rawValue = getRawValue(key);
      if (rawValue === null) {
        return fallback;
      }

      const parsed = parseBooleanFeatureValue(rawValue);
      return parsed === null ? fallback : parsed;
    }
  };
}
