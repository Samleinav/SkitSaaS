import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

type ModuleJson = {
  moduleId?: string;
  db?: {
    schemaVersion?: number;
    migrationsDir?: string;
  };
};

export type ModuleMigrationTarget = {
  moduleId: string;
  schemaVersion: number;
  migrationsDirAbsolute: string;
  migrationsDirRelative: string;
  migrationFiles: string[];
};

export type ModulesMigrateOptions = {
  rootDir?: string;
  modulesDir?: string;
  onlyModuleId?: string;
  dryRun?: boolean;
  timeoutMs?: number;
  logWarnings?: boolean;
  sqlClient?: SqlClient;
};

export type ModulesMigrateResult = {
  rootDir: string;
  modulesDir: string | null;
  totalModules: number;
  totalMigrations: number;
  applied: number;
  skipped: number;
  warnings: string[];
};

type SqlClient = {
  unsafe: (query: string) => Promise<unknown>;
  begin: <T>(
    callback: (tx: {
      unsafe: (query: string) => Promise<unknown>;
      <U extends object = object>(
        strings: TemplateStringsArray,
        ...params: unknown[]
      ): Promise<U[]>;
    }) => Promise<T>
  ) => Promise<T>;
  <T extends object = object>(
    strings: TemplateStringsArray,
    ...params: unknown[]
  ): Promise<T[]>;
  end: (options?: { timeout?: number }) => Promise<void>;
};

const DEFAULT_TIMEOUT_MS = 30000;

function toPosixPath(value: string) {
  return value.replace(/\\/g, '/');
}

function resolveModulesDir(rootDir: string, override?: string | null) {
  if (override) {
    return path.isAbsolute(override) ? override : path.join(rootDir, override);
  }

  const envDir = process.env.MODULES_DIR?.trim();
  if (envDir) {
    return path.isAbsolute(envDir) ? envDir : path.join(rootDir, envDir);
  }

  const primary = path.join(rootDir, 'modules');
  if (fs.existsSync(primary)) {
    return primary;
  }

  const fallback = path.join(rootDir, 'examplemodules');
  if (fs.existsSync(fallback)) {
    return fallback;
  }

  return null;
}

function loadModuleJson(moduleDir: string): ModuleJson | null {
  const moduleJsonPath = path.join(moduleDir, 'module.json');
  if (!fs.existsSync(moduleJsonPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(moduleJsonPath, 'utf8');
    return JSON.parse(raw) as ModuleJson;
  } catch {
    return null;
  }
}

function resolveSchemaVersion(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  return 0;
}

export function discoverModuleMigrationTargets({
  rootDir,
  modulesDir,
  onlyModuleId,
  warnings
}: {
  rootDir: string;
  modulesDir: string;
  onlyModuleId?: string;
  warnings: string[];
}) {
  const targets: ModuleMigrationTarget[] = [];
  const moduleDirs = fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(modulesDir, entry.name));

  for (const moduleDir of moduleDirs) {
    const moduleJson = loadModuleJson(moduleDir);
    if (!moduleJson?.moduleId) {
      continue;
    }

    if (onlyModuleId && moduleJson.moduleId !== onlyModuleId) {
      continue;
    }

    const dbConfig = moduleJson.db;
    if (!dbConfig?.migrationsDir) {
      continue;
    }

    const migrationsDirAbsolute = path.isAbsolute(dbConfig.migrationsDir)
      ? dbConfig.migrationsDir
      : path.join(moduleDir, dbConfig.migrationsDir);

    if (!fs.existsSync(migrationsDirAbsolute)) {
      warnings.push(
        `Module ${moduleJson.moduleId} defines db.migrationsDir="${dbConfig.migrationsDir}" but path does not exist.`
      );
      continue;
    }

    const migrationFiles = fs
      .readdirSync(migrationsDirAbsolute, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    targets.push({
      moduleId: moduleJson.moduleId,
      schemaVersion: resolveSchemaVersion(dbConfig.schemaVersion),
      migrationsDirAbsolute,
      migrationsDirRelative: toPosixPath(
        path.relative(rootDir, migrationsDirAbsolute)
      ),
      migrationFiles
    });
  }

  return targets.sort((a, b) => a.moduleId.localeCompare(b.moduleId));
}

export function parseSqlStatements(fileContents: string) {
  return fileContents
    .split(/-->\s*statement-breakpoint/gi)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function hashChecksum(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeMigrationLineEndings(value: string) {
  return value.replace(/\r\n?/g, '\n');
}

export function computeMigrationChecksum(value: string) {
  return hashChecksum(normalizeMigrationLineEndings(value));
}

export function isMigrationChecksumCompatible(
  storedChecksum: string,
  migrationContents: string
) {
  const normalized = normalizeMigrationLineEndings(migrationContents);
  const canonicalChecksum = hashChecksum(normalized);
  const rawChecksum = hashChecksum(migrationContents);
  const crlfChecksum = hashChecksum(normalized.replace(/\n/g, '\r\n'));

  return (
    storedChecksum === canonicalChecksum ||
    storedChecksum === rawChecksum ||
    storedChecksum === crlfChecksum
  );
}

function resolveTimeoutMs(options?: ModulesMigrateOptions) {
  if (options?.timeoutMs !== undefined) {
    return options.timeoutMs;
  }

  const raw = process.env.MODULES_MIGRATE_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.max(0, Math.floor(parsed));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `modules:migrate timed out after ${timeoutMs}ms while ${label}.`
        )
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }) as Promise<T>;
}

async function ensureModuleMigrationsTable(
  sql: SqlClient,
  timeoutMs: number
) {
  await withTimeout(
    sql.unsafe(`
      CREATE TABLE IF NOT EXISTS app_module_migrations (
        id SERIAL PRIMARY KEY,
        module_id VARCHAR(120) NOT NULL,
        migration_name VARCHAR(240) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        module_schema_version INTEGER NOT NULL DEFAULT 0,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        duration_ms INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        CONSTRAINT app_module_migrations_module_name_uq
          UNIQUE (module_id, migration_name)
      );
    `),
    timeoutMs,
    'creating app_module_migrations table'
  );

  await withTimeout(
    sql.unsafe(`
      CREATE INDEX IF NOT EXISTS app_module_migrations_module_applied_idx
      ON app_module_migrations (module_id, applied_at);
    `),
    timeoutMs,
    'creating app_module_migrations index'
  );
}

async function applyModuleMigration({
  sql,
  moduleId,
  schemaVersion,
  migrationName,
  migrationFileAbsolute,
  timeoutMs,
  dryRun
}: {
  sql: SqlClient;
  moduleId: string;
  schemaVersion: number;
  migrationName: string;
  migrationFileAbsolute: string;
  timeoutMs: number;
  dryRun: boolean;
}) {
  const migrationContents = fs.readFileSync(migrationFileAbsolute, 'utf8');
  const checksum = computeMigrationChecksum(migrationContents);
  const existing = await withTimeout(
    sql<{ checksum: string }>`
      SELECT checksum
      FROM app_module_migrations
      WHERE module_id = ${moduleId}
        AND migration_name = ${migrationName}
      LIMIT 1
    `,
    timeoutMs,
    `loading migration state for ${moduleId}:${migrationName}`
  );

  if (existing.length > 0) {
    const currentChecksum = existing[0]?.checksum;
    if (currentChecksum !== checksum) {
      if (
        currentChecksum &&
        isMigrationChecksumCompatible(currentChecksum, migrationContents)
      ) {
        if (!dryRun) {
          await withTimeout(
            sql`
              UPDATE app_module_migrations
              SET checksum = ${checksum}
              WHERE module_id = ${moduleId}
                AND migration_name = ${migrationName}
                AND checksum = ${currentChecksum}
            `,
            timeoutMs,
            `normalizing migration checksum for ${moduleId}:${migrationName}`
          );
        }
        return 'skipped' as const;
      }

      throw new Error(
        `Migration checksum mismatch for ${moduleId}:${migrationName}.`
      );
    }

    return 'skipped' as const;
  }

  if (dryRun) {
    return 'applied' as const;
  }

  const statements = parseSqlStatements(migrationContents);
  const start = Date.now();
  await withTimeout(
    sql.begin(async (tx) => {
      for (const statement of statements) {
        await tx.unsafe(statement);
      }

      await tx`
        INSERT INTO app_module_migrations (
          module_id,
          migration_name,
          checksum,
          module_schema_version,
          duration_ms,
          metadata
        ) VALUES (
          ${moduleId},
          ${migrationName},
          ${checksum},
          ${schemaVersion},
          ${Date.now() - start},
          ${JSON.stringify({
            source: 'modules:migrate',
            migrationFile: toPosixPath(migrationFileAbsolute)
          })}
        )
      `;
    }),
    timeoutMs,
    `applying migration ${moduleId}:${migrationName}`
  );

  return 'applied' as const;
}

async function loadSqlClient() {
  const { client } = await import('@/lib/db/drizzle');
  return client as unknown as SqlClient;
}

export async function runModulesMigrate(
  options: ModulesMigrateOptions = {}
): Promise<ModulesMigrateResult> {
  const rootDir = options.rootDir ?? process.cwd();
  const modulesDir = resolveModulesDir(rootDir, options.modulesDir ?? null);
  const warnings: string[] = [];
  if (!modulesDir || !fs.existsSync(modulesDir)) {
    return {
      rootDir,
      modulesDir,
      totalModules: 0,
      totalMigrations: 0,
      applied: 0,
      skipped: 0,
      warnings
    };
  }

  const targets = discoverModuleMigrationTargets({
    rootDir,
    modulesDir,
    onlyModuleId: options.onlyModuleId,
    warnings
  });

  if (warnings.length && options.logWarnings !== false) {
    console.warn('[modules-migrate] warnings:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  const timeoutMs = resolveTimeoutMs(options);
  const totalMigrations = targets.reduce(
    (sum, target) => sum + target.migrationFiles.length,
    0
  );

  let applied = 0;
  let skipped = 0;

  if (options.dryRun) {
    for (const target of targets) {
      applied += target.migrationFiles.length;
    }

    return {
      rootDir,
      modulesDir,
      totalModules: targets.length,
      totalMigrations,
      applied,
      skipped,
      warnings
    };
  }

  const sql = options.sqlClient ?? (await loadSqlClient());
  await ensureModuleMigrationsTable(sql, timeoutMs);

  for (const target of targets) {
    for (const migrationFile of target.migrationFiles) {
      const migrationFileAbsolute = path.join(
        target.migrationsDirAbsolute,
        migrationFile
      );
      const status = await applyModuleMigration({
        sql,
        moduleId: target.moduleId,
        schemaVersion: target.schemaVersion,
        migrationName: migrationFile,
        migrationFileAbsolute,
        timeoutMs,
        dryRun: false
      });

      if (status === 'applied') {
        applied += 1;
      } else {
        skipped += 1;
      }
    }
  }

  return {
    rootDir,
    modulesDir,
    totalModules: targets.length,
    totalMigrations,
    applied,
    skipped,
    warnings
  };
}

function parseArgs(argv: string[]) {
  let onlyModuleId: string | undefined;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg.startsWith('--module=')) {
      const value = arg.slice('--module='.length).trim();
      if (value) {
        onlyModuleId = value;
      }
    }
  }

  return { onlyModuleId, dryRun };
}

async function main() {
  const { onlyModuleId, dryRun } = parseArgs(process.argv.slice(2));
  const timeoutMs = resolveTimeoutMs();

  console.log(
    `[modules-migrate] starting dryRun=${dryRun} module=${onlyModuleId ?? 'all'} timeoutMs=${timeoutMs}`
  );

  let sqlClient: SqlClient | null = null;
  try {
    if (!dryRun) {
      sqlClient = await loadSqlClient();
    }

    const result = await runModulesMigrate({
      onlyModuleId,
      dryRun,
      timeoutMs,
      sqlClient: sqlClient ?? undefined
    });

    console.log(
      `[modules-migrate] modules=${result.totalModules} migrations=${result.totalMigrations} applied=${result.applied} skipped=${result.skipped}`
    );
  } finally {
    if (sqlClient) {
      try {
        await sqlClient.end({ timeout: 5 });
      } catch {
        // ignore shutdown errors
      }
    }
  }
}

if (process.argv[1]?.includes('modules-migrate.ts')) {
  main().catch((error) => {
    console.error('[modules-migrate] failed', error);
    process.exit(1);
  });
}
