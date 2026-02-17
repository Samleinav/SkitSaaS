import type { ModuleTemplatePackEntry } from '../modules/manifest.js';

export type DataTableTemplateSlot =
  | 'table'
  | 'toolbar'
  | 'row-actions'
  | 'create-form'
  | 'edit-form'
  | 'delete-action';

export type DataTableTemplateContract = Record<DataTableTemplateSlot, string>;

export type DataTableTemplateEntryFactoryOptions = {
  payloadBySlot?: Partial<Record<DataTableTemplateSlot, Record<string, unknown>>>;
  descriptionBySlot?: Partial<Record<DataTableTemplateSlot, string>>;
  lockTemplateBySlot?: Partial<Record<DataTableTemplateSlot, boolean>>;
};

function normalizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function assertNonEmptySegment(value: string, label: string) {
  if (!value) {
    throw new Error(
      `[sdk-datatable] ${label} is required to build template component ids.`
    );
  }
}

function buildComponentId({
  moduleId,
  resource,
  slot
}: {
  moduleId: string;
  resource: string;
  slot: DataTableTemplateSlot;
}) {
  const normalizedModuleId = normalizeSegment(moduleId);
  const normalizedResource = normalizeSegment(resource);
  const normalizedSlot = normalizeSegment(slot);
  assertNonEmptySegment(normalizedModuleId, 'moduleId');
  assertNonEmptySegment(normalizedResource, 'resource');
  assertNonEmptySegment(normalizedSlot, 'slot');

  return `${normalizedModuleId}.datatable.${normalizedResource}.${normalizedSlot}`;
}

export function createDataTableTemplateContract({
  moduleId,
  resource
}: {
  moduleId: string;
  resource: string;
}): DataTableTemplateContract {
  return {
    table: buildComponentId({
      moduleId,
      resource,
      slot: 'table'
    }),
    toolbar: buildComponentId({
      moduleId,
      resource,
      slot: 'toolbar'
    }),
    'row-actions': buildComponentId({
      moduleId,
      resource,
      slot: 'row-actions'
    }),
    'create-form': buildComponentId({
      moduleId,
      resource,
      slot: 'create-form'
    }),
    'edit-form': buildComponentId({
      moduleId,
      resource,
      slot: 'edit-form'
    }),
    'delete-action': buildComponentId({
      moduleId,
      resource,
      slot: 'delete-action'
    })
  };
}

export function createDataTableTemplateEntries(
  contract: DataTableTemplateContract,
  options: DataTableTemplateEntryFactoryOptions = {}
): ModuleTemplatePackEntry[] {
  const slots = Object.keys(contract) as DataTableTemplateSlot[];
  return slots.map((slot) => {
    const componentId = contract[slot];
    const description =
      options.descriptionBySlot?.[slot] ??
      `Datatable template slot "${slot}"`;
    const payload = options.payloadBySlot?.[slot];
    const lockTemplate = options.lockTemplateBySlot?.[slot] === true;

    return {
      componentId,
      description,
      ...(payload ? { payload } : {}),
      ...(lockTemplate ? { lockTemplate: true } : {})
    };
  });
}
