import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  computeMigrationChecksum,
  discoverModuleMigrationTargets,
  isMigrationChecksumCompatible,
  parseSqlStatements
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
