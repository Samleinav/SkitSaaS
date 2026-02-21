import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type TaskName = 'canary' | 'smoke' | 'module';

type TaskResult = {
  name: TaskName;
  command: string;
  exitCode: number;
  outputFile: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

const DEFAULT_TASKS: TaskName[] = ['canary', 'smoke', 'module'];
const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSY_VALUES = new Set(['0', 'false', 'no', 'off']);

function readBoolean(value: string | undefined, defaultValue: boolean) {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) {
    return true;
  }
  if (FALSY_VALUES.has(normalized)) {
    return false;
  }

  return defaultValue;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTasks() {
  const raw = process.env.EVIDENCE_TASKS?.trim();
  if (!raw) {
    return DEFAULT_TASKS;
  }

  const normalized = raw.toLowerCase();
  if (normalized === 'all') {
    return DEFAULT_TASKS;
  }

  const tasks = new Set<TaskName>();
  for (const part of normalized.split(',')) {
    const token = part.trim();
    if (token === 'canary' || token === 'smoke' || token === 'module') {
      tasks.add(token);
    }
  }

  return tasks.size > 0 ? Array.from(tasks) : DEFAULT_TASKS;
}

function writePlaceholder(filePath: string, reason: string) {
  const payload = {
    status: 'skipped',
    reason,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function runTask({
  name,
  command,
  args,
  envOverrides,
  outputFile,
  dryRun,
}: {
  name: TaskName;
  command: string;
  args: string[];
  envOverrides?: Record<string, string>;
  outputFile: string;
  dryRun: boolean;
}): TaskResult {
  const startedAt = new Date();

  if (dryRun) {
    writePlaceholder(outputFile, 'dry_run');
    return {
      name,
      command: [command, ...args].join(' '),
      exitCode: 0,
      outputFile,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 0,
    };
  }

  const result = spawnSync(command, args, {
    env: {
      ...process.env,
      ...(envOverrides ?? {}),
    },
    encoding: 'utf8',
  });

  const finishedAt = new Date();
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';

  if (stdout.trim()) {
    writeFileSync(outputFile, stdout, 'utf8');
  } else if (stderr.trim()) {
    writeFileSync(
      outputFile,
      JSON.stringify(
        {
          status: 'error',
          stderr,
        },
        null,
        2
      ),
      'utf8'
    );
  } else {
    writePlaceholder(outputFile, 'no_output');
  }

  if (result.error) {
    writeFileSync(
      outputFile,
      JSON.stringify(
        {
          status: 'error',
          message: result.error.message,
        },
        null,
        2
      ),
      'utf8'
    );
  }

  return {
    name,
    command: [command, ...args].join(' '),
    exitCode: result.status ?? 1,
    outputFile,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  };
}

function writeNotesTemplate(filePath: string) {
  const content = [
    '# Canary Evidence Notes',
    '',
    '- Environment:',
    '- Release/Commit:',
    '- Operator:',
    '- Issues found:',
    '- Follow-up actions:',
    '',
  ].join('\n');
  writeFileSync(filePath, content, 'utf8');
}

async function run() {
  const tasks = parseTasks();
  const evidenceDir = process.env.EVIDENCE_DIR?.trim() || 'docs/audit/canary-reports';
  const dateFolder = process.env.EVIDENCE_DATE?.trim() || formatDate(new Date());
  const outputDir = join(evidenceDir, dateFolder);
  const label =
    process.env.EVIDENCE_LABEL?.trim() ||
    process.env.CANARY_LABEL?.trim() ||
    `${process.env.EVIDENCE_ENV?.trim() || 'local'}-${dateFolder}`;
  const dryRun = readBoolean(process.env.EVIDENCE_DRY_RUN, false);

  mkdirSync(outputDir, { recursive: true });

  const results: TaskResult[] = [];

  if (tasks.includes('canary')) {
    results.push(
      runTask({
        name: 'canary',
        command: 'pnpm',
        args: ['restructure:canary'],
        envOverrides: {
          CANARY_LABEL: label,
          CANARY_OUTPUT_FILE: join(outputDir, 'canary.json'),
        },
        outputFile: join(outputDir, 'canary.json'),
        dryRun,
      })
    );
  }

  if (tasks.includes('smoke')) {
    results.push(
      runTask({
        name: 'smoke',
        command: 'pnpm',
        args: ['restructure:admin-smoke'],
        envOverrides: {
          SMOKE_BASE_URL:
            process.env.SMOKE_BASE_URL?.trim() || 'http://localhost:3000',
        },
        outputFile: join(outputDir, 'admin-smoke.json'),
        dryRun,
      })
    );
  }

  if (tasks.includes('module')) {
    results.push(
      runTask({
        name: 'module',
        command: 'pnpm',
        args: ['restructure:module-runtime'],
        outputFile: join(outputDir, 'module-runtime.json'),
        dryRun,
      })
    );
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    label,
    outputDir,
    tasks: results,
  };

  writeFileSync(
    join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  const notesPath = join(outputDir, 'notes.md');
  writeNotesTemplate(notesPath);

  const failed = results.some((result) => result.exitCode !== 0);
  if (failed) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Evidence pack failed:', error);
  process.exitCode = 1;
});
