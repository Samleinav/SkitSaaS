import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  assertSqlClient,
  computeMigrationChecksum,
  discoverModuleMigrationTargets,
  isMigrationChecksumCompatible,
  parseSqlStatements,
  runModulesMigrate
} from '../../scripts/modules-migrate';

test('parseSqlStatements splits by drizzle statement breakpoints', () => {
  const sql = `
    CREATE TABLE one (id integer);
    --> statement-breakpoint
    CREATE TABLE two (id integer);
  `;

  const statements = parseSqlStatements(sql);
  assert.equal(statements.length, 2);
  assert.match(statements[0] ?? '', /CREATE TABLE one/i);
  assert.match(statements[1] ?? '', /CREATE TABLE two/i);
});

test('discoverModuleMigrationTargets resolves db migration dirs from module.json', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-migrate-test-'));
  const modulesDir = path.join(rootDir, 'modules');
  const moduleDir = path.join(modulesDir, 'mod.alpha');
  const migrationsDir = path.join(moduleDir, 'db', 'migrations');
  try {
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.writeFileSync(
      path.join(moduleDir, 'module.json'),
      JSON.stringify(
        {
          moduleId: 'mod.alpha',
          db: {
            schemaVersion: 2,
            migrationsDir: 'db/migrations'
          }
        },
        null,
        2
      ),
      'utf8'
    );
    fs.writeFileSync(
      path.join(migrationsDir, '0002_beta.sql'),
      'select 2;',
      'utf8'
    );
    fs.writeFileSync(
      path.join(migrationsDir, '0001_alpha.sql'),
      'select 1;',
      'utf8'
    );

    const warnings: string[] = [];
    const targets = discoverModuleMigrationTargets({
      rootDir,
      modulesDir,
      warnings
    });

    assert.equal(warnings.length, 0);
    assert.equal(targets.length, 1);
    assert.equal(targets[0]?.moduleId, 'mod.alpha');
    assert.equal(targets[0]?.schemaVersion, 2);
    assert.equal(
      targets[0]?.migrationsDirRelative,
      'modules/mod.alpha/db/migrations'
    );
    assert.deepEqual(targets[0]?.migrationFiles, [
      '0001_alpha.sql',
      '0002_beta.sql'
    ]);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test('discoverModuleMigrationTargets orders modules by db.dependsOn', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-migrate-order-'));
  const modulesDir = path.join(rootDir, 'modules');
  const moduleAlphaDir = path.join(modulesDir, 'mod.alpha');
  const moduleBetaDir = path.join(modulesDir, 'mod.beta');
  const moduleGammaDir = path.join(modulesDir, 'mod.gamma');
  const moduleAlphaMigrationsDir = path.join(moduleAlphaDir, 'db', 'migrations');
  const moduleBetaMigrationsDir = path.join(moduleBetaDir, 'db', 'migrations');
  const moduleGammaMigrationsDir = path.join(moduleGammaDir, 'db', 'migrations');

  try {
    fs.mkdirSync(moduleAlphaMigrationsDir, { recursive: true });
    fs.mkdirSync(moduleBetaMigrationsDir, { recursive: true });
    fs.mkdirSync(moduleGammaMigrationsDir, { recursive: true });

    fs.writeFileSync(
      path.join(moduleAlphaDir, 'module.json'),
      JSON.stringify({
        moduleId: 'mod.alpha',
        db: {
          schemaVersion: 1,
          migrationsDir: 'db/migrations'
        }
      }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(moduleBetaDir, 'module.json'),
      JSON.stringify({
        moduleId: 'mod.beta',
        db: {
          schemaVersion: 1,
          migrationsDir: 'db/migrations',
          dependsOn: ['mod.gamma']
        }
      }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(moduleGammaDir, 'module.json'),
      JSON.stringify({
        moduleId: 'mod.gamma',
        db: {
          schemaVersion: 1,
          migrationsDir: 'db/migrations',
          dependsOn: ['mod.alpha']
        }
      }),
      'utf8'
    );

    fs.writeFileSync(path.join(moduleAlphaMigrationsDir, '0001_init.sql'), 'select 1;', 'utf8');
    fs.writeFileSync(path.join(moduleBetaMigrationsDir, '0001_init.sql'), 'select 1;', 'utf8');
    fs.writeFileSync(path.join(moduleGammaMigrationsDir, '0001_init.sql'), 'select 1;', 'utf8');

    const warnings: string[] = [];
    const targets = discoverModuleMigrationTargets({
      rootDir,
      modulesDir,
      warnings
    });

    assert.equal(warnings.length, 0);
    assert.deepEqual(
      targets.map((target) => target.moduleId),
      ['mod.alpha', 'mod.gamma', 'mod.beta']
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test('runModulesMigrate applies and skips module migrations with a callable sql client', async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-migrate-run-'));
  const modulesDir = path.join(rootDir, 'modules');
  const moduleDir = path.join(modulesDir, 'mod.alpha');
  const migrationsDir = path.join(moduleDir, 'db', 'migrations');
  const executedStatements: string[] = [];
  const ledger = new Map<
    string,
    {
      checksum: string;
      moduleSchemaVersion: number;
    }
  >();

  try {
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.writeFileSync(
      path.join(moduleDir, 'module.json'),
      JSON.stringify({
        moduleId: 'mod.alpha',
        db: {
          schemaVersion: 3,
          migrationsDir: 'db/migrations'
        }
      }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(migrationsDir, '0001_init.sql'),
      `
        CREATE TABLE mod_alpha_items (id integer);
        --> statement-breakpoint
        ALTER TABLE mod_alpha_items ADD COLUMN title text;
      `,
      'utf8'
    );

    const sqlClient = createFakeSqlClient({
      ledger,
      executedStatements
    });

    const firstRun = await runModulesMigrate({
      rootDir,
      sqlClient,
      logWarnings: false
    });
    const secondRun = await runModulesMigrate({
      rootDir,
      sqlClient,
      logWarnings: false
    });

    assert.equal(firstRun.totalModules, 1);
    assert.equal(firstRun.totalMigrations, 1);
    assert.equal(firstRun.applied, 1);
    assert.equal(firstRun.skipped, 0);
    assert.equal(secondRun.applied, 0);
    assert.equal(secondRun.skipped, 1);
    assert.deepEqual([...ledger.keys()], ['mod.alpha:0001_init.sql']);
    assert.equal(
      ledger.get('mod.alpha:0001_init.sql')?.moduleSchemaVersion,
      3
    );
    assert.ok(
      executedStatements.some((statement) =>
        statement.includes('CREATE TABLE mod_alpha_items (id integer);')
      )
    );
    assert.ok(
      executedStatements.some((statement) =>
        statement.includes('ALTER TABLE mod_alpha_items ADD COLUMN title text;')
      )
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test('assertSqlClient rejects non-callable clients even if they expose sql methods', () => {
  type NonCallableSqlClient = {
    unsafe: () => Promise<unknown[]>;
    begin: <T>(callback: (tx: NonCallableSqlClient) => Promise<T>) => Promise<T>;
    end: () => Promise<void>;
  };

  const nonCallableSqlClient: NonCallableSqlClient = {
    unsafe: async () => [],
    begin: async <T>(callback: (tx: NonCallableSqlClient) => Promise<T>) =>
      callback(nonCallableSqlClient),
    end: async () => {}
  };

  assert.throws(
    () => assertSqlClient(nonCallableSqlClient, 'test sql client'),
    /Expected test sql client to be a callable postgres client/
  );
});

test('computeMigrationChecksum is stable across LF and CRLF line endings', () => {
  const lf = 'CREATE TABLE one (id integer);\nCREATE TABLE two (id integer);\n';
  const crlf = lf.replace(/\n/g, '\r\n');

  assert.equal(computeMigrationChecksum(lf), computeMigrationChecksum(crlf));
});

test('isMigrationChecksumCompatible accepts historical LF/CRLF checksums', () => {
  const lf = 'CREATE TABLE one (id integer);\nCREATE TABLE two (id integer);\n';
  const crlf = lf.replace(/\n/g, '\r\n');
  const lfChecksum = computeMigrationChecksum(lf);
  const crlfLegacyChecksum = createSha256(crlf);

  assert.equal(isMigrationChecksumCompatible(lfChecksum, crlf), true);
  assert.equal(isMigrationChecksumCompatible(crlfLegacyChecksum, lf), true);
});

test('isMigrationChecksumCompatible rejects checksums from different contents', () => {
  const sql = 'CREATE TABLE one (id integer);\n';
  const differentSql = 'CREATE TABLE two (id integer);\n';
  const checksumFromDifferentSql = computeMigrationChecksum(differentSql);

  assert.equal(isMigrationChecksumCompatible(checksumFromDifferentSql, sql), false);
});

function createSha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function createFakeSqlClient({
  ledger,
  executedStatements
}: {
  ledger: Map<
    string,
    {
      checksum: string;
      moduleSchemaVersion: number;
    }
  >;
  executedStatements: string[];
}) {
  type FakeSqlClient = {
    unsafe: (query: string) => Promise<unknown>;
    begin: <T>(
      callback: (tx: FakeSqlClient) => Promise<T>
    ) => Promise<T>;
    <T extends object = object>(
      strings: TemplateStringsArray,
      ...params: unknown[]
    ): Promise<T[]>;
    end: () => Promise<void>;
  };

  const sql = (async <T extends object = object>(
    strings: TemplateStringsArray,
    ...params: unknown[]
  ) => {
    const statement = normalizeSql(strings.join(' '));

    if (statement.includes('SELECT checksum FROM app_module_migrations')) {
      const [moduleId, migrationName] = params as [string, string];
      const row = ledger.get(`${moduleId}:${migrationName}`);
      return row ? ([{ checksum: row.checksum }] as T[]) : [];
    }

    throw new Error(`Unexpected query: ${statement}`);
  }) as FakeSqlClient;

  sql.unsafe = async (query: string) => {
    executedStatements.push(normalizeSql(query));
    return [];
  };

  sql.begin = async <T>(callback: (tx: FakeSqlClient) => Promise<T>) => {
    const tx = (async <U extends object = object>(
      strings: TemplateStringsArray,
      ...params: unknown[]
    ) => {
      const statement = normalizeSql(strings.join(' '));

      if (statement.includes('INSERT INTO app_module_migrations')) {
        const [moduleId, migrationName, checksum, moduleSchemaVersion] = params as [
          string,
          string,
          string,
          number
        ];
        ledger.set(`${moduleId}:${migrationName}`, {
          checksum,
          moduleSchemaVersion
        });
        return [] as U[];
      }

      throw new Error(`Unexpected transaction query: ${statement}`);
    }) as FakeSqlClient;

    tx.unsafe = async (query: string) => {
      executedStatements.push(normalizeSql(query));
      return [];
    };
    tx.begin = async () => {
      throw new Error('Nested transactions are not supported in this test.');
    };
    tx.end = async () => {};

    return callback(tx);
  };

  sql.end = async () => {};

  return sql;
}

function normalizeSql(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}
